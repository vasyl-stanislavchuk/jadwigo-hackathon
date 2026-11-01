import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { QUESTION_TYPE_FAMILY } from "@jadwigo/contracts";
import { LESSON_FILES } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { check as checkInProcess, signatureOf } from "./check.ts";
import { DRAFTS_POD, featuredAssignmentId } from "./ids.ts";

const script = fileURLToPath(new URL("./check.ts", import.meta.url));
const lessons = fileURLToPath(new URL("../../testing/src/lessons/", import.meta.url));
/** The playground's spelling lessons, whose boosts check refuses (dl-e8ov.5.38.11). */
const SPELLING = ["polish-spelling-practice", "spelling-diagnostic"];

/** `bun packages/lesson-import/src/check.ts <file> --json`, as jw runs it: the exit code and the JSON. */
function check(file: string): { status: number | null; out: Record<string, unknown> } {
  const run = spawnSync("bun", [script, file, "--json"], { encoding: "utf8" });
  return { status: run.status, out: JSON.parse(run.stdout) as Record<string, unknown> };
}

type Step = Record<string, unknown> & { question?: { family?: string; help?: object } };

/** A copy of lesson file `id` with `change` applied to its question steps by id, written to a temp file. */
function plantedIn(
  id: string,
  change: (steps: Record<string, Step>) => void,
  title?: string,
): string {
  const raw = structuredClone(LESSON_FILES.find((f) => (f as { id: string }).id === id)) as {
    script: { parts: { steps: Step[] }[] };
  };
  const steps = Object.fromEntries(
    raw.script.parts.flatMap((p) => p.steps).map((s) => [s["id"] as string, s]),
  );
  change(steps);
  if (title !== undefined) Object.assign(raw, { title });
  const file = join(mkdtempSync(join(tmpdir(), "lesson-check-")), "planted.json");
  writeFileSync(file, JSON.stringify(raw));
  return file;
}

/** A copy of equal-groups with `change` applied to step s02 and `title`, written to a temp file. */
function planted(change: (step: Step) => void, title?: string): string {
  return plantedIn(
    "equal-groups",
    (steps) => {
      const step = steps["s02"];
      if (step === undefined) throw new Error("no step s02 in equal-groups");
      change(step);
    },
    title,
  );
}

type Found = {
  step_id: string | null;
  path: string;
  level: string;
  rule: string;
  text: string;
  fix: string;
};

describe("check.ts --json", () => {
  const names = readdirSync(lessons).filter((f) => f.endsWith(".json"));

  it("passes every fixture lesson file but the 2 spelling lessons, with its play path", () => {
    expect(names).toHaveLength(5);
    for (const name of names) {
      const { status, out } = check(join(lessons, name));
      const id = name.replace(/\.json$/, "");
      if (SPELLING.includes(id)) continue;
      expect({ name, status, ok: out["ok"], errors: out["errors"] }).toEqual({
        name,
        status: 0,
        ok: true,
        errors: [],
      });
      expect(out["play_path"]).toBe(`/play/${featuredAssignmentId(id, DRAFTS_POD.id)}`);
      expect(out["lesson_id"]).toMatch(/^les_/);
      expect(out["questions"]).toBeGreaterThan(0);
    }
  });

  it("fails the 2 spelling lessons on their boost cards no judge gives, and on nothing else", () => {
    // The playground writes one set of spelling cards on every step, and each step's near table
    // names one or two of them: the rest never show (dl-e8ov.5.38.11). The import still takes them.
    for (const id of SPELLING) {
      const { status, out } = check(join(lessons, `${id}.json`));
      expect(status).toBe(1);
      const errors = out["errors"] as { step_id: string | null; message: string }[];
      expect(errors.length).toBeGreaterThan(0);
      for (const e of errors) {
        expect(e.step_id).toMatch(/^s\d+t?$/);
        expect(e.message).toContain("boost_by_mistake names");
      }
      expect(out["questions"]).toBeGreaterThan(0);
    }
  });

  it("prints exactly the keys jw reads", () => {
    const { out } = check(join(lessons, "equal-groups.json"));
    expect(Object.keys(out).sort()).toEqual([
      "errors",
      "findings",
      "lesson_id",
      "mistake_classes",
      "ok",
      "play_path",
      "questions",
    ]);
  });

  it("lists each question step's mistake classes, its family's and its own near table's", () => {
    const { out } = check(join(lessons, "equal-groups.json"));
    const classes = out["mistake_classes"] as Record<string, string[]>;
    expect(Object.keys(classes).sort()).toEqual(
      ["s02", "s02t", "s05", "s05t", "s06", "s06t", "s07", "s07t"].sort(),
    );
    expect(classes["s02"]).toEqual(
      expect.arrayContaining(["off_by_small", "neighbour_row", "other_wrong"]),
    );
    expect(classes["s06"]).toEqual(expect.arrayContaining(["reversed", "swapped_neighbours"]));
    expect(classes["s07"]).toContain("false_reject");
    expect(classes["s07"]).not.toContain("off_by_small");
    for (const list of Object.values(classes)) expect(list).toEqual([...list].sort());
  });

  it("fails a boost for a class the step never gives, naming the step and its classes", () => {
    const file = planted((step) => {
      const help = step.question?.help as { boost_by_mistake?: object } | undefined;
      if (help !== undefined)
        help.boost_by_mistake = { off_by_one: { text: "Policz jeszcze raz." } };
    });
    const { status, out } = check(file);
    expect(status).toBe(1);
    expect(out["ok"]).toBe(false);
    expect(out["errors"]).toEqual([
      {
        step_id: "s02",
        message: expect.stringMatching(
          /names off_by_one, .*its classes are .*off_by_small/,
        ) as unknown,
      },
    ]);
    expect((out["mistake_classes"] as Record<string, string[]>)["s02"]).toContain("off_by_small");
  });

  it("fails a rule class's boost on a step whose key names no rule (dl-e8ov.5.38.15)", () => {
    const file = planted((step) => {
      const q = step.question as { key: Record<string, unknown> };
      delete q.key["rule"];
      delete q.key["near"];
    });
    const { status, out } = check(file);
    expect(status).toBe(1);
    expect(out["errors"]).toEqual([
      {
        step_id: "s02",
        message: expect.stringContaining(
          "names add_for_multiply, which this enter question never gives; its classes are other_wrong",
        ) as unknown,
      },
    ]);
    expect((out["mistake_classes"] as Record<string, string[]>)["s02"]).toEqual(["other_wrong"]);
  });

  it("takes a boost for a class the step's own near table names", () => {
    const file = planted((step) => {
      const q = step.question as { key: { near: Record<string, string> }; help: object };
      q.key.near["11"] = "counted_one_more";
      q.help = { ...q.help, boost_by_mistake: { counted_one_more: { text: "Policz kropki." } } };
    });
    const { status, out } = check(file);
    expect({ status, errors: out["errors"] }).toEqual({ status: 0, errors: [] });
    expect((out["mistake_classes"] as Record<string, string[]>)["s02"]).toContain(
      "counted_one_more",
    );
  });

  it("fails a twin's boost under the twin's step id", () => {
    const file = planted((step) => {
      const twin = (step.question as { help: { twin: { help?: object } } }).help.twin;
      twin.help = { ...twin.help, boost_by_mistake: { reversed: { text: "Od lewej." } } };
    });
    const { status, out } = check(file);
    expect(status).toBe(1);
    expect((out["errors"] as { step_id: string }[]).map((e) => e.step_id)).toEqual(["s02t"]);
  });

  it("lists the mistake classes when the file fails to parse too", () => {
    const { out } = check(planted(() => {}, ""));
    expect(out["ok"]).toBe(false);
    expect((out["mistake_classes"] as Record<string, string[]>)["s02"]).toContain("off_by_small");
  });

  it("fails a step whose question_type is another family's, naming the step", () => {
    const file = planted((step) => {
      const family = step.question?.family;
      const other = Object.entries(QUESTION_TYPE_FAMILY).find(([, f]) => f !== family);
      if (other === undefined) throw new Error("every question type is one family");
      step["question_type"] = other[0];
    });
    const { status, out } = check(file);
    expect(status).toBe(1);
    expect(out["ok"]).toBe(false);
    expect(out["errors"]).toEqual([
      { step_id: "s02", message: expect.stringContaining("is a") as unknown },
    ]);
    expect(out["play_path"]).toBe(`/play/${featuredAssignmentId("equal-groups", DRAFTS_POD.id)}`);
  });

  it("fails a help field the contract lacks, naming the step", () => {
    const file = planted((step) => {
      if (step.question !== undefined) step.question.help = { ...step.question.help, hint: "x" };
    });
    const { status, out } = check(file);
    expect(status).toBe(1);
    expect(out["errors"]).toEqual([
      { step_id: "s02", message: expect.stringContaining("no field for hint") as unknown },
    ]);
  });

  it("names the step of each schema problem, and none for the file's own", () => {
    const file = planted((step) => {
      step["question_type"] = "not-a-type";
    }, "");
    const { status, out } = check(file);
    expect(status).toBe(1);
    const steps = (out["errors"] as { step_id: string | null }[]).map((e) => e.step_id);
    expect(steps.sort()).toEqual([null, "s02"].sort());
  });

  it("answers ok with no findings on a good file", () => {
    const { status, out } = check(join(lessons, "equal-groups.json"));
    expect({ status, ok: out["ok"], findings: out["findings"] }).toEqual({
      status: 0,
      ok: true,
      findings: [],
    });
  });

  it("lists every problem of a file, each with its path and a fix", () => {
    // multiplication-times-four's first 3 questions: s02 (enter), s03 (choose), s06 (enter, 28).
    const file = plantedIn("multiplication-times-four", (steps) => {
      const help = (id: string) => steps[id]?.question?.help as Record<string, unknown>;
      help("s02")["boost"] = { text: "" };
      help("s03")["boost_by_mistake"] = { off_by_ten: { text: "Policz jeszcze raz." } };
      const s06 = steps["s06"];
      if (s06 !== undefined) s06["say"] = "Ile jest kwiatków razem? To 28.";
    });
    const { status, out } = check(file);
    expect(status).toBe(1);
    expect(out["ok"]).toBe(false);
    const findings = out["findings"] as Found[];
    expect(
      findings.map(({ step_id, path, level, rule }) => ({ step_id, path, level, rule })),
    ).toEqual(
      expect.arrayContaining([
        {
          step_id: "s02",
          path: expect.stringMatching(
            /^script\.parts\[\d+\]\.steps\[\d+\]\.question\.help\.boost$/,
          ),
          level: "warn",
          rule: "empty-rung",
        },
        {
          step_id: "s03",
          path: expect.stringMatching(/\.question\.help\.boost_by_mistake\.off_by_ten$/),
          level: "error",
          rule: "unknown-mistake-class",
        },
        {
          step_id: "s06",
          path: expect.stringMatching(/^script\.parts\[\d+\]\.steps\[\d+\]\.say$/),
          level: "warn",
          rule: "key-in-say",
        },
      ]),
    );
    expect(findings).toHaveLength(3);
    for (const f of findings) expect(f.fix.length).toBeGreaterThan(10);
    expect(findings.find((f) => f.rule === "unknown-mistake-class")?.fix).toContain(
      "add_for_multiply",
    );
    // jw's old errors: the 1 error, by step; the 2 warns are not errors.
    expect((out["errors"] as { step_id: string }[]).map((e) => e.step_id)).toEqual(["s03"]);
  });

  it("does not take an operand for the answer in key-in-say, and passes the file", () => {
    // equal-groups s02 is an enter question; "10 − 5" with the answer 5 needs its 5.
    for (const say of [
      "Ile to jest 10 − 5? Napisz albo powiedz.",
      "Ile to jest 5 × 1?",
      "Ile to jest 5 razy 1?",
      "Policz dalej: 1, 3, 5, …",
    ]) {
      const file = planted((step) => {
        step["say"] = say;
        (step.question as { key: { accept: string[] } }).key.accept = ["5"];
      });
      const { status, out } = check(file);
      expect({ say, status, findings: out["findings"] }).toEqual({ say, status: 0, findings: [] });
    }
    const given = check(
      planted((step) => {
        step["say"] = "Ile to jest 10 − 5? To 5.";
        (step.question as { key: { accept: string[] } }).key.accept = ["5"];
      }),
    );
    expect(given.status).toBe(0);
    expect(given.out["ok"]).toBe(true);
    expect(given.out["findings"]).toEqual([
      expect.objectContaining({ step_id: "s02", level: "warn", rule: "key-in-say" }),
    ]);
  });

  it("reads no rung of a file with no language", () => {
    const raw = structuredClone(
      LESSON_FILES.find((f) => (f as { id: string }).id === "equal-groups"),
    ) as Record<string, unknown>;
    delete raw["language"];
    const file = join(mkdtempSync(join(tmpdir(), "lesson-check-")), "no-language.json");
    writeFileSync(file, JSON.stringify(raw));
    const findings = check(file).out["findings"] as Found[];
    expect(findings.filter((f) => f.rule === "empty-rung")).toEqual([]);
    expect(findings.map((f) => f.path)).toContain("language");
  });

  it("lets say quote the answer as an operand, never as the answer", () => {
    const withSay = (say: string) =>
      planted((step) => {
        step["say"] = say;
        // A bare key gives no rule class, so its add_for_multiply card goes too (dl-e8ov.5.38.15).
        Object.assign(step.question ?? {}, { key: { accept: ["5"] } });
        const help = step.question?.help as { boost_by_mistake?: object } | undefined;
        if (help !== undefined) delete help.boost_by_mistake;
      });
    for (const say of [
      "Ile to jest 10 − 5? Napisz albo powiedz.",
      "Ile to 5 × 1?",
      "10 : 2 = ?",
      "Ile to jest 5 razy 1?",
      "Policz dalej: 1, 3, 5, …",
    ]) {
      const { out } = check(withSay(say));
      expect([say, out["ok"], out["errors"]]).toEqual([say, true, []]);
    }
    for (const say of ["Ile to jest 10 − 5? To 5.", "10 − 5 = 5", "Odpowiedź: 5"]) {
      const { out } = check(withSay(say));
      const found = (out["findings"] as Found[]).map((f) => [f.rule, f.level]);
      expect([say, out["ok"], found]).toEqual([say, true, [["key-in-say", "warn"]]]);
    }
  });

  it("reads a question's representation signature (wave-3 lead decision 3)", () => {
    const picture = (src: string) => ({ src, alt: "kropki", width: 120 });
    expect(
      signatureOf({
        input: "number",
        stem: { image: "/a.png", text: "?" },
        figure: { kind: "array", pictures: [picture("/b.png")] },
        options: [
          { id: "o1", content: { kind: "text", text: "1" } },
          { id: "o2", content: { kind: "picture", picture: picture("/c.png") } },
        ],
      }),
    ).toEqual({
      pictures: 3,
      srcs: ["/a.png", "/b.png", "/c.png"],
      figures: ["array"],
      options: ["picture", "text"],
      inputs: ["number"],
    });
    expect(signatureOf({ stem: { image: picture("/a.png") } }).pictures).toBe(1);
    expect(signatureOf(undefined)).toEqual({
      pictures: 0,
      srcs: [],
      figures: [],
      options: [],
      inputs: [],
    });
  });

  describe("a twin that asks another way", () => {
    type Twin = { data: Record<string, unknown>; key: Record<string, unknown> };
    const twinOf = (step: Step) => (step.question as { help: { twin: Twin } }).help.twin;
    const dataOf = (step: Step) => (step.question as { data: Record<string, unknown> }).data;
    const withPicture = (data: Record<string, unknown>, src: string) =>
      Object.assign(data, {
        stem: { text: "?", pictures: [{ src, alt: "kropki", width: 120, height: 60 }] },
      });
    const twinFindings = (change: (step: Step) => void) => {
      const { out } = check(planted(change));
      return (out["findings"] as Found[]).filter((f) => f.rule.startsWith("twin-"));
    };

    it("is an error when the twin loses the original's pictures", () => {
      const found = twinFindings((step) => withPicture(dataOf(step), "/dots-2x5.png"));
      expect(found).toEqual([
        expect.objectContaining({
          step_id: "s02t",
          path: expect.stringMatching(/^script\.parts\[\d+\]\.steps\[\d+\]\.question\.help\.twin$/),
          level: "error",
          rule: "twin-representation",
          text: expect.stringContaining("1 pictures and the twin none"),
        }),
      ]);
    });

    it("is an error when the twin's figure is another kind", () => {
      const found = twinFindings((step) => {
        twinOf(step).data["figure"] = { kind: "number_line", text: "2 × 4" };
      });
      expect(found.map((f) => [f.step_id, f.level, f.rule])).toEqual([
        ["s02t", "error", "twin-representation"],
      ]);
      expect(found[0]?.text).toContain("number_line, the original's expression");
    });

    it("warns when the twin draws the original's pictures with another key", () => {
      const found = twinFindings((step) => {
        withPicture(dataOf(step), "/dots-2x5.png");
        withPicture(twinOf(step).data, "/dots-2x5.png");
      });
      expect(found).toEqual([
        expect.objectContaining({
          step_id: "s02t",
          path: expect.stringMatching(/\.question\.help\.twin\.data$/),
          level: "warn",
          rule: "twin-same-picture",
        }),
      ]);
    });

    it("passes a twin with its own picture of the same kind, and fails the file only on the error", () => {
      expect(
        twinFindings((step) => {
          withPicture(dataOf(step), "/dots-2x5.png");
          withPicture(twinOf(step).data, "/dots-2x4.png");
        }),
      ).toEqual([]);
      const { status, out } = check(planted((step) => withPicture(dataOf(step), "/dots-2x5.png")));
      expect(status).toBe(1);
      expect((out["errors"] as { step_id: string }[]).map((e) => e.step_id)).toEqual(["s02t"]);
    });
  });

  describe("a key that does not grade its own answer", () => {
    type Choose = { key: { correct: string[] }; help: { twin: { key: { correct: string[] } } } };
    const s07 = (steps: Record<string, Step>) => steps["s07"] as Step & { question: Choose };
    const keyFindings = (change: (steps: Record<string, Step>) => void) => {
      const { status, out } = check(plantedIn("equal-groups", change));
      const found = (out["findings"] as Found[]).filter((f) => f.rule === "key-grades");
      return { status, found, errors: out["errors"] as { step_id: string }[] };
    };

    it("fails a twin whose key names an option the twin does not have, at the twin's key", () => {
      const { status, found, errors } = keyFindings((steps) => {
        s07(steps).question.help.twin.key.correct = ["missing"];
      });
      expect(status).toBe(1);
      expect(found).toEqual([
        expect.objectContaining({
          step_id: "s07t",
          path: expect.stringMatching(
            /^script\.parts\[\d+\]\.steps\[\d+\]\.question\.help\.twin\.key$/,
          ),
          level: "error",
          rule: "key-grades",
        }),
      ]);
      expect(errors.map((e) => e.step_id)).toEqual(["s07t"]);
    });

    it("fails a changed question whose key no longer grades, and leaves an unchanged one to the bank", () => {
      const broken = (steps: Record<string, Step>) => {
        s07(steps).question.key.correct = ["missing"];
      };
      expect(keyFindings(broken).found).toEqual([]);
      const { found } = keyFindings((steps) => {
        broken(steps);
        s07(steps)["based_on"] = {
          question: "authored:equal-groups",
          changes: [{ change: "numbers", why: "the parent asked for 4 × 2", reviewed: false }],
        };
      });
      expect(found.map((f) => [f.step_id, f.path.replace(/.*\.question/, "question")])).toEqual([
        ["s07", "question.key"],
      ]);
    });
  });

  it("keeps going past a step that does not compile, to the next one", () => {
    const file = plantedIn("equal-groups", (steps) => {
      for (const id of ["s02", "s05"]) {
        const step = steps[id];
        const other = Object.entries(QUESTION_TYPE_FAMILY).find(
          ([, f]) => f !== step?.question?.family,
        );
        if (step === undefined || other === undefined) throw new Error(`no step ${id}`);
        step["question_type"] = other[0];
      }
    });
    const { out } = check(file);
    const findings = out["findings"] as Found[];
    expect(findings.map((f) => [f.step_id, f.rule])).toEqual([
      ["s02", "question-type-family"],
      ["s05", "question-type-family"],
    ]);
    expect(findings[0]?.path).toMatch(/\.question_type$/);
  });

  it("names a schema problem's field and the values it takes", () => {
    const file = planted((step) => {
      step["question_type"] = "not-a-type";
    });
    const findings = check(file).out["findings"] as Found[];
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ step_id: "s02", rule: "schema", level: "error" });
    expect(findings[0]?.path).toMatch(/\.question_type$/);
    expect(findings[0]?.fix).toMatch(/^Set .*question_type to one of the enter question types: "/);
  });

  it("fails a file that is not JSON, with no step", () => {
    const file = join(mkdtempSync(join(tmpdir(), "lesson-check-")), "broken.json");
    writeFileSync(file, "{");
    const { status, out } = check(file);
    expect(status).toBe(1);
    expect(out).toMatchObject({ ok: false, play_path: null, lesson_id: null, questions: 0 });
    expect((out["errors"] as { step_id: unknown }[])[0]?.step_id).toBeNull();
  });
});

describe("check, in-process (dl-z5ja.12)", () => {
  it("answers what --json prints for the same file", () => {
    const file = LESSON_FILES.find((f) => (f as { id?: unknown }).id === "equal-groups");
    const { out } = check(join(lessons, "equal-groups.json"));
    expect(JSON.parse(JSON.stringify(checkInProcess(file)))).toEqual(out);
  });
});
