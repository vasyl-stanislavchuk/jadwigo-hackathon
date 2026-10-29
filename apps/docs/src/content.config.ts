import { defineCollection } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

/** Every page, as markdown or MDX in src/content/docs/. The entry id is the page's slug. */
export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};
