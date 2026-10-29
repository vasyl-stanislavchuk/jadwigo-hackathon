import {
  ErrorType,
  type Language,
  type LessonQuestion,
  type LessonQuestionId,
  QuestionType,
  valueFor,
} from "@jadwigo/contracts";
import { type ExampleWithQuestions, type NewLessonQuestionExample, StoreError } from "./store.ts";

function refuse(message: string): never {
  throw new StoreError(ErrorType.enum.BadRequest, message);
}

/**
 * The rules `replaceExamples` keeps in both stores, checked before anything is written. A
 * question or twin `questionOf` cannot find is `NotFound`.
 */
export function checkExamples(
  language: Language,
  examples: readonly NewLessonQuestionExample[],
  questionOf: (id: LessonQuestionId) => LessonQuestion | undefined,
): void {
  const slugs = new Set<string>();
  const questions = new Set<string>();
  for (const example of examples) {
    if (example.language !== language) refuse(`an example in ${example.language}, not ${language}`);
    const question = questionOf(example.lesson_question_id);
    if (!question) throw new StoreError(ErrorType.enum.NotFound, "the example's question");
    if (questions.has(question.id)) refuse("a question is one example, once");
    questions.add(question.id);
    const slug = `${question.question_type}/${example.slug}`;
    if (slugs.has(slug)) refuse(`the slug ${slug} is taken`);
    slugs.add(slug);
    if (example.twin !== null) {
      const twin = questionOf(example.twin);
      if (!twin) throw new StoreError(ErrorType.enum.NotFound, "the example's twin");
      if (twin.twin_of !== question.id) refuse("an example's twin is a twin of its question");
    }
    const value = valueFor(question.family);
    if (example.scenarios.some((s) => !value.safeParse(s.value).success)) {
      refuse(`a scenario of ${slug} is not a ${question.family} value`);
    }
  }
}

const TYPE_ORDER = new Map(QuestionType.options.map((t, i) => [t, i]));

/** `listExamples`' order in both stores: question type as declared, position, then slug. */
export function byTypeThenPosition(a: ExampleWithQuestions, b: ExampleWithQuestions): number {
  return (
    (TYPE_ORDER.get(a.question.question_type) ?? 0) -
      (TYPE_ORDER.get(b.question.question_type) ?? 0) ||
    a.example.position - b.example.position ||
    (a.example.slug < b.example.slug ? -1 : a.example.slug > b.example.slug ? 1 : 0)
  );
}
