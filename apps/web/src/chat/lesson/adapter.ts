/**
 * A lesson file as the builder draws it (dl-a38n.1): each part's question steps as `FamilySpec`s,
 * the way `specOf` (panels/question.ts) makes one from a written example. A question step keeps
 * its id, say, question type, family, data, key and help; its twin becomes help rung 4 with its own
 * id (`<step>t`, as the compile names it) and the step's question type; every picture goes through `withMedia`. A
 * teaching step is left out. A step the parse left out (lesson-import's `parseLessonFileLenient`:
 * an unknown family or question type, a missing field) or the kit cannot draw (a family its question
 * type does not take, no data or key, a twin it cannot draw) comes back as a skipped entry with its
 * reason, never a throw, so the page draws a card for it and the rest of the lesson still shows.
 */

import type {
  LessonFile,
  LessonStep,
  QuestionStep,
  SkippedStep,
} from "@jadwigo/lesson-import/file";
import { FAMILIES, type FamilySpec, questionTypeInfo } from "@jadwigo/lesson-kit";
import { mediaUrl, withMedia } from "../../media.ts";

/** A question's family, data and key, as a step or its twin holds them. */
interface Question {
  family: string;
  data?: unknown;
  key?: unknown;
}

/** One question step of a part, in script order: drawn, or skipped with the reason. */
type BuiltStep =
  | {
      kind: "question";
      step_id: string;
      /** Where the step is in the file, `script.parts[p].steps[i]`: a render finding's path. */
      path: string;
      skill_ids: string[];
      spec: FamilySpec;
      /** The step as the draft holds it, for the Data view. */
      source: QuestionStep;
    }
  | { kind: "skipped"; step_id: string; reason: string };

/** A part of the lesson: its steps in order, and the ones the kit draws as specs. */
export interface PartSpecs {
  part: string;
  steps: BuiltStep[];
  specs: FamilySpec[];
}

const isQuestion = (step: LessonStep): step is QuestionStep => "question" in step;

/** Why the kit cannot draw `question` as a `question_type`, or null when it can. */
function unplayable(question_type: string, question: Question, what: string): string | null {
  if (!(FAMILIES as readonly string[]).includes(question.family))
    return `${what}: unknown family ${question.family}`;
  const type = questionTypeInfo(question_type);
  if (type === undefined) return `${what}: unknown question type ${question_type}`;
  if (type.family !== question.family)
    return `${what}: ${question_type} is a ${type.family} question, not ${question.family}`;
  if (question.data === undefined || question.data === null) return `${what}: no data`;
  if (question.key === undefined || question.key === null) return `${what}: no key`;
  return null;
}

/** A twin's id: its step's id and `t`, as lesson-import's compile names the spare question. */
const twinId = (step_id: string): string => `${step_id}t`;

/** A drawn step's twin as a row of its own (dl-a38n.47): its id, its path
 * in the file and its spec, so the render rules and the findings reach it as they reach a step. */
export function twinRow(step: {
  path: string;
  spec: FamilySpec;
}): { step_id: string; path: string; spec: FamilySpec } | null {
  const twin = step.spec.help?.twin;
  if (twin === undefined) return null;
  return { step_id: twin.id, path: `${step.path}.question.help.twin`, spec: twin as FamilySpec };
}

function buildStep(step: QuestionStep, path: string, media: string): BuiltStep {
  const skipped = (reason: string): BuiltStep => ({ kind: "skipped", step_id: step.id, reason });
  const why = unplayable(step.question_type, step.question, `step ${step.id}`);
  if (why !== null) return skipped(why);

  const { twin, ...ladder } = step.question.help ?? {};
  const help: Record<string, unknown> = withMedia(ladder, media);
  if (twin !== undefined) {
    const { say, help: _help, ...question } = twin as Question & { say?: unknown; help?: unknown };
    const twinWhy = unplayable(step.question_type, question, `step ${step.id} twin`);
    if (twinWhy !== null) return skipped(twinWhy);
    help["twin"] = {
      id: twinId(step.id),
      question_type: step.question_type,
      say: typeof say === "string" ? say : "",
      family: question.family,
      data: withMedia(question.data, media),
      key: question.key,
    };
  }
  const spec = {
    id: step.id,
    question_type: step.question_type,
    say: step.say,
    family: step.question.family,
    data: withMedia(step.question.data, media),
    key: step.question.key,
    ...(step.question.help === undefined ? {} : { help }),
  } as FamilySpec;
  return {
    kind: "question",
    step_id: step.id,
    path,
    skill_ids: step.skill_ids,
    spec,
    source: step,
  };
}

/** A step the parse left out, as a card: its id, or its place when it has none, and why. */
const skippedEntry = (part: string, step: SkippedStep): BuiltStep => ({
  kind: "skipped",
  step_id: step.step_id ?? `${part}[${step.index}]`,
  reason: `${step.message} (${step.path})`,
});

/**
 * Each part of `file` with its question steps built, pictures resolved against `media`, and each
 * step `parseLessonFileLenient` left out back at its place in the script as a skipped entry.
 */
export function lessonFileToSpecs(
  file: LessonFile,
  media: string = mediaUrl(),
  skipped: readonly SkippedStep[] = [],
): PartSpecs[] {
  return file.script.parts.map(({ part, steps }, p) => {
    const left = skipped.filter((s) => s.part === p);
    const kept = [...steps];
    const built: BuiltStep[] = [];
    for (let index = 0; index < steps.length + left.length; index += 1) {
      const out = left.find((s) => s.index === index);
      if (out !== undefined) {
        built.push(skippedEntry(part, out));
        continue;
      }
      const step = kept.shift();
      if (step !== undefined && isQuestion(step))
        built.push(buildStep(step, `script.parts[${p}].steps[${index}]`, media));
    }
    return {
      part,
      steps: built,
      specs: built.flatMap((b) => (b.kind === "question" ? [b.spec] : [])),
    };
  });
}
