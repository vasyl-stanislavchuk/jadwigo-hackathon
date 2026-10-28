import { z } from "zod";
import { Picture } from "./stem.ts";

/**
 * The help ladder on a question, held with the key: the server releases it one rung at a time.
 * Ported from david-learns `frontend/src/families/help.ts` (its StepHelp), without `twin`: a twin
 * is its own lesson question in the database.
 */

/** A picture on a help card: a served image, or dots in rows. */
export const HelpPicture = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("image"),
    src: z.string(),
    alt: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  z.object({ kind: z.literal("dots"), rows: z.number(), cols: z.number(), alt: z.string() }),
]);
export type HelpPicture = z.infer<typeof HelpPicture>;

/** One rung's card. `focus` (rung 1 only) names the parts to outline, never what is correct. */
export const HelpCard = z.object({
  text: z.string(),
  picture: HelpPicture.optional(),
  focus: z.array(z.string()).optional(),
});
export type HelpCard = z.infer<typeof HelpCard>;

/** One of Khan's ordered cards: its words and the pictures it carried. */
export const HintCard = z.object({
  text: z.string(),
  pictures: z.array(Picture).optional(),
});
export type HintCard = z.infer<typeof HintCard>;

/**
 * The ladder: look, boost (or the boost for the last miss's class), almost, worked. Khan's
 * questions bring `hints` instead, first to last, the last one the answer.
 */
export const Help = z.object({
  hints: z.array(HintCard).optional(),
  look: HelpCard.optional(),
  boost: HelpCard.optional(),
  boost_by_mistake: z.record(z.string(), HelpCard).optional(),
  /** Rung 2: the parts given away, by id; the server reads their answer from the key. */
  give: z.array(z.string()).optional(),
  /** The worked solution, one line each; rung 3 leaves the last line blank. */
  worked: z.array(z.string()).optional(),
  /** Rung 3 as written, its last line left open; absent, it is `worked` without its last line. */
  almost: z.array(z.string()).optional(),
});
export type Help = z.infer<typeof Help>;
