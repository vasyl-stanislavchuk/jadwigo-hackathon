import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { landingSchema } from "./lib/landing.ts";
import { pageSchema } from "./lib/seo.ts";

/**
 * Every page's words, as markdown in src/content/<lang>/. The entry id is the file's path without
 * `.md` (`pl/index`, `en/privacy`), so a page keeps its id whatever its frontmatter says. The landing
 * page's section words sit beside it in <lang>/landing.yaml, one entry per language, its id the
 * language (`pl`, `en`; dl-w0b4.81).
 */
export const collections = {
  pages: defineCollection({
    loader: glob({
      pattern: "{pl,en}/**/*.md",
      base: "./src/content",
      generateId: ({ entry }) => entry.replace(/\.md$/, ""),
    }),
    schema: pageSchema,
  }),
  landing: defineCollection({
    loader: glob({
      pattern: "{pl,en}/landing.yaml",
      base: "./src/content",
      generateId: ({ entry }) => entry.replace(/\/landing\.yaml$/, ""),
    }),
    schema: landingSchema,
  }),
};
