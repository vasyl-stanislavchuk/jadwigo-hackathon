import { z } from "zod";

/**
 * The shapes every family shares: the stem above the answer, its pictures and figures, the coins
 * and the rule a key may name. Ported field for field from david-learns
 * `frontend/src/families/{stem/model,figure,money,rules}.ts` and the parts they import.
 */

/** How a number line writes its tick labels. */
export const TickLabelStyle = z.enum(["decimal", "fraction", "mixed", "non-reduced"]);
export type TickLabelStyle = z.infer<typeof TickLabelStyle>;

/** Polish coins and notes, 1 grosz to 200 złotych. The learner sees the coins, never a total. */
export const Denom = z.enum([
  "gr1",
  "gr2",
  "gr5",
  "gr10",
  "gr20",
  "gr50",
  "zl1",
  "zl2",
  "zl5",
  "zl10",
  "zl20",
  "zl50",
  "zl100",
  "zl200",
]);
export type Denom = z.infer<typeof Denom>;

/** The objects a concrete `groups` figure may draw, from the icon library the UI uses. */
export const GroupIcon = z.enum(["apple", "star", "heart", "fish", "flower", "cherry"]);
export type GroupIcon = z.infer<typeof GroupIcon>;

/** A text label over a drawing, at drawing coordinates. `content` is TeX unless `math` is false. */
export const PictureLabel = z.object({
  content: z.string(),
  coordinates: z.tuple([z.number(), z.number()]),
  /** `center`, `above`, `below`, `left`, `right`, or two of them (`above right`). */
  alignment: z.string(),
  math: z.literal(false).optional(),
});
export type PictureLabel = z.infer<typeof PictureLabel>;

/** Labels over a picture: the drawing's coordinate range `[[x0, x1], [y0, y1]]`, and the labels. */
export const PictureLabels = z.object({
  range: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]),
  items: z.array(PictureLabel),
});
export type PictureLabels = z.infer<typeof PictureLabels>;

/**
 * A served picture with its words and size, so the page reserves its box before it loads. The alt
 * never says what to count or the answer; `decorative` (an empty alt on purpose) is for help only.
 */
export const Picture = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number(),
  height: z.number(),
  decorative: z.literal(true).optional(),
  labels: PictureLabels.optional(),
});
export type Picture = z.infer<typeof Picture>;

/** A terminal card: commands and what they print. */
export const TerminalCard = z.object({
  lang: z.literal("bash"),
  copy: z.boolean(),
  lines: z.array(z.object({ cmd: z.string(), out: z.array(z.string()).nullable() })),
});
export type TerminalCard = z.infer<typeof TerminalCard>;

/** A fold-out the learner may open while answering: a reference sheet or a reminder. Ungraded. */
export const StemReference = z.object({
  prompt: z.string(),
  text: z.string(),
});
export type StemReference = z.infer<typeof StemReference>;

/** Clips named by their words, as a lesson file writes them; the loader turns them into `audio`. */
export const AudioText = z.object({
  text: z.string(),
  language: z.string(),
  slow: z.literal(true).optional(),
});
export type AudioText = z.infer<typeof AudioText>;

/**
 * Something to answer about, drawn above the answer and never spoken. It is page data, so it never
 * holds the key, and its alt says what is drawn, never the answer.
 */
export const Figure = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("expression"), text: z.string() }),
  z.object({
    kind: z.literal("number_line"),
    min: z.number(),
    max: z.number(),
    step: z.number(),
    labelled: z.array(z.number()),
    marker: z.number(),
    tick_label: TickLabelStyle.optional(),
  }),
  z.object({ kind: z.literal("dots"), rows: z.number(), cols: z.number(), alt: z.string() }),
  z.object({
    kind: z.literal("groups"),
    groups: z.number(),
    each: z.number(),
    icon: GroupIcon,
    alt: z.string(),
  }),
  z.object({
    kind: z.literal("ruler"),
    picture: Picture,
    unit: z.enum(["cm", "mm"]),
    length: z.number(),
    pixels_per_unit: z.number(),
    ticks: z.number().optional(),
    start: z.number().optional(),
  }),
  z.object({
    kind: z.literal("clock"),
    h: z.number(),
    m: z.number(),
    numbers: z.enum(["arabic", "none"]).optional(),
    alt: z.string(),
  }),
  z.object({ kind: z.literal("coins"), items: z.array(Denom), alt: z.string() }),
  z.object({
    kind: z.literal("fraction_bars"),
    items: z.array(z.object({ n: z.number(), d: z.number() })),
    shape: z.enum(["bar", "circle"]),
    alt: z.string(),
    labels: z.enum(["shown", "none"]).optional(),
  }),
]);
export type Figure = z.infer<typeof Figure>;

/** The question above the answer when `say` is not enough: words, pictures, a figure. */
export const Stem = z.object({
  /** Markdown and TeX as authored. */
  text: z.string().optional(),
  image: z.string().optional(),
  image_alt: z.string().optional(),
  /** The page shows `text` in place of `say`; the voice still reads `say`. */
  text_replaces_say: z.boolean().optional(),
  pictures: z.array(Picture).optional(),
  terminal: TerminalCard.optional(),
  figure: Figure.optional(),
  reference: StemReference.optional(),
  /** Opaque clip ids, a normal one and a slow one, never derived from the words. */
  audio: z.object({ clip: z.string(), slow: z.string().optional() }).optional(),
  audio_text: AudioText.optional(),
});
export type Stem = z.infer<typeof Stem>;

/** An arithmetic operation a rule reads. */
export const Op = z.enum(["add", "sub", "mul", "div"]);
export type Op = z.infer<typeof Op>;

/**
 * The number rule a key may name, to classify a miss the author's `near` table did not list.
 * `recent` is the products a neighbour-fact swap matches.
 */
export const RuleRef = z.discriminatedUnion("rule", [
  z.object({
    rule: z.literal("times_table"),
    a: z.number(),
    b: z.number(),
    recent: z.array(z.number()),
  }),
  z.object({
    rule: z.literal("fill_blank"),
    template: z.string(),
    operands: z.array(z.number()),
    op: Op,
    recent: z.array(z.number()),
  }),
  z.object({
    rule: z.literal("number_line"),
    mode: z.enum(["place", "read"]),
    min: z.number(),
    max: z.number(),
    step: z.number(),
  }),
]);
export type RuleRef = z.infer<typeof RuleRef>;
