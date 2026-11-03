/**
 * The print sheet of a lesson (dl-1eieq.8.1): the whitelist that turns a lesson's planned questions
 * into the `PrintSheet` the print Lambda renders, after the plan on dl-1eieq.8 and decisions dl-7eyqd
 * (the child answers in place, the card is one tick per question), dl-jo99l (each type's paper form
 * in PAPER_FORMS) and dl-o05aa (the API builds this and the Lambda renders it).
 *
 * Only what a sheet names is copied: each question's type, its instruction and its family's page
 * data. Never the key, the help ladder, Choose's `boost`, a twin or any other spare. The result is
 * parsed by `PrintSheet`, whose family data schemas drop a field they do not name, so a field added
 * to a question later cannot reach paper unless the sheet names it.
 */

import {
  type BasedOn,
  type Credit,
  type Language,
  PAPER_FORMS,
  type PageFamilyQuestion,
  type PaperAction,
  PRINT_RENDERER,
  type PrintCredit,
  type PrintLabels,
  PrintQuestion,
  PrintSheet,
  type QuestionType,
} from "@jadwigo/contracts";
import { type CopyKey, copy } from "@jadwigo/copy";
import { paperHtml } from "./text.ts";

/** One question of the lesson, as the compiler or the store gives it; its key and help are ignored. */
export type PrintSource = {
  readonly role: "planned" | "spare";
  readonly question: PageFamilyQuestion & {
    readonly question_type: QuestionType;
    readonly say: string;
    readonly credit: Credit | null;
    readonly based_on: BasedOn | null;
  };
};

export interface PrintInput {
  readonly title: string;
  readonly language: Language;
  /** The lesson's questions in order; spares (twins) are left off the sheet. */
  readonly questions: readonly PrintSource[];
  /** A picture's absolute URL, by the address the lesson wrote. */
  readonly media: (src: string) => string;
}

/** A lesson with no question that has a paper form (every one an `explain`, or none at all). */
export class LessonNotPrintable extends Error {
  constructor(readonly questionTypes: readonly QuestionType[]) {
    super(`no paper form for ${questionTypes.join(", ")}`);
    this.name = "LessonNotPrintable";
  }
}

/** What the child does on paper, per type: the mark on its card and the paper line of its say. */
export const PAPER_ACTIONS = {
  true_false: "circle",
  recognition: "circle",
  lettered_choice: "circle",
  multi_select: "tick",
  mark_numbers: "circle",
  fraction_compare: "circle",
  production: "write",
  short_text: "write",
  expression: "write",
  measure: "write",
  fill_gaps: "write",
  fill_table: "write",
  label_picture: "write",
  column: "write",
  pyramid: "write",
  clock_read: "write",
  money_count: "write",
  order: "number",
  bucket: "join",
  match: "join",
  number_line_place: "draw",
  hotspot: "circle",
  spatial_build: "draw",
  draw_graph: "draw",
  clock_set: "draw",
  money_pay: "circle",
  fraction_shade: "draw",
  area_model: "draw",
  explain: "write",
} as const satisfies Record<QuestionType, PaperAction>;

const DO_KEYS = {
  circle: "print_do_circle",
  tick: "print_do_tick",
  write: "print_do_write",
  draw: "print_do_draw",
  join: "print_do_join",
  number: "print_do_number",
} as const satisfies Record<PaperAction, CopyKey>;

const VERB_KEYS = {
  circle: "print_verb_circle",
  tick: "print_verb_tick",
  write: "print_verb_write",
  draw: "print_verb_draw",
  join: "print_verb_join",
  number: "print_verb_number",
} as const satisfies Record<PaperAction, CopyKey>;

/**
 * A verb that only ever means touching a screen, in either language: tapping, clicking, dragging.
 * Words with an everyday sense too ("przesuń przecinek", "a drop of water", "press") are left out,
 * so a sentence that uses them about the problem prints as written.
 */
export const SCREEN_VERB =
  /(?<!\p{L})(?:dotknij(?:cie)?|kliknij(?:cie)?|stuknij(?:cie)?|przeciągnij(?:cie)?|tap|tapping|click|drag)(?!\p{L})/iu;
const SCREEN_VERBS = new RegExp(SCREEN_VERB.source, "giu");

/**
 * A text for paper: in each sentence a screen verb becomes the type's paper verb and every other
 * word stays, so the criterion the child needs is kept ("Tap the word that rhymes with cat." becomes
 * "Circle the word that rhymes with cat.", "Dotknij 7." becomes "Otocz 7."). A sentence that is the
 * verb alone ("Dotknij!") becomes the type's paper line. A Polish verb that takes the genitive ("Dotknij zegara") keeps its object's
 * case, a small grammar slip chosen over losing the question.
 */
/** What is left of a sentence once its screen verb is gone, if the problem is in it: a letter, a
 * number (½ included), a sign (+ ÷ =), maths or a slot. Only punctuation and spaces mean nothing. */
const PROBLEM = /[\p{L}\p{N}\p{S}$]|\{[a-z][a-z0-9_]*\}/u;

export function paperSay(text: string, action: PaperAction, language: Language): string {
  const line = copy(language, DO_KEYS[action]);
  const verb = copy(language, VERB_KEYS[action]);
  const out: string[] = [];
  for (const sentence of text.split(/(?<=[.!?…])\s+/)) {
    let next = sentence;
    if (SCREEN_VERB.test(sentence))
      next = PROBLEM.test(sentence.replace(SCREEN_VERBS, ""))
        ? sentence.replace(SCREEN_VERBS, (found) =>
            found[0] === found[0]?.toUpperCase()
              ? verb.charAt(0).toUpperCase() + verb.slice(1)
              : verb,
          )
        : line;
    if (next !== out[out.length - 1]) out.push(next);
  }
  return out.join(" ");
}

function labels(language: Language): PrintLabels {
  const c = (key: CopyKey) => copy(language, key);
  return {
    brand: c("print_brand"),
    name: c("print_name"),
    date: c("print_date"),
    page: c("print_page"),
    page_of: c("print_page_of"),
    next: c("print_next"),
    end: c("print_end"),
    legend: {
      circle: c("print_legend_circle"),
      tick: c("print_legend_tick"),
      write: c("print_legend_write"),
      draw: c("print_legend_draw"),
      join: c("print_legend_join"),
      number: c("print_legend_number"),
    },
    true_word: c("print_true"),
    false_word: c("print_false"),
    many: c("print_many"),
    total: c("print_total"),
    hours_hand: c("print_hours_hand"),
    card_title: c("print_card_title"),
    card_note: c("print_card_note"),
    credits_title: c("print_credits_title"),
    alfik_title: c("answer_card"),
    alfik_note: c("answer_card_note"),
    alfik_mark: c("answer_card_example_right"),
    alfik_no_mark: c("answer_card_example_wrong"),
    alfik_change: c("answer_card_fix"),
  };
}

const SOURCE_NAMES: Record<string, string> = { khan: "Khan Academy" };

/** "cc-by-nc-sa-4.0" as people write it, "CC BY-NC-SA 4.0"; any other licence as given. */
function licenceName(licence: string): string {
  const m = /^cc-([a-z-]+)-(\d+\.\d+)$/i.exec(licence.trim());
  return m ? `CC ${(m[1] ?? "").toUpperCase()} ${m[2] ?? ""}` : licence;
}

function creditOf(
  credit: Credit,
  basedOn: BasedOn | null,
  language: Language,
): Omit<PrintCredit, "n"> {
  const licence = licenceName(credit.licence);
  const from =
    credit.source === "alfik"
      ? copy(language, "credit_from_alfik")
      : copy(language, "credit_from", { source: SOURCE_NAMES[credit.source] ?? credit.source });
  const translated = credit.original_lang !== language;
  const adapted = basedOn?.changes.some((c) => c.change !== "tutor_notes") === true;
  const key: CopyKey =
    translated && adapted
      ? "credit_both"
      : translated
        ? "credit_translated"
        : adapted
          ? "credit_adapted"
          : "credit_shared";
  const head = from.charAt(0).toUpperCase() + from.slice(1);
  return {
    short: `${head} · ${licence}`,
    line: `${head}. ${copy(language, key, { licence })}.`,
    url: credit.url ?? null,
  };
}

/** Fields that hold an id, an enum or words no one reads on paper: never rendered as text. */
const NOT_TEXT = new Set([
  "id",
  "kind",
  "select",
  "layout",
  "tokens",
  "input",
  "entry",
  "surface",
  "shape",
  "hands",
  "each_item",
  "cells",
  "split",
  "op",
  "unit",
  "numbers",
  "labels",
  "tick_label",
  "total",
  "letters",
  "simplify",
  "lang",
  "alt",
  "image_alt",
  "icon",
  "bank",
  "items",
]);

/** Every text leaf of a value, and every picture address (`src`, or a string `image`). */
function walk(value: unknown, strings: Set<string>, srcs: Set<string>, key = ""): void {
  if (typeof value === "string") {
    if (key === "src" || key === "image") srcs.add(value);
    else if (!NOT_TEXT.has(key)) strings.add(value);
  } else if (Array.isArray(value)) for (const v of value) walk(v, strings, srcs, key);
  else if (value !== null && typeof value === "object")
    for (const [k, v] of Object.entries(value)) walk(v, strings, srcs, k);
}

/** The `{id}` markers a question's strings may hold: its options (inline choose) or its gaps. */
function slotIds(q: PageFamilyQuestion): ReadonlySet<string> | undefined {
  if (q.family === "choose") return new Set(q.data.options.map((o) => o.id));
  if (q.family === "slots") return new Set(q.data.gaps.map((g) => g.id));
  return undefined;
}

/** The page data a family prints: Choose's without `boost`, every stem's text in paper words. */
function printedData(q: PageFamilyQuestion, action: PaperAction, language: Language) {
  const stemmed = <D extends { stem?: { text?: string | undefined } | undefined }>(data: D): D =>
    data.stem?.text === undefined
      ? data
      : { ...data, stem: { ...data.stem, text: paperSay(data.stem.text, action, language) } };
  switch (q.family) {
    case "choose": {
      const { boost: _hint, ...data } = q.data;
      return { family: q.family, data: stemmed(data) } as const;
    }
    case "enter":
      return { family: q.family, data: stemmed(q.data) } as const;
    case "slots":
      return { family: q.family, data: stemmed(q.data) } as const;
    case "sequence":
      return { family: q.family, data: stemmed(q.data) } as const;
    case "group":
      return { family: q.family, data: stemmed(q.data) } as const;
    case "place":
      return { family: q.family, data: stemmed(q.data) } as const;
    case "explain":
      return null;
  }
}

/**
 * The lesson as a print sheet, numbered 1 to n over the questions that print. Refuses a lesson
 * with none, naming its types, so the parent hears why before anything renders.
 */
export function buildPrintSheet(input: PrintInput): PrintSheet {
  const { language } = input;
  // A type with no paper form (explain) is left off, as the player never asks it in v0
  // (apps/api/src/page.ts); a lesson with nothing else is refused.
  const all = input.questions.filter((s) => s.role === "planned").map((s) => s.question);
  const planned = all.filter((q) => PAPER_FORMS[q.question_type] !== "no");
  if (planned.length === 0)
    throw new LessonNotPrintable([...new Set(all.map((q) => q.question_type))]);

  const credits: PrintCredit[] = [];
  const creditN = new Map<string, number>();
  const html: Record<string, string> = {};
  const srcs = new Set<string>();
  const render = (text: string, slots?: ReadonlySet<string>) => {
    if (html[text] !== undefined) return;
    html[text] = paperHtml(text, {
      language,
      slots,
      media: (src) => {
        srcs.add(src);
        return input.media(src);
      },
    });
  };
  // One string is one entry, so it is drawn with every slot id the lesson's questions use: the
  // same words in two questions, or in the title, draw their slots the same way.
  const slots = new Set(planned.flatMap((q) => [...(slotIds(q) ?? [])]));
  render(input.title, slots);

  const questions: PrintQuestion[] = planned.map((q, i) => {
    const paper = PAPER_FORMS[q.question_type];
    const action = PAPER_ACTIONS[q.question_type];
    const printed = printedData(q, action, language);
    if (printed === null || paper === "no") throw new LessonNotPrintable([q.question_type]);
    let credit_n: number | null = null;
    if (q.credit !== null) {
      const id = q.credit.url ?? `${q.credit.source}:${q.credit.ref}`;
      credit_n = creditN.get(id) ?? credits.length + 1;
      if (!creditN.has(id)) {
        creditN.set(id, credit_n);
        credits.push({ n: credit_n, ...creditOf(q.credit, q.based_on, language) });
      }
    }
    // Parsed before anything is read from it: the family schema drops what the sheet does not name.
    const question = PrintQuestion.parse({
      n: i + 1,
      question_type: q.question_type,
      paper,
      action,
      say: paperSay(q.say, action, language),
      credit_n,
      ...printed,
    });
    const strings = new Set<string>([question.say]);
    walk(question.data, strings, srcs);
    for (const text of strings) render(text, slots);
    return question;
  });

  const media: Record<string, string> = {};
  for (const src of srcs) media[src] = input.media(src);
  const allLettered = planned.every((q) => q.question_type === "lettered_choice");
  return PrintSheet.parse({
    renderer: PRINT_RENDERER,
    language,
    title: input.title,
    labels: labels(language),
    card: allLettered ? "alfik" : "ticks",
    questions,
    credits,
    html,
    media,
  });
}
