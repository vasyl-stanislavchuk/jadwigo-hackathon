import { z } from "zod";
import { Picture, PictureLabels, Stem } from "./stem.ts";

/**
 * Choose: the learner picks one option, or several. Options carry ids, so the page may show them
 * in any order and a stored answer keeps its meaning. Ported from david-learns
 * `frontend/src/families/choose/model.ts`.
 */

/** What an option shows. `none` is "none of these", always last and alone when picked. */
export const OptionContent = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string() }),
  z.object({ kind: z.literal("number"), number: z.number() }),
  z.object({ kind: z.literal("bool"), bool: z.boolean() }),
  z.object({ kind: z.literal("array"), rows: z.number(), cols: z.number() }),
  z.object({
    kind: z.literal("image"),
    image: z.string(),
    alt: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    labels: PictureLabels.optional(),
  }),
  z.object({ kind: z.literal("pictures"), pictures: z.array(Picture) }),
  z.object({ kind: z.literal("none") }),
]);
export type OptionContent = z.infer<typeof OptionContent>;

/** One option. `letter` is the printed A to E when the layout is `lettered`. */
export const ChooseOption = z.object({
  id: z.string(),
  content: OptionContent,
  letter: z.string().optional(),
});
export type ChooseOption = z.infer<typeof ChooseOption>;

/**
 * The options and how they are drawn. `inline` draws no list: `stem.text` holds an `{oN}` marker
 * where each option sits. `line` holds one `{pick}` marker where the picked option shows.
 */
export const ChooseData = z.object({
  stem: Stem.optional(),
  options: z.array(ChooseOption),
  select: z.enum(["one", "many"]),
  layout: z.enum(["list", "grid", "binary", "lettered", "inline"]),
  /** Inline only: `words` makes every word tappable too, kept as `w:<n>` and never judged. */
  tokens: z.enum(["marked", "words"]).optional(),
  line: z.string().optional(),
  boost: z.string().optional(),
});
export type ChooseData = z.infer<typeof ChooseData>;

/** The option ids picked. */
export const ChooseValue = z.strictObject({
  chosen: z.array(z.string()),
});
export type ChooseValue = z.infer<typeof ChooseValue>;

/** The correct ids, and the mistake each distractor was built from, by option id. */
export const ChooseKey = z.object({
  correct: z.array(z.string()),
  near: z.record(z.string(), z.string()).optional(),
  worked_solution: z.array(z.string()).optional(),
  /** Why "none of these" is correct, said after the praise; in the key so the page never holds it. */
  why: z.string().optional(),
});
export type ChooseKey = z.infer<typeof ChooseKey>;
