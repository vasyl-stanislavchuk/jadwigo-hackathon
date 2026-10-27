import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { pageSchema } from "./lib/seo.ts";

/** Every page's words, as markdown in src/content/pl/. The entry id is the page's slug. */
export const collections = {
  pages: defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/pl" }),
    schema: pageSchema,
  }),
};
