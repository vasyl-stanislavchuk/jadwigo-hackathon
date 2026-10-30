import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { pageSchema } from "./lib/seo.ts";

/**
 * Every page's words, as markdown in src/content/<lang>/. The entry id is the file's path without
 * `.md` (`pl/index`, `en/privacy`), so a page keeps its id whatever its frontmatter says.
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
};
