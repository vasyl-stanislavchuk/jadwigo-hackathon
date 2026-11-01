import { QuestionSource } from "@jadwigo/contracts";

/** What each bank source is, and the credit a borrowed question from it shows (decision dl-gc7yn). */
const SOURCE_INFO: Readonly<Record<QuestionSource, { name: string; credit: string }>> = {
  khan: { name: "Khan Academy's exercises", credit: "z Khan Academy" },
  alfik: { name: "The Alfik Matematyczny contest's tasks", credit: "z Alfika Matematycznego" },
};

/** One row of the question sources table. */
export interface SourceRow {
  readonly source: QuestionSource;
  readonly name: string;
  readonly credit: string;
  /** Where the question's body sits in the content bucket. */
  readonly key: string;
}

/**
 * Every value of `QuestionSource`, in the contract's order. A source with no line in SOURCE_INFO
 * throws, so a new one fails the build until this page says what it is.
 */
export function sourceRows(sources: readonly string[] = QuestionSource.options): SourceRow[] {
  return sources.map((raw) => {
    const source = QuestionSource.parse(raw);
    const info = SOURCE_INFO[source];
    return { source, ...info, key: `questions/${source}/<id>.json` };
  });
}
