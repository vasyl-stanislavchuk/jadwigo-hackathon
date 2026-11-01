// The site's words beyond each page's frontmatter: one entry per section, read from
// src/content/<lang>/landing.yaml so a native speaker edits words, not markup. Each language's
// file has the same shape (dl-w0b4.81), and its index page's `reviewed` flag
// (src/content/<lang>/index.md) covers these words too.
import { LANGUAGE_CODES, type Language } from "@jadwigo/config";
import { z } from "astro/zod";
import { providerUrl } from "../index.ts";
import type { DistCheck } from "./dist.ts";
import { twinPath } from "./i18n.ts";

const text = z.string().min(1);
const item = z.object({ title: text, text });
/** A page built from these words: its head and its h1. */
const head = { title: text, description: text, heading: text };

export const landingSchema = z.object({
  // The hero's question (owner, 2026-10-31): one question, answered on the page.
  hero: z.object({
    question: z
      .object({
        // Above the question: what kind it is, the grade and its place (design handoff "landing 3").
        label: text,
        say: text,
        // The illustration slot beside the question, until its art exists (owner, 2026-11-01).
        pic: text,
        // Where the question comes from: every question shows its source.
        source: text,
        choices: z.array(text).min(2).max(4),
        answer: text,
        right: text,
        hint: text,
        // After a right answer and Jadwiga's clip: the invitation to a parent account (/zaloguj).
        // `again` turns the sheet back to the question.
        signUp: z.object({ text, button: text, again: text }),
      })
      .refine((q) => q.choices.includes(q.answer), {
        message: "answer must be one of the choices",
      }),
  }),
  after: z.object({ text, link: text }),
  links: z.array(z.object({ href: z.string().regex(/^(\/[a-z0-9-]+)+$/), label: text })).min(1),
  // /jak-to-dziala in direction 1a (design handoff "landing 3"): the intro over a wide illustration,
  // then 3 steps, each with who acts. Step 1 shows the parent's request and the build lines beside a
  // screencast, step 2 a question card over an illustration, step 3 the lesson's counts beside a screencast.
  steps: z.object({
    ...head,
    intro: text,
    pic: text,
    items: z.array(z.object({ who: text, title: text, text })).length(3),
    request: z.object({ ask: text, lines: z.array(text).min(1), soon: text, screencast: text }),
    card: z
      .object({ say: text, choices: z.array(text).min(2).max(4), hint: text, pic: text })
      .refine((c) => new Set(c.choices).size === c.choices.length, {
        message: "choices must differ",
      }),
    record: z.object({
      counts: z.array(z.object({ value: z.int().min(0), label: text })).length(3),
      nextLabel: text,
      next: text,
      screencast: text,
    }),
  }),
  promises: z.object({ heading: text, items: z.array(item).min(1) }),
  // Direction 1a, "Partner" (owner, 2026-11-01): learning the parent is close to, beside a made-up
  // child's profile as the parent app shows it. Goals and skill dots, never a score or a percentage.
  partner: z.object({
    heading: text,
    text,
    pic: text,
    child: z.object({ initial: text, name: text, sub: text }),
    practising: text,
    allDone: text,
    nextUp: text,
    states: z.object({ done: text, now: text, next: text }),
    goals: z
      .array(
        z.object({
          name: text,
          skills: z.array(z.object({ name: text, state: z.enum(["done", "now", "next"]) })).min(1),
        }),
      )
      .min(1),
    nextLabel: text,
    next: text,
  }),
  // The end of the landing page and /jak-to-dziala: one line for the parent and the sign-up.
  end: z.object({ text, button: text }),
  lessons: z.object({
    ...head,
    text,
    // Shown in place of the cards while a language has no featured lessons (dl-w0b4.85).
    empty: text,
    play: text,
    all: text,
    subjects: z.object({ math: text, polish: text, english: text }),
    grade: text,
    questions: z.tuple([text, text, text]),
    // /lekcje's heading over the lessons with no grade, after the grades' groups (dl-w0b4.108).
    other: text,
    // The landing page's row: its heading, the grade tabs ("Klasa 1"), the subject filter while
    // there is more than one subject, the count and the arrows.
    row: z.object({
      heading: text,
      gradeLabel: text,
      subjectLabel: text,
      allSubjects: text,
      count: z.tuple([text, text, text]),
      prev: text,
      next: text,
      // Shown when a filter leaves no lesson.
      none: text,
      pic: text,
    }),
  }),
  compare: z.object({
    ...head,
    text,
    columns: z.tuple([text, text, text]),
    source: text,
    rows: z.array(z.object({ app: text, around: text, jadwigo: text, source: z.url() })).min(1),
  }),
  signIn: z.object({
    ...head,
    lead: text,
    email: text,
    send: text,
    note: text,
    or: text,
    google: text,
    facebook: text,
  }),
});

/**
 * A count with its noun. Polish has 3 forms: 1 pytanie, 2–4 (not 12–14) pytania, else pytań. English
 * uses the first for 1 and the second for every other count ("1 question", "5 questions").
 */
export function plural(
  n: number,
  [one, few, many]: readonly [string, string, string],
  lang: "pl" | "en" = "pl",
): string {
  if (n === 1) return `${n} ${one}`;
  if (lang === "en") return `${n} ${few}`;
  const tens = n % 100;
  const units = n % 10;
  return `${n} ${units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many}`;
}

/** The first sentence of a spoken line, for a card's teaser: "Ile to jest 2 razy 7?" */
export const firstSentence = (line: string): string => line.match(/^.*?[?.!](?=\s|$)/)?.[0] ?? line;

type Skill = { name: string; state: "done" | "now" | "next" };

/**
 * A goal's second line on the profile: the skill being practised now, or, when every skill before
 * the next is done, the next one. "Ćwiczy: Rz po spółgłoskach" / "Umie wszystko. Dalej: Daty…".
 */
export function goalLine(
  skills: readonly Skill[],
  words: { practising: string; allDone: string; nextUp: string },
): string {
  const now = skills.find((s) => s.state === "now");
  if (now) return `${words.practising} ${now.name}`;
  const next = skills.find((s) => s.state === "next");
  return next ? `${words.allDone} ${words.nextUp} ${next.name}` : words.allDone;
}

/**
 * The switch for the Facebook button on /zaloguj and /en/sign-in (decision dl-ovva): Facebook
 * sign-in works in prod for the Meta app's testers, and the button stays out of the page until the
 * app is Live. Set it to true when dl-e8ov.2.58 lands. Its words stay in landing.yaml either way.
 */
export const facebookSignInLive = false;

/** A way to sign in that /zaloguj hands over to the app, besides the email code. */
export type SignInProvider = Parameters<typeof providerUrl>[0];

/** The provider buttons /zaloguj shows, in order: Google, then Facebook once it is Live. */
export const signInProviders = (facebookLive = facebookSignInLive): readonly SignInProvider[] =>
  facebookLive ? ["google", "facebook"] : ["google"];

/**
 * What scripts/check-dist.ts asks of each built sign-in page: a link for every shown provider, and
 * none for a hidden one. A page the build left out (English before it is live) is skipped by
 * check-dist's mustNot and is not in `must`.
 */
export function signInDistChecks(
  languages: readonly Language[],
  facebookLive = facebookSignInLive,
): { must: DistCheck[]; mustNot: DistCheck[] } {
  const shown = signInProviders(facebookLive);
  const all: readonly SignInProvider[] = ["google", "facebook"];
  const file = (lang: Language): string => `${twinPath("signIn", lang).slice(1)}/index.html`;
  const link = (provider: SignInProvider): string => `href="${providerUrl(provider)}`;
  return {
    must: languages.flatMap((lang) => shown.map((p): DistCheck => [file(lang), link(p)])),
    mustNot: LANGUAGE_CODES.flatMap((lang) =>
      all.filter((p) => !shown.includes(p)).map((p): DistCheck => [file(lang), link(p)]),
    ),
  };
}
