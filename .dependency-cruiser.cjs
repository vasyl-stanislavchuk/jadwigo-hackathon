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
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)node_modules/" },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "default", "types"],
      extensions: [".ts", ".tsx", ".js"],
    },
  },
};
