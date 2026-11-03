import { z } from "zod";
import { ChooseData } from "./families/choose.ts";
import { EnterData } from "./families/enter.ts";
import { GroupData } from "./families/group.ts";
import { QuestionType } from "./families/index.ts";
import { PlaceData } from "./families/place.ts";
import { SequenceData } from "./families/sequence.ts";
import { SlotsData } from "./families/slots.ts";
import { Language } from "./records.ts";
import { LIMITS } from "./wire.ts";

/**
 * The print sheet (dl-1eieq.8.1): what the API hands the print Lambda (apps/print) to render a
 * lesson as a PDF, after decisions dl-7eyqd (answer in place), dl-jo99l (a paper form per type)
 * and dl-o05aa (the async print route). It is a whitelist: a question's page-safe data and nothing
 * else, so no key, help, hint, boost, near-miss or twin can reach paper. Every object here is
 * strict, and the family data schemas drop any field they do not name when the sheet is parsed.
 */

/** Whether a question type prints as on screen, in a paper form of its own, or not at all. */
export const PaperForm = z.enum(["yes", "adapted", "no"]);
export type PaperForm = z.infer<typeof PaperForm>;

/**
 * Each question type's paper form, the one place it is declared (decision dl-jo99l). `explain` is
 * never asked in a lesson, so it has none; every other type has a paper form the plan on dl-1eieq.8
 * describes.
 */
export const PAPER_FORMS = {
  true_false: "adapted",
  recognition: "adapted",
  lettered_choice: "yes",
  multi_select: "adapted",
  mark_numbers: "adapted",
  fraction_compare: "yes",
  production: "adapted",
  short_text: "adapted",
  expression: "adapted",
  measure: "adapted",
  fill_gaps: "adapted",
  fill_table: "adapted",
  label_picture: "adapted",
  column: "yes",
  pyramid: "yes",
  clock_read: "yes",
  money_count: "yes",
  order: "adapted",
  bucket: "adapted",
  match: "adapted",
  number_line_place: "adapted",
  hotspot: "adapted",
  spatial_build: "adapted",
  draw_graph: "adapted",
  clock_set: "adapted",
  money_pay: "adapted",
  fraction_shade: "adapted",
  area_model: "adapted",
  explain: "no",
} as const satisfies Record<QuestionType, PaperForm>;

/**
 * What the child does with a pencil, shown as one mark on every card: circle one, tick the
 * squares that fit, write, draw or colour, join with a line, number the order.
 */
export const PaperAction = z.enum(["circle", "tick", "write", "draw", "join", "number"]);
export type PaperAction = z.infer<typeof PaperAction>;

/** The version of the sheet and its templates; a new one makes a new PDF for the same lesson. */
export const PRINT_RENDERER = 1;

/** Choose's page data without `boost`, the hint the page shows after a miss. */
export const PrintChooseData = ChooseData.omit({ boost: true });
export type PrintChooseData = z.infer<typeof PrintChooseData>;

const PrintedFields = {
  /** The question's number on paper, 1 to n in lesson order. */
  n: z.int().min(1).max(LIMITS.questionsPerLesson),
  question_type: QuestionType,
  paper: z.enum(["yes", "adapted"]),
  action: PaperAction,
  /** The instruction, with any screen verb ("tap", "drag") already turned into a paper one. */
  say: z.string(),
  /** The question's line in `PrintSheet.credits`, for a borrowed question. */
  credit_n: z.int().min(1).nullable(),
};

/** One question as it prints: the page's data for its family, never the key or the help. */
export const PrintQuestion = z.discriminatedUnion("family", [
  z.strictObject({ ...PrintedFields, family: z.literal("choose"), data: PrintChooseData }),
  z.strictObject({ ...PrintedFields, family: z.literal("enter"), data: EnterData }),
  z.strictObject({ ...PrintedFields, family: z.literal("slots"), data: SlotsData }),
  z.strictObject({ ...PrintedFields, family: z.literal("sequence"), data: SequenceData }),
  z.strictObject({ ...PrintedFields, family: z.literal("group"), data: GroupData }),
  z.strictObject({ ...PrintedFields, family: z.literal("place"), data: PlaceData }),
]);
export type PrintQuestion = z.infer<typeof PrintQuestion>;

/** A borrowed question's credit: `short` prints on its card, `line` once in the list at the end. */
export const PrintCredit = z.strictObject({
  n: z.int().min(1),
  short: z.string().min(1),
  line: z.string().min(1),
  url: z.url().nullable(),
});
export type PrintCredit = z.infer<typeof PrintCredit>;

/** Every word the sheet prints that is not the lesson's own, in the lesson's language. */
export const PrintLabels = z.strictObject({
  brand: z.string(),
  name: z.string(),
  date: z.string(),
  page: z.string(),
  page_of: z.string(),
  next: z.string(),
  end: z.string(),
  legend: z.strictObject({
    circle: z.string(),
    tick: z.string(),
    write: z.string(),
    draw: z.string(),
    join: z.string(),
    number: z.string(),
  }),
  true_word: z.string(),
  false_word: z.string(),
  many: z.string(),
  total: z.string(),
  hours_hand: z.string(),
  card_title: z.string(),
  card_note: z.string(),
  credits_title: z.string(),
  alfik_note: z.string(),
  alfik_mark: z.string(),
  alfik_no_mark: z.string(),
  alfik_change: z.string(),
  alfik_title: z.string(),
});
export type PrintLabels = z.infer<typeof PrintLabels>;

/**
 * The whole sheet. `html` holds each lesson string the sheet prints as safe HTML, keyed by the
 * string itself: light markdown and TeX are drawn by the builder (numbers and signs as text, other
 * maths by KaTeX), so the Lambda only looks a string up and escapes one it cannot find. `media`
 * holds each picture's absolute URL by its `src`; the Lambda fetches nothing else. `card` is the
 * answer card: `ticks` (one square per question) or `alfik` (A to E circles, a lettered lesson).
 */
export const PrintSheet = z.strictObject({
  renderer: z.literal(PRINT_RENDERER),
  language: Language,
  title: z.string().min(1),
  labels: PrintLabels,
  card: z.enum(["ticks", "alfik"]),
  questions: z.array(PrintQuestion).min(1).max(LIMITS.questionsPerLesson),
  credits: z.array(PrintCredit),
  html: z.record(z.string(), z.string()),
  media: z.record(z.string(), z.url()),
});
export type PrintSheet = z.infer<typeof PrintSheet>;

/** A print's id: the sha256 of its sheet, so the same lesson prints once and is read back. */
export const PrintId = z.string().regex(/^[0-9a-f]{64}$/, "a print id is 64 hex digits");
export type PrintId = z.infer<typeof PrintId>;

/** `POST /api/v1/conversations/{id}/prints`: the revision the parent saw; left out, the latest. */
export const PrintStart = z.strictObject({ revision: z.int().min(1).optional() });
export type PrintStart = z.infer<typeof PrintStart>;

/** Why a print could not be made: the sheet failed to render, or a picture could not be fetched. */
export const PrintFailure = z.enum(["render_failed", "picture_unavailable", "bad_sheet"]);
export type PrintFailure = z.infer<typeof PrintFailure>;

/**
 * Where a print stands (decision dl-o05aa): `pending` while the print Lambda renders it, `ready`
 * with a link that reads the PDF until `expires_at`, `failed` with the reason.
 */
export const PrintStatus = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("pending"), print_id: PrintId }),
  z.strictObject({
    status: z.literal("ready"),
    print_id: PrintId,
    url: z.url(),
    expires_at: z.iso.datetime(),
  }),
  z.strictObject({ status: z.literal("failed"), print_id: PrintId, reason: PrintFailure }),
]);
export type PrintStatus = z.infer<typeof PrintStatus>;
