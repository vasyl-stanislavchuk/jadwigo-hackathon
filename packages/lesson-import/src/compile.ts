import { createHash } from "node:crypto";
import {
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

/** Parses with a contract schema, and refuses a field the schema would silently drop. */
export function strictly<S extends z.ZodType>(schema: S, value: unknown, at: string): z.infer<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error(`${at}: ${parsed.error.message}`);
  const lost = dropped(value, parsed.data);
  if (lost.length > 0) throw new Error(`${at}: the contract has no field for ${lost.join(", ")}`);
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
      throw new Error(`lesson file ${fileId}: skill ids ${other} and ${id} both become ${mapped}`);
    }
    seen.set(mapped, id);
    const parsed = SkillId.safeParse(mapped);
    if (!parsed.success)
      throw new Error(`lesson file ${fileId}: ${id} is not a skill id (${mapped})`);
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
    throw new Error(
      `${at}: ${step.question_type} is a ${QUESTION_TYPE_FAMILY[step.question_type]} question, not ${spec.family}`,
    );
  }
  const family = strictly(FamilyQuestion, spec, at);
  const { twin: _twin, ...ladder } = help ?? {};
  return {
    ...family,
    question_type: step.question_type,
    say,
    help: strictly(Help, ladder, `${at} help`),
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
 * `help.twin` becomes a spare lesson question with `twin_of`. A twin carries no credit or
 * `based_on`, as the playground shows none on it.
 */
export function compileLessonFile(raw: unknown, pod: PodId = FEATURED_POD.id): CompiledLesson {
  const file = parseLessonFile(raw);
  const steps = questionSteps(file);
  if (steps.length === 0) throw new Error(`lesson file ${file.id}: no question to ask`);
  const shared = { subject: file.subject, grade: null };

  const planned: CompiledQuestion[] = [];
  const spares: CompiledQuestion[] = [];
  for (const step of steps) {
    const question = withId(
      pod,
      file.id,
      step.id,
      body(file.id, step.id, step, step.question, step.say, {
        ...shared,
        twin_of: null,
        based_on: step.based_on,
        credit: step.credit ?? null,
      }),
    );
    planned.push({ step_id: step.id, role: "planned", question });

    const twin = step.question.help?.["twin"];
    if (twin === undefined) continue;
    const { say, ...twinQuestion } = twin as FileQuestion & { say: string };
    if (twinQuestion.help?.["twin"] !== undefined) {
      throw new Error(`lesson file ${file.id}, step ${step.id}: a twin has no twin of its own`);
    }
    const twinStep = `${step.id}t`;
    spares.push({
      step_id: twinStep,
      role: "spare",
      question: withId(
        pod,
        file.id,
        twinStep,
        body(file.id, twinStep, step, twinQuestion, say, {
          ...shared,
          twin_of: question.id,
          based_on: null,
          credit: null,
        }),
      ),
    });
  }

  const skills = [
    ...new Set(
      skillIds(
        file.id,
        steps.flatMap((s) => s.skill_ids),
      ),
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
