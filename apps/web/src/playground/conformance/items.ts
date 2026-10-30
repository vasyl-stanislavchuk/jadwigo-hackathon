/**
 * The bank's converted items as the conformance page reads them (dl-a38n.31): the file the Polish
 * conversion writes (`converted-pl.json`, jw's JW_KHAN_CONVERTED, never in git), handed to the page
 * by `tools/conformance/run.ts` at ITEMS_PATH. Each item that plays becomes one question step of a
 * lesson file, so it goes through the same lenient parse and adapter as a draft does.
 */

/** Where the runner serves the items file to the page (Playwright's page.route; no dev plugin). */
export const ITEMS_PATH = "/@conformance/items.json";

/** One converted item: only what this page reads. */
export interface ConvertedItem {
  readonly id: string;
  /** The Khan exercise; the bank writes one set per exercise, `set_khan_<exercise>`. */
  readonly exercise?: string;
  readonly problem_type?: string;
  readonly spec?: null | {
    readonly family?: unknown;
    readonly question_type?: unknown;
    readonly say?: unknown;
    readonly data?: unknown;
    readonly key?: unknown;
    readonly help?: unknown;
  };
}

/** The set an item serves, as the bank names it (jadwigo-bank tools/build_sets.py). */
export function setIdOf(item: ConvertedItem): string | null {
  return item.exercise ? `set_khan_${item.exercise}` : null;
}

/** The items file's items, or none when the file holds no list. */
export function itemsOf(file: unknown): ConvertedItem[] {
  const items = (file as { items?: unknown } | null)?.items;
  return Array.isArray(items)
    ? items.filter(
        (i): i is ConvertedItem =>
          i !== null && typeof i === "object" && typeof (i as { id?: unknown }).id === "string",
      )
    : [];
}

/** An item that plays: the conversion left it a family step. A waiting item has none. */
export const plays = (item: ConvertedItem): boolean => {
  const spec: unknown = item.spec;
  return (
    spec !== null && typeof spec === "object" && "family" in spec && "data" in spec && "key" in spec
  );
};

/**
 * The items as one lesson file, one question step each under the item's id, in the lesson's
 * language: what `parseLessonFileLenient` and `lessonFileToSpecs` take from a draft.
 */
export function lessonFileOf(items: readonly ConvertedItem[]): unknown {
  return {
    id: "conformance",
    title: "Conformance",
    language: "pl",
    category: "child",
    subject: "math",
    reasoning: "",
    script: {
      parts: [
        {
          part: "conformance",
          steps: items.map((item) => ({
            id: item.id,
            question_type: item.spec?.question_type,
            skill_ids: [],
            based_on: null,
            say: typeof item.spec?.say === "string" ? item.spec.say : "",
            question: {
              family: item.spec?.family,
              data: item.spec?.data,
              key: item.spec?.key,
              ...(item.spec?.help === undefined ? {} : { help: item.spec.help }),
            },
          })),
        },
      ],
    },
  };
}
