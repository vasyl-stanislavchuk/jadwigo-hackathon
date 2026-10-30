import { readFileSync } from "node:fs";
import type { FamilyQuestion } from "@jadwigo/contracts";
import { compileLessonFile } from "./compile.ts";
import { DRAFTS_POD, featuredAssignmentId, lessonIdFor } from "./ids.ts";
import { LessonFile } from "./lesson-file.ts";
import { mistakeClassesByStep, unknownBoosts } from "./mistakes.ts";

/**
 * Checks one lesson file without writing anything (dl-e8ov.5.38.3): `bun run check <file> [--json]`
 * from this package, or `bun packages/lesson-import/src/check.ts <file> --json` from the repo root,
 * which is how `jw lesson_check` calls it. It parses and compiles the file as the import would, and
 * prints every problem with its step id. Exit 1 on any problem, 0 when clean, 2 on a bad command line.
 *
 * With `--json` it prints one object, a contract with `jw` (Python reads it):
 *
 *     {"ok": boolean,
 *      "errors": [{"step_id": string | null, "message": string}],
 *      "play_path": "/play/<assignment id>" | null,
 *      "lesson_id": "<lesson id>" | null,
 *      "questions": number,
 *      "mistake_classes": {<step id>: [string, ...]}}
 *
 * - `step_id` is the step's `id` in the file (a twin's ends `t`, as compile names it), or null when
 *   the problem is the file's own (its title, its id, the JSON itself).
 * - `play_path` and `lesson_id` are the assignment's path and the lesson's id in the drafts pod,
 *   where `make lesson-import` puts the file (`DRAFTS_POD`, dl-e8ov.2.59), known before any import
 *   because ids are named from the file id (`ids.ts`). Both are null
 *   only when the file has no usable id.
 * - `questions` counts the planned questions a learner is asked, twins not counted; 0 when the file
 *   does not compile.
 * - `mistake_classes` names, for each question step (a twin under its own step id), every class
 *   its judge can give a miss on that step's own data and key (packages/core `mistakeClassesOf`,
 *   dl-e8ov.5.38.15): the classes for its input and kind, its `near` tables, a rule's classes only
 *   when its key names the rule, and `other_wrong`, sorted. These are all a `boost_by_mistake` key
 *   may name, and one it does not is an error by step id that lists them, once the file compiles;
 *   the import itself does not refuse one. Read from the file as given, so it is there when the
 *   file fails too; a step whose question does not parse is left out.
 *
 * A parse failure reports every problem the schema finds, one error each. Compile stops at its first
 * throw, so once the file parses one run reports at most one compile error: fix it and run again.
 */

interface CheckError {
  readonly step_id: string | null;
  readonly message: string;
}

interface CheckResult {
  readonly ok: boolean;
  readonly errors: readonly CheckError[];
  readonly play_path: string | null;
  readonly lesson_id: string | null;
  readonly questions: number;
  readonly mistake_classes: Readonly<Record<string, readonly string[]>>;
}

/** The step at `script.parts[i].steps[j]` of the file as given, by its id. */
function stepIdAt(raw: unknown, path: string): string | null {
  const at = /script\.parts\[(\d+)\]\.steps\[(\d+)\]/.exec(path);
  if (at === null) return null;
  const parts = (raw as { script?: { parts?: { steps?: { id?: unknown }[] }[] } }).script?.parts;
  const id = parts?.[Number(at[1])]?.steps?.[Number(at[2])]?.id;
  return typeof id === "string" ? id : `script.parts[${at[1]}].steps[${at[2]}]`;
}

/** A thrown parse or compile error, split into one error per problem with its step id. */
function errorsOf(raw: unknown, message: string): CheckError[] {
  // compile.ts: `lesson file <id>, step <step>[ help]: ...`
  const step = /^lesson file [^,:]*, step (\S+?)(?: help)?:/.exec(message);
  if (step !== null) return [{ step_id: step[1] ?? null, message }];
  // parseLessonFile: `lesson file <id>: ✖ <problem>\n  → at <path>` for each problem.
  const head = /^lesson file [^:]*: /.exec(message);
  if (head === null || !message.includes("✖")) return [{ step_id: null, message }];
  return message
    .slice(head[0].length)
    .split(/^✖ /m)
    .filter((p) => p.trim() !== "")
    .map((problem) => {
      const path = /→ at (\S+)/.exec(problem)?.[1] ?? "";
      return {
        step_id: stepIdAt(raw, path),
        message: `${head[0]}${problem.trim().replace(/\s*\n\s*/g, " ")}`,
      };
    });
}

function check(raw: unknown): CheckResult {
  const fileId = LessonFile.shape.id.safeParse((raw as { id?: unknown } | null)?.id);
  const known = fileId.success
    ? {
        play_path: `/play/${featuredAssignmentId(fileId.data, DRAFTS_POD.id)}`,
        lesson_id: lessonIdFor(DRAFTS_POD.id, fileId.data) as string,
      }
    : { play_path: null, lesson_id: null };
  const mistake_classes = mistakeClassesByStep(raw);
  try {
    const compiled = compileLessonFile(raw);
    const questions = compiled.questions.filter((q) => q.role === "planned").length;
    // Stricter than the import, which keeps the playground's lessons as exported: a boost for a
    // class its question never gives never reaches the child (dl-e8ov.5.38.11).
    const errors = compiled.questions.flatMap(({ step_id, question }) => {
      const unknown = unknownBoosts(question as FamilyQuestion, question.help?.boost_by_mistake);
      return unknown === null
        ? []
        : [
            {
              step_id,
              message: `lesson file ${String(fileId.data)}, step ${step_id} help: ${unknown}`,
            },
          ];
    });
    return { ok: errors.length === 0, errors, ...known, questions, mistake_classes };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, errors: errorsOf(raw, message), ...known, questions: 0, mistake_classes };
  }
}

function read(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

const args = process.argv.slice(2);
const json = args.includes("--json");
const files = args.filter((a) => a !== "--json");
if (files.length !== 1 || files[0] === undefined) {
  process.stderr.write("usage: bun run check <lesson file> [--json]\n");
  process.exit(2);
}
const file = files[0];
let result: CheckResult;
try {
  result = check(read(file));
} catch (e) {
  const message = `${file}: ${e instanceof Error ? e.message : String(e)}`;
  result = {
    ok: false,
    errors: [{ step_id: null, message }],
    play_path: null,
    lesson_id: null,
    questions: 0,
    mistake_classes: {},
  };
}
if (json) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
} else if (result.ok) {
  process.stdout.write(`${file}: ok, ${result.questions} questions, play ${result.play_path}\n`);
} else {
  for (const { step_id, message } of result.errors) {
    process.stdout.write(`${file}: ${step_id === null ? "" : `step ${step_id}: `}${message}\n`);
  }
}
process.exit(result.ok ? 0 : 1);
