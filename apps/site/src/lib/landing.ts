// The landing page's words beyond its frontmatter: one entry per section, read from
// src/content/pl/landing.yaml so a native speaker edits words, not markup. The page's `reviewed`
// flag in src/content/pl/index.md covers these words too.
import { z } from "astro/zod";

const item = z.object({ title: z.string().min(1), text: z.string().min(1) });

export const landingSchema = z.object({
  hero: z.object({
    lead: z.string().min(1),
    child: z.string().min(1),
    homework: z.string().min(1),
    play: z.string().min(1),
    art: z.string().min(1),
  }),
  steps: z.object({ heading: z.string().min(1), items: z.array(item).length(3) }),
  promises: z.object({ heading: z.string().min(1), items: z.array(item).min(1) }),
  lessons: z.object({
    heading: z.string().min(1),
    text: z.string().min(1),
    play: z.string().min(1),
    all: z.string().min(1),
  }),
  compare: z.object({
    heading: z.string().min(1),
    nav: z.string().min(1),
    text: z.string().min(1),
    columns: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]),
    source: z.string().min(1),
    rows: z
      .array(
        z.object({
          app: z.string().min(1),
          around: z.string().min(1),
          jadwigo: z.string().min(1),
          source: z.string().url(),
        }),
      )
      .min(1),
  }),
  faq: z.object({
    heading: z.string().min(1),
    items: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).min(1),
  }),
  about: z.object({ heading: z.string().min(1), text: z.string().min(1), more: z.string().min(1) }),
  nav: z.object({ signIn: z.string().min(1), home: z.string().min(1) }),
  footer: z.object({
    privacy: z.string().min(1),
    deletion: z.string().min(1),
    made: z.string().min(1),
  }),
});
