// The site's words beyond each page's frontmatter: one entry per section, read from
// src/content/pl/landing.yaml so a native speaker edits words, not markup. The index page's
// `reviewed` flag in src/content/pl/index.md covers these words too.
import { ID_PREFIXES } from "@jadwigo/contracts";
import { z } from "astro/zod";

const text = z.string().min(1);
const item = z.object({ title: text, text });
/** A page built from these words: its head and its h1. */
const head = { title: text, description: text, heading: text };

export const landingSchema = z.object({
  // The hero's question (owner, 2026-10-31): the first question of one featured lesson, answered on
  // the page. `lesson` is that lesson's assignment id, so "play" continues it.
  hero: z.object({
    homework: text,
    play: text,
    question: z
      .object({
        lesson: z.string().startsWith(ID_PREFIXES.assignment),
        say: text,
        choices: z.array(text).min(2).max(4),
        answer: text,
        right: text,
        hint: text,
        // After a right answer and Jadwiga's clip: the invitation to a parent account (/zaloguj).
        signUp: z.object({ text, button: text }),
      })
      .refine((q) => q.choices.includes(q.answer), {
        message: "answer must be one of the choices",
      }),
  }),
  after: z.object({ text, link: text }),
  links: z.array(z.object({ href: z.string().regex(/^(\/[a-z0-9-]+)+$/), label: text })).min(1),
  steps: z.object({ ...head, items: z.array(item).length(3) }),
  promises: z.object({ heading: text, items: z.array(item).min(1) }),
  lessons: z.object({
    ...head,
    text,
    play: text,
    all: text,
    subjects: z.object({ math: text, polish: text, english: text }),
    grade: text,
    questions: z.tuple([text, text, text]),
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
  nav: z.object({ signIn: text, home: text, label: text }),
  footer: z.object({ privacy: text, deletion: text, made: text }),
});

/** Polish plural of a count: 1 pytanie, 2–4 (not 12–14) pytania, else pytań. */
export function plural(n: number, [one, few, many]: readonly [string, string, string]): string {
  if (n === 1) return `${n} ${one}`;
  const tens = n % 100;
  const units = n % 10;
  return `${n} ${units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many}`;
}

/** The first sentence of a spoken line, for a card's teaser: "Ile to jest 2 razy 7?" */
export const firstSentence = (line: string): string => line.match(/^.*?[?.!](?=\s|$)/)?.[0] ?? line;
