import golden from "./golden.json" with { type: "json" };

/**
 * The playground's golden judge corpus, synced with its provenance by `dl-e8ov.2.32.4`
 * (`PROVENANCE.md`): every row `familyGolden.test.ts` judges in david-learns, resolved to its family
 * question and family value, with the verdict the playground holds its judges to. Plain JSON, so
 * this package needs no contracts; `packages/core` parses each question before judging it.
 */

/** A question as a lesson question holds it: its type, family, data and key. */
interface GoldenQuestion {
  question_type: string;
  family: string;
  data: unknown;
  key: unknown;
}

export interface GoldenCase {
  /** `golden`: a row of `sim/golden.json`; `scenario`: a candidate lesson's scenario. */
  source: "golden" | "scenario";
  /** `<lesson>/<step>` in the playground. */
  question_id: string;
  question: GoldenQuestion;
  /** The family value the page commits, or `{invalid: x}` for a value no family value fits. */
  value: unknown;
  correct: boolean;
  mistake_class: string | null;
}

interface GoldenFile {
  questions: Record<string, GoldenQuestion>;
  cases: {
    source: GoldenCase["source"];
    question: string;
    value: unknown;
    correct: boolean;
    mistake_class: string | null;
  }[];
}

// An import, not a file read: the dom project loads this package too, where import.meta.url is not
// a file URL.
const file = golden as GoldenFile;

export const GOLDEN_CASES: readonly GoldenCase[] = file.cases.map(({ question, ...row }) => {
  const resolved = file.questions[question];
  if (resolved === undefined) throw new Error(`golden.json: no question ${question}`);
  return { ...row, question_id: question, question: resolved };
});
