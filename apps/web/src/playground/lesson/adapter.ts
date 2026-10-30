/**
 * A lesson file as the builder draws it (dl-a38n.1): each part's question steps as `FamilySpec`s,
 * the way `specOf` (panels/question.ts) makes one from a written example. A question step keeps
 * its id, say, question type, family, data, key and help; its twin becomes help rung 4 with its own
 * id (`<step>-twin`) and the step's question type; every picture goes through `withMedia`. A
 * teaching step is left out. A step the kit cannot draw (an unknown family or question type, a
 * family its question type does not take, no data or key) comes back as a skipped entry with its
 * reason, never a throw, so the page draws a card for it and the rest of the lesson still shows.
 */

import { FAMILIES, type FamilySpec, questionTypeInfo } from "@jadwigo/lesson-kit";
import { mediaUrl, withMedia } from "../../media.ts";

// The parsed lesson file's shape, typed here until lesson-import exports `parseLessonFile` and its
// types from a browser-safe entry (dl-a38n.11); packages/lesson-import/src/lesson-file.ts is the
// reference. Read after the parse has put every line in the lesson's language.

/** A question as the file holds it: its family's data and key, and the ladder with the twin. */
interface FileQuestion {
  family: string;
  data?: unknown;
  key?: unknown;
  help?: Record<string, unknown> | undefined;
}

interface FileQuestionStep {
  id: string;
  question_type: string;
  skill_ids: string[];
  say: string;
  question: FileQuestion;
}

interface FileTeachingStep {
  id: string;
  teach: Record<string, unknown>;
}

/** A lesson file in its own language, as `parseLessonFile` returns it. */
export interface DraftLessonFile {
  id: string;
  title: string;
  language: string;
  script: { parts: { part: string; steps: (FileTeachingStep | FileQuestionStep)[] }[] };
}

/** One question step of a part, in script order: drawn, or skipped with the reason. */
type BuiltStep =
  | { kind: "question"; step_id: string; skill_ids: string[]; spec: FamilySpec }
  | { kind: "skipped"; step_id: string; reason: string };

/** A part of the lesson: its steps in order, and the ones the kit draws as specs. */
export interface PartSpecs {
  part: string;
  steps: BuiltStep[];
  specs: FamilySpec[];
}

const isQuestion = (step: FileTeachingStep | FileQuestionStep): step is FileQuestionStep =>
  "question" in step;

/** Why the kit cannot draw `question` as a `question_type`, or null when it can. */
function unplayable(question_type: string, question: FileQuestion, what: string): string | null {
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

function buildStep(step: FileQuestionStep, media: string): BuiltStep {
  const skipped = (reason: string): BuiltStep => ({ kind: "skipped", step_id: step.id, reason });
  const why = unplayable(step.question_type, step.question, `step ${step.id}`);
  if (why !== null) return skipped(why);

  const { twin, ...ladder } = step.question.help ?? {};
  const help: Record<string, unknown> = withMedia(ladder, media);
  if (twin !== undefined) {
    const { say, help: _help, ...question } = twin as FileQuestion & { say?: unknown };
    const twinWhy = unplayable(step.question_type, question, `step ${step.id} twin`);
    if (twinWhy !== null) return skipped(twinWhy);
    help["twin"] = {
      id: `${step.id}-twin`,
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
  return { kind: "question", step_id: step.id, skill_ids: step.skill_ids, spec };
}

/** Each part of `file` with its question steps built; pictures resolved against `media`. */
export function lessonFileToSpecs(file: DraftLessonFile, media: string = mediaUrl()): PartSpecs[] {
  return file.script.parts.map(({ part, steps }) => {
    const built = steps.filter(isQuestion).map((s) => buildStep(s, media));
    return {
      part,
      steps: built,
      specs: built.flatMap((b) => (b.kind === "question" ? [b.spec] : [])),
    };
  });
}
