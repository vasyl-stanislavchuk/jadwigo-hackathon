// Expressive Code's options for every code block (dl-5ssh.90.38). They live here, not in
// astro.config.mjs, because plugins don't serialize and the API reference renders <Code>.
import { defineEcConfig } from "@astrojs/starlight/expressive-code";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";

// A long sample folds what the reader can skip (collapse={6-8}), and a block whose lines the prose
// names numbers them (showLineNumbers). Numbers are off unless a block asks.
export default defineEcConfig({
  plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
  defaultProps: { showLineNumbers: false },
});
