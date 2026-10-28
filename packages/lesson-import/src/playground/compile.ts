import {
  type ExampleScenario,
  FamilyQuestion,
  Help,
  type LessonQuestionId,
  type PodId,
  QUESTION_TYPE_FAMILY,
} from "@jadwigo/contracts";
import type { NewLessonQuestion, NewLessonQuestionExample } from "@jadwigo/store";
import { contentHash, strictly } from "../compile.ts";
import { FEATURED_POD, lessonQuestionIdFor } from "../ids.ts";
import { type ExampleLanguage, resolve } from "./localize.ts";
import type { WrittenExample, WrittenQuestion } from "./types.ts";

type Question = NewLessonQuestion & { readonly id: LessonQuestionId };

/** What the seed writes for one language: the questions first (twins after theirs), then the examples. */
export interface CompiledExamples {
  readonly language: ExampleLanguage;
  readonly questions: readonly Question[];
  readonly examples: readonly NewLessonQuestionExample[];
}

/**
 * A written question in one language as a lesson question, checked against the contracts. The
 * examples name no subject or skill: every one is written as `math` with no skill ids, which the
 * playground never reads. `based_on` names the example, `authored:playground/<type>/<slug>`.
 */
function question(
  pod: PodId,
  written: WrittenQuestion,
  language: ExampleLanguage,
  name: { readonly file: string; readonly step: string },
  links: Pick<NewLessonQuestion, "twin_of" | "based_on">,
): Question {
  const at = `playground example ${name.file}/${name.step}`;
  const q = resolve<WrittenQuestion>(written, language);
  if (QUESTION_TYPE_FAMILY[q.question_type] !== q.family) {
    throw new Error(`${at}: ${q.question_type} is not a ${q.family} question`);
  }
  const family = strictly(FamilyQuestion, { family: q.family, data: q.data, key: q.key }, at);
  const body = {
    ...family,
    question_type: q.question_type,
    say: q.say as string,
    help: strictly(Help, q.help ?? {}, `${at} help`),
    credit: null,
    subject: "math",
    grade: null,
    skill_ids: [],
    ...links,
  } as Omit<NewLessonQuestion, "id" | "content_hash">;
  const content_hash = contentHash(body);
  return {
    ...body,
    content_hash,
    id: lessonQuestionIdFor(pod, name.file, name.step, content_hash),
  } as Question;
}

/**
 * Compiles the written examples into one language's rows. Each type's examples are numbered from
 * 1 with the showcase first. Question ids are named `question/playground/<type>/<language>/<slug>`
 * and the content hash (a twin's step ends `t`), so a re-seed hits the same rows until one is edited.
 */
export function compileExamples(
  written: readonly WrittenExample[],
  language: ExampleLanguage,
  pod: PodId = FEATURED_POD.id,
): CompiledExamples {
  const questions: Question[] = [];
  const examples: NewLessonQuestionExample[] = [];
  const positions = new Map<string, number>();
  const ordered = [
    ...written.filter((e) => e.showcase === true),
    ...written.filter((e) => e.showcase !== true),
  ];
  for (const example of ordered) {
    const type = example.question.question_type;
    const file = `playground/${type}/${language}`;
    const main = question(
      pod,
      example.question,
      language,
      { file, step: example.id },
      {
        twin_of: null,
        based_on: { question: `authored:playground/${type}/${example.id}`, changes: [] },
      },
    );
    questions.push(main);
    const twin =
      example.twin === undefined
        ? null
        : question(
            pod,
            example.twin,
            language,
            { file, step: `${example.id}t` },
            {
              twin_of: main.id,
              based_on: null,
            },
          );
    if (twin) questions.push(twin);
    const position = (positions.get(type) ?? 0) + 1;
    positions.set(type, position);
    examples.push({
      lesson_question_id: main.id,
      twin: twin?.id ?? null,
      language,
      slug: example.id,
      position,
      label: example.label,
      showcase: example.showcase === true,
      scenarios: example.scenarios
        .filter((s) => s.only === undefined || s.only.includes(language))
        .map(
          (s): ExampleScenario => ({
            try: resolve<string>(s.try, language),
            value: resolve(s.value, language),
            outcome: s.outcome,
            mistake_class: s.mistake_class,
            marks: s.marks,
          }),
        ),
    });
  }
  return { language, questions, examples };
}
