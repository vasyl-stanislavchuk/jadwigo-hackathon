/** Import direction for the jadwigo monorepo. tools/src/fences.test.ts plants a violation of each rule. */
module.exports = {
  forbidden: [
    {
      name: "packages-never-import-apps",
      comment: "Apps run and packages are imported. A package never imports an app.",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "contracts-imports-nothing-of-ours",
      comment: "packages/contracts is the bottom of the graph: Zod and nothing of ours.",
      severity: "error",
      from: { path: "^packages/contracts/" },
      to: { path: "^(apps|packages|tools)/", pathNot: "^packages/contracts/" },
    },
    {
      name: "testing-only-in-tests",
      comment: "Only test files import @jadwigo/testing or any */testing subpath.",
      severity: "error",
      from: { pathNot: ["\\.test\\.tsx?$", "^packages/testing/", "(^|/)src/testing(/|\\.ts$)"] },
      to: { path: ["^packages/testing/", "(^|/)src/testing(/|\\.ts$)"] },
    },
    {
      name: "lesson-kit-stage-is-the-bottom",
      comment:
        "lesson-kit's stage (clock, press, StepFrame, page types) imports neither its parts nor its families.",
      severity: "error",
      from: { path: "^packages/lesson-kit/src/stage/" },
      to: { path: "^packages/lesson-kit/src/(parts|families)/" },
    },
    {
      name: "lesson-kit-parts-know-no-family",
      comment:
        "A part draws for any family: it never imports a family view or model (david-learns levels.test.ts).",
      severity: "error",
      from: { path: "^packages/lesson-kit/src/parts/" },
      to: { path: "^packages/lesson-kit/src/families/" },
    },
    {
      name: "drag-only-in-the-drag-parts",
      comment:
        "@dnd-kit is imported only by the three drag parts, so a view that does not drag never loads it.",
      severity: "error",
      from: {
        pathNot: "^packages/lesson-kit/src/parts/(DropZones|TileBank|SortableList)\\.tsx$",
      },
      to: { path: "node_modules/@dnd-kit/" },
    },
    {
      name: "katex-only-in-rich-text",
      comment: "TeX is drawn in one place: RichText and its macros.",
      severity: "error",
      from: { pathNot: "^packages/lesson-kit/src/parts/(RichText\\.tsx|richTextMacros\\.ts)$" },
      to: { path: "node_modules/katex/" },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      // astro:* modules are Astro's virtual modules, resolved by its build, not on disk.
      to: { couldNotResolve: true, pathNot: "^astro:" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    // .astro/ holds the types Astro generates for apps/site, never imported by our code.
    // node_modules stays in the graph as leaves (doNotFollow), so a rule can name a library.
    exclude: { path: "(^|/)\\.astro/" },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "default", "types"],
      extensions: [".ts", ".tsx", ".js"],
    },
  },
};
