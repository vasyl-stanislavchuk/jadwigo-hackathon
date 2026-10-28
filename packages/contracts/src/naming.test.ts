import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { EventId, ID_SCHEMAS } from "./ids.ts";
import { RECORDS } from "./records.ts";
import { ROUTES } from "./routes.ts";
import * as wire from "./wire.ts";

/**
 * The rules in RULES.md marked (tested), checked on every layer a machine can read: the tables,
 * views and columns in supabase/migrations, the record and wire schemas here, and the route table.
 */

const MIGRATIONS = new URL("../../../supabase/migrations/", import.meta.url);
const sql = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(new URL(f, MIGRATIONS), "utf8"))
  .join("\n");

/** Each table and view with its columns and their SQL types. */
function relations(): Map<string, Map<string, string>> {
  const found = new Map<string, Map<string, string>>();
  for (const m of sql.matchAll(/^create table (\w+) \(\n([\s\S]*?)\n\);/gm)) {
    const [, name = "", body = ""] = m;
    const columns = new Map<string, string>();
    for (const line of body.split("\n")) {
      const col = /^ {2}(\w+) ([a-z_]+(?: [a-z]+)?)/.exec(line);
      if (!col || /^(primary|unique|foreign|check|constraint)$/.test(col[1] ?? "")) continue;
      columns.set(
        col[1] ?? "",
        (col[2] ?? "").replace(/ (not|primary|default|references|check)$/, ""),
      );
    }
    found.set(name, columns);
  }
  for (const m of sql.matchAll(/^create view (\w+) [\s\S]*?\nselect\n([\s\S]*?)\nfrom /gm)) {
    const [, name = "", body = ""] = m;
    const columns = new Map<string, string>();
    for (const line of body.split("\n")) {
      const col = /(\w+),?$/.exec(line.trim());
      if (col?.[1]) columns.set(col[1], "view");
    }
    found.set(name, columns);
  }
  return found;
}

const RELATIONS = relations();
const TABLES = [...RELATIONS.keys()];
const BARE = TABLES.filter((t) => !t.includes("_"));

const NEVER: Record<string, string> = {
  step: "question",
  item: "question",
  task: "question",
  exercise: "question",
  hint: "help",
  hints: "help",
  right: "correct",
  ok: "correct",
  success: "correct",
  session: "attempt",
  play: "attempt",
  pass: "skip",
};

function refusedWords(name: string): string[] {
  const words = name.split(/[_-]/);
  const found = words.filter((w) => w in NEVER).map((w) => `${w} (use ${NEVER[w]})`);
  if (name.includes("attempt_no")) found.push("attempt_no (use try_no)");
  return found;
}

function unwrap(schema: z.ZodType): z.ZodType {
  let s = schema;
  while (s instanceof z.ZodNullable || s instanceof z.ZodOptional) s = s.unwrap() as z.ZodType;
  return s;
}

describe("RULES.md, names", () => {
  it("reads the migrations", () => {
    expect(TABLES.length).toBeGreaterThanOrEqual(11);
  });

  it("rule 1: a record that belongs to another is named owner first", () => {
    for (const t of TABLES.filter((n) => n.includes("_"))) {
      expect(
        BARE.some((owner) => t.startsWith(`${owner}_`)),
        t,
      ).toBe(true);
    }
  });

  it("rule 2: tables, views and columns are singular snake_case", () => {
    for (const [t, columns] of RELATIONS) {
      expect(t).toMatch(/^[a-z][a-z0-9_]*[^s]$/);
      for (const c of columns.keys()) expect(c, `${t}.${c}`).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("rule 3: one word for one thing, in tables, columns, schema fields and paths", () => {
    const names = [
      ...TABLES,
      ...[...RELATIONS.values()].flatMap((cols) => [...cols.keys()]),
      ...Object.values(RECORDS).flatMap((s) => Object.keys(s.shape)),
      ...Object.values(ROUTES).flatMap((r) => r.path.split("/")),
    ];
    for (const name of names) expect(refusedWords(name), name).toEqual([]);
  });

  it("rule 4: a foreign key is <record>_id and names a record", () => {
    for (const [t, columns] of RELATIONS) {
      for (const c of columns.keys()) {
        if (!c.endsWith("_id") || c === "event_id") continue;
        expect(TABLES, `${t}.${c}`).toContain(c.slice(0, -3));
        expect(c, `${t} names a reference to itself by the relation`).not.toBe(`${t}_id`);
      }
    }
  });

  it("rule 6: a time is <verb>_at and a duration carries its unit", () => {
    for (const [t, columns] of RELATIONS) {
      for (const [c, type] of columns) {
        if (type === "view") continue;
        // Rule 9: the Names page's `resume_at` wins, and it holds the `seq` to come back to.
        if (c.endsWith("_at") && c !== "resume_at") expect(type, `${t}.${c}`).toBe("timestamptz");
        if (type === "timestamptz") expect(c, `${t}.${c}`).toMatch(/_at$/);
        if (c.endsWith("_ms")) expect(type, `${t}.${c}`).toBe("integer");
      }
    }
  });

  it("rule 17: every record's fields are its table's columns", () => {
    for (const [t, schema] of Object.entries(RECORDS)) {
      expect(Object.keys(schema.shape).sort(), t).toEqual(
        [...(RELATIONS.get(t)?.keys() ?? [])]
          .filter((c) => !(t === "pod" && c === "pod_id"))
          .sort(),
      );
    }
  });
});

describe("RULES.md, ids", () => {
  it("rule 8: every id field uses the codec", () => {
    for (const [t, schema] of Object.entries(RECORDS)) {
      for (const [key, field] of Object.entries(schema.shape)) {
        if (key === "id") {
          expect(unwrap(field), `${t}.id`).toBe(ID_SCHEMAS[`${t}_id` as keyof typeof ID_SCHEMAS]);
        } else if (key === "event_id") {
          expect(unwrap(field), `${t}.${key}`).toBe(EventId);
        } else if (key.endsWith("_id")) {
          expect(unwrap(field), `${t}.${key}`).toBe(ID_SCHEMAS[key as keyof typeof ID_SCHEMAS]);
        }
      }
    }
  });
});

describe("RULES.md, API", () => {
  const VERBS = /^(start|finish|pause|resume|submit|create|get|update|delete|release|answer|skip)$/;

  it("rules 14 and 15: paths are plural nouns nested by ownership under /api/v1, no verbs", () => {
    for (const [name, route] of Object.entries(ROUTES)) {
      if (name === "health") {
        expect(route.path).toBe("/api/health");
        continue;
      }
      expect(route.path, name).toMatch(/^\/api\/v1\//);
      const segments = route.path.split("/").slice(3);
      segments.forEach((seg, i) => {
        if (/^\{[a-z_]+\}$/.test(seg)) return;
        expect(seg, name).toMatch(/^[a-z]+(-[a-z]+)*$/);
        expect(VERBS.test(seg), `${name}: ${seg} is a verb`).toBe(false);
        // A collection is plural; `help` is the one uncountable record, the last segment, and
        // `me` is the signed-in caller, the whole path.
        if (seg === "help") expect(i, name).toBe(segments.length - 1);
        else if (seg === "me") expect(segments, name).toEqual(["me"]);
        else expect(seg, name).toMatch(/s$/);
      });
    }
  });

  it("rule 16: GET, POST and PATCH only, and a GET has no body", () => {
    for (const route of Object.values(ROUTES)) {
      expect(["GET", "POST", "PATCH"]).toContain(route.method);
      if (route.method === "GET") expect(route.body).toBeNull();
    }
  });

  it("rule 17: a request refuses the fields the server owns", () => {
    const answer = {
      event_id: "0190f3c4-5b6a-4c8d-9e0f-112233445566",
      seq: 1,
      try_no: 1,
      latency_ms: 1000,
      asked_at: "2026-09-01T08:00:00.000Z",
      answered_at: "2026-09-01T08:00:01.000Z",
      kind: "try",
      value: { entered: "6" },
    };
    expect(wire.AttemptAnswerRequest.safeParse(answer).success).toBe(true);
    for (const owned of ["correct", "mistake_class", "help_used", "pod_id", "body_hash"]) {
      expect(wire.AttemptAnswerRequest.safeParse({ ...answer, [owned]: null }).success, owned).toBe(
        false,
      );
    }
    const { value: _value, ...fields } = answer;
    const skip = { ...fields, kind: "skip", skip_reason: "help_twin" };
    expect(wire.AttemptAnswerRequest.safeParse(skip).success, "help_twin is the server's").toBe(
      false,
    );
  });

  it("rule 20: every error type is PascalCase with a 4xx status", () => {
    for (const [type, status] of Object.entries(wire.ERROR_STATUS)) {
      expect(type).toMatch(/^[A-Z][A-Za-z]+$/);
      expect([400, 401, 404, 409, 429]).toContain(status);
    }
  });
});
