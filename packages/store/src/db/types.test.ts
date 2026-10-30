import { RECORDS } from "@jadwigo/contracts";
import type { Selectable } from "kysely";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { Columns } from "./introspect.ts";
import { COLUMNS, type DB } from "./types.ts";

/** A field of a record's Zod object, as far as this test reads it. */
interface Field {
  safeParse(value: unknown): { success: boolean };
  /** An enum's labels; a union's members. */
  readonly options?: readonly unknown[];
  unwrap?(): Field;
}

const records: Readonly<Record<string, { shape: Readonly<Record<string, Field>> }>> = RECORDS;
const columns: Columns = COLUMNS;

/** The labels of an enum field, nullable or not, or null for any other field. */
function labels(field: Field): readonly string[] | null {
  const options = field.options ?? field.unwrap?.().options;
  return options?.every((o) => typeof o === "string") ? (options as string[]) : null;
}

describe("the generated types (src/db/types.ts)", () => {
  it("name every record's table, and nothing else", () => {
    expect(Object.keys(columns).sort()).toEqual(Object.keys(records).sort());
  });

  describe.each(Object.keys(records))("%s", (table) => {
    const shape = records[table]?.shape ?? {};
    const cols = columns[table] ?? {};

    it("has the record's fields as its columns", () => {
      expect(Object.keys(cols).sort()).toEqual(Object.keys(shape).sort());
    });

    it("allows null in a column exactly where the record does", () => {
      // A view's columns are all nullable in the catalog, and `data` and `key` are unknown to the
      // record (their family's schema checks them), so neither says anything here.
      if (table === "attempt_result" || table === "learner_skill_evidence") return;
      for (const [name, field] of Object.entries(shape)) {
        if (field.safeParse(Symbol()).success) continue;
        expect(cols[name]?.nullable, name).toBe(field.safeParse(null).success);
      }
    });

    it("has the record's labels for each enum column", () => {
      for (const [name, field] of Object.entries(shape)) {
        expect(cols[name]?.labels ?? null, name).toEqual(labels(field));
      }
    });
  });

  it("type every table's row with the record's fields", () => {
    type Keys<T extends keyof DB> = keyof Selectable<DB[T]>;
    expectTypeOf<Keys<"pod">>().toEqualTypeOf<keyof typeof RECORDS.pod.shape>();
    expectTypeOf<Keys<"learner">>().toEqualTypeOf<keyof typeof RECORDS.learner.shape>();
    expectTypeOf<Keys<"lesson">>().toEqualTypeOf<keyof typeof RECORDS.lesson.shape>();
    expectTypeOf<Keys<"lesson_version">>().toEqualTypeOf<
      keyof typeof RECORDS.lesson_version.shape
    >();
    expectTypeOf<Keys<"lesson_version_question">>().toEqualTypeOf<
      keyof typeof RECORDS.lesson_version_question.shape
    >();
    expectTypeOf<Keys<"lesson_question">>().toEqualTypeOf<
      keyof typeof RECORDS.lesson_question.shape
    >();
    expectTypeOf<Keys<"assignment">>().toEqualTypeOf<keyof typeof RECORDS.assignment.shape>();
    expectTypeOf<Keys<"attempt">>().toEqualTypeOf<keyof typeof RECORDS.attempt.shape>();
    expectTypeOf<Keys<"attempt_question">>().toEqualTypeOf<
      keyof typeof RECORDS.attempt_question.shape
    >();
    expectTypeOf<Keys<"attempt_answer">>().toEqualTypeOf<
      keyof typeof RECORDS.attempt_answer.shape
    >();
    expectTypeOf<Keys<"attempt_result">>().toEqualTypeOf<
      keyof typeof RECORDS.attempt_result.shape
    >();
    expectTypeOf<Keys<"skill">>().toEqualTypeOf<keyof typeof RECORDS.skill.shape>();
    expectTypeOf<Keys<"goal">>().toEqualTypeOf<keyof typeof RECORDS.goal.shape>();
    expectTypeOf<Keys<"learner_skill_mastery">>().toEqualTypeOf<
      keyof typeof RECORDS.learner_skill_mastery.shape
    >();
    expectTypeOf<Keys<"learner_report">>().toEqualTypeOf<
      keyof typeof RECORDS.learner_report.shape
    >();
    expectTypeOf<Keys<"learner_skill_evidence">>().toEqualTypeOf<
      keyof typeof RECORDS.learner_skill_evidence.shape
    >();
  });
});
