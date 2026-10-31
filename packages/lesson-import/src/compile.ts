import { createHash } from "node:crypto";
import {
  BasedOn,
  Credit,
  FamilyQuestion,
  Help,
  type LessonId,
  type LessonQuestionId,
  type PodId,
  QUESTION_TYPE_FAMILY,
  SkillId,
} from "@jadwigo/contracts";
import type { NewAssignment, NewLesson, NewLessonQuestion } from "@jadwigo/store";
import type { z } from "zod";
import { FEATURED_POD, featuredAssignmentId, lessonIdFor, lessonQuestionIdFor } from "./ids.ts";
import {
  type FileQuestion,
  type LessonFile,
  parseLessonFile,
  type QuestionStep,
  questionSteps,
  skillIdOf,
} from "./lesson-file.ts";

/** A lesson question ready to write, and its place on the version's list. */
export interface CompiledQuestion {
  readonly step_id: string;
  readonly role: "planned" | "spare";
  readonly question: NewLessonQuestion & { readonly id: LessonQuestionId };
}

/** Everything one lesson file writes, before anything is written. */
export interface CompiledLesson {
  readonly lesson: NewLesson & { readonly id: LessonId };
  /** The version's list: every planned question in script order, then the twins as spares. */
  readonly questions: readonly CompiledQuestion[];
  readonly assignment: NewAssignment;
}

/** JSON with its keys sorted at every level, so a hash does not follow the order keys were written in. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function contentHash(content: unknown): string {
  return `sha256:${createHash("sha256").update(canonical(content)).digest("hex")}`;
}

/** Every path in `given` that `kept` lacks: what a Zod object stripped without a word. */
function dropped(given: unknown, kept: unknown, path = ""): string[] {
  if (Array.isArray(given)) {
    return given.flatMap((v, i) =>
      dropped(v, (kept as unknown[] | undefined)?.[i], `${path}[${i}]`),
    );
  }
  if (given === null || typeof given !== "object") return [];
  const out = (kept ?? {}) as Record<string, unknown>;
  return Object.entries(given).flatMap(([k, v]) =>
    k in out ? dropped(v, out[k], path ? `${path}.${k}` : k) : [path ? `${path}.${k}` : k],
  );
}

/**
 * Why a step does not compile, as `compileProblems` reports it: the step (null for the file's own),
 * where under the step (`question.help`, a twin's `question.help.twin`), a rule a reader can cite,
 * the message `compileLessonFile` throws, and each problem a contract schema found with its path
 * under `at`.
 */
export interface CompileProblem {
  readonly step_id: string | null;
  readonly at: string;
  readonly rule: string;
  readonly message: string;
  readonly issues: readonly { readonly path: string; readonly message: string }[];
}

/** A throw site's problem, carried through `body` to `compileProblems`. */
class StepError extends Error {
  constructor(
    message: string,
    readonly at: string,
    readonly rule: string,
    readonly issues: CompileProblem["issues"] = [],
  ) {
    super(message);
  }
}

/** A Zod path as the file writes it: `data.options[2].text`. */
function pathOf(path: readonly PropertyKey[]): string {
  return path
    .map((k, i) => (typeof k === "number" ? `[${k}]` : i === 0 ? String(k) : `.${String(k)}`))
    .join("");
}

/** Parses with a contract schema, and refuses a field the schema would silently drop. */
export function strictly<S extends z.ZodType>(
  schema: S,
  value: unknown,
  at: string,
  where = "",
): z.infer<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({ path: pathOf(i.path), message: i.message }));
    throw new StepError(`${at}: ${parsed.error.message}`, where, "contract", issues);
  }
  const lost = dropped(value, parsed.data);
  if (lost.length > 0) {
    throw new StepError(
      `${at}: the contract has no field for ${lost.join(", ")}`,
      where,
      "unknown-field",
      lost.map((path) => ({ path, message: "the contract has no field for this" })),
    );
  }
  return parsed.data;
}

/**
 * A step's skill ids in the contract's form. Folding a mark away can make 2 of the playground's ids
 * one (`l-ł` and `l-l`), which would merge 2 skills' evidence, so that is refused, across the file.
 */
function skillIds(
  fileId: string,
  raw: readonly string[],
  seen = new Map<string, string>(),
): SkillId[] {
  return raw.map((id) => {
    const mapped = skillIdOf(id);
    const other = seen.get(mapped);
    if (other !== undefined && other !== id) {
      throw new StepError(
        `lesson file ${fileId}: skill ids ${other} and ${id} both become ${mapped}`,
        "skill_ids",
        "skill-id-collision",
      );
    }
    seen.set(mapped, id);
    const parsed = SkillId.safeParse(mapped);
    if (!parsed.success)
      throw new StepError(
        `lesson file ${fileId}: ${id} is not a skill id (${mapped})`,
        "skill_ids",
        "skill-id",
      );
    return parsed.data;
  });
}

type Body = Omit<NewLessonQuestion, "id" | "content_hash">;

/** A question's family, data, key and ladder, checked against the contracts. */
function body(
  fileId: string,
  stepId: string,
  step: QuestionStep,
  question: FileQuestion,
  say: string,
  rest: Pick<Body, "subject" | "grade" | "twin_of" | "based_on" | "credit">,
): Body {
  const at = `lesson file ${fileId}, step ${stepId}`;
  const { help, ...spec } = question;
  if (QUESTION_TYPE_FAMILY[step.question_type] !== spec.family) {
    throw new StepError(
      `${at}: ${step.question_type} is a ${QUESTION_TYPE_FAMILY[step.question_type]} question, not ${spec.family}`,
      "question_type",
      "question-type-family",
    );
  }
  const family = strictly(FamilyQuestion, spec, at, "question");
  const { twin: _twin, ...ladder } = help ?? {};
  return {
    ...family,
    question_type: step.question_type,
    say,
    help: strictly(Help, ladder, `${at} help`, "question.help"),
    skill_ids: skillIds(fileId, step.skill_ids),
    ...rest,
  } as Body;
}

function withId(
  pod: PodId,
  fileId: string,
  stepId: string,
  content: Body,
): CompiledQuestion["question"] {
  const content_hash = contentHash(content);
  return {
    ...content,
    content_hash,
    id: lessonQuestionIdFor(pod, fileId, stepId, content_hash),
  } as CompiledQuestion["question"];
}

/**
 * Compiles a lesson file into what the import writes, in the file's own language. Teaching steps,
 * `can_do`, each step's `reason` and `scenarios` are dropped (decision
 * `2026-10-27-the-v0-attempt-rules-questions-only-on-the-wire-the-api-v1-route`), and each
 * `help.twin` becomes a spare lesson question with `twin_of`. A twin keeps its own `credit` and
 * `based_on` when it has them, so a sibling bank item taken as the twin carries its attribution into
 * the stored question (dl-a38n.46), and null when not, as the playground writes none.
 */
export function compileLessonFile(raw: unknown, pod: PodId = FEATURED_POD.id): CompiledLesson {
  return compile(parseLessonFile(raw), pod, (problem) => {
    throw new Error(problem.message);
  });
}

/**
 * Every reason a parsed file does not compile, in the order `compileLessonFile` meets them: it
 * throws the first, this keeps going to the next step (dl-a38n.14). Empty when the file compiles.
 */
export function compileProblems(file: LessonFile, pod: PodId = FEATURED_POD.id): CompileProblem[] {
  const problems: CompileProblem[] = [];
  compile(file, pod, (problem) => {
    problems.push(problem);
  });
  return problems;
}

/** A twin's place under its step: its question is `question.help.twin`, its ladder its `help`. */
const UNDER_TWIN: Record<string, string> = {
  question: "question.help.twin",
  "question.help": "question.help.twin.help",
};

/** Runs `run`, reporting a throw as the step's problem; null when it threw. */
function attempt<T>(
  stepId: string | null,
  run: () => T,
  report: (problem: CompileProblem) => void,
  twin = false,
): T | null {
  try {
    return run();
  } catch (e) {
    if (!(e instanceof StepError)) throw e;
    const at = twin ? (UNDER_TWIN[e.at] ?? e.at) : e.at;
    report({ step_id: stepId, at, rule: e.rule, message: e.message, issues: e.issues });
    return null;
  }
}

function compile(
  file: LessonFile,
  pod: PodId,
  report: (problem: CompileProblem) => void,
): CompiledLesson {
  const steps = questionSteps(file);
  if (steps.length === 0) {
    report({
      step_id: null,
      at: "script",
      rule: "no-question",
      message: `lesson file ${file.id}: no question to ask`,
      issues: [],
    });
  }
  // The server never asks an explain question in v0, but an attempt starts at position 1 whatever
  // its family, so a lesson that opens with one would stick (dl-e8ov.2.32.28, decision
  // 2026-10-28-in-v0-the-server-never-asks-an-explain-question-a-lesson-plays-i).
  const first = steps[0];
  if (first?.question.family === "explain") {
    report({
      step_id: first.id,
      at: "question.family",
      rule: "explain-first",
      message: `lesson file ${file.id}, step ${first.id}: a v0 lesson cannot open with an explain question, which is never asked`,
      issues: [],
    });
  }
  const shared = { subject: file.subject, grade: null };

  const planned: CompiledQuestion[] = [];
  const spares: CompiledQuestion[] = [];
  for (const step of steps) {
    const content = attempt(
      step.id,
      () =>
        body(file.id, step.id, step, step.question, step.say, {
          ...shared,
          twin_of: null,
          based_on: step.based_on,
          credit: step.credit ?? null,
        }),
      report,
    );
    if (content === null) continue;
    const question = withId(pod, file.id, step.id, content);
    planned.push({ step_id: step.id, role: "planned", question });

    const twin = step.question.help?.["twin"];
    if (twin === undefined) continue;
    const {
      say,
      credit: twinCredit,
      based_on: twinBasedOn,
      ...twinQuestion
    } = twin as FileQuestion & { say: string; credit?: unknown; based_on?: unknown };
    const twinStep = `${step.id}t`;
    if (twinQuestion.help?.["twin"] !== undefined) {
      report({
        step_id: twinStep,
        at: "question.help.twin.help.twin",
        rule: "twin-of-twin",
        message: `lesson file ${file.id}, step ${step.id}: a twin has no twin of its own`,
        issues: [],
      });
      continue;
    }
    const twinContent = attempt(
      twinStep,
      () =>
        body(file.id, twinStep, step, twinQuestion, say, {
          ...shared,
          twin_of: question.id,
          based_on: strictly(
            BasedOn.nullable(),
            twinBasedOn ?? null,
            `lesson file ${file.id}, step ${twinStep} based_on`,
            "question",
          ),
          credit: strictly(
            Credit.nullable(),
            twinCredit ?? null,
            `lesson file ${file.id}, step ${twinStep} credit`,
            "question",
          ),
        }),
      report,
      true,
    );
    if (twinContent === null) continue;
    spares.push({
      step_id: twinStep,
      role: "spare",
      question: withId(pod, file.id, twinStep, twinContent),
    });
  }

  const skills = [
    ...new Set(
      attempt(
        null,
        () =>
          skillIds(
            file.id,
            steps.flatMap((s) => s.skill_ids),
          ),
        report,
      ) ?? [],
    ),
  ];
  const lessonId = lessonIdFor(pod, file.id);
  return {
    lesson: {
      id: lessonId,
      title: file.title,
      language: file.language,
      kind: file.kind ?? "practice",
      reasoning: file.reasoning,
      category: file.category,
      subject: file.subject,
      grade: null,
      skill_ids: skills,
    },
    questions: [...planned, ...spares],
    assignment: {
      id: featuredAssignmentId(file.id, pod),
      lesson_id: lessonId,
      audience: "anyone",
      identity: "none",
    },
  };
}
