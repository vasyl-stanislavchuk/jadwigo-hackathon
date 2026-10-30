// The dream, run on demand against DATABASE_URL (decision
// jadwigo-hackathon/2026-10-30-the-dream-runs-on-demand-now-a-make-target-and-a-post-route-work):
//
//   bun apps/api/src/dream.ts <learner>                      writes a report and prints it
//   bun apps/api/src/dream.ts <learner> --narrative <file>   writes the narrative in <file> on the
//                                                            learner's newest report, or on
//                                                            --report <id>, and prints the report
//
// The report is the one POST /api/v1/learners/{id}/reports writes (`makeReport`), and the
// narrative is checked as PATCH .../reports/{report} checks it (`checkNarrative`). Each run is one
// unit, in the learner's own pod. The output is the report's JSON: codes, counts and ids, no name.
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import {
  LearnerId,
  type LearnerReport,
  LearnerReportId,
  ReportNarrative,
} from "@jadwigo/contracts";
import { createPostgresStore, type Store } from "@jadwigo/store";
import { databaseUrl } from "./config.ts";
import { checkNarrative, makeReport } from "./knowledge.ts";

const USAGE = "usage: bun apps/api/src/dream.ts <learner> [--narrative <file> [--report <id>]]";

/** One dream: a new report, or a narrative written on one. */
async function dream(
  store: Store,
  learner: LearnerId,
  options: { readonly narrative?: ReportNarrative; readonly report?: LearnerReportId } = {},
): Promise<LearnerReport> {
  return store.unit(async () => {
    const pod = await store.findLearnerPod(learner);
    if (pod === undefined) throw new Error(`no learner ${learner}`);
    if (options.narrative === undefined) return makeReport(store, pod, learner, new Date());
    const report = options.report ?? (await store.listReports(pod, learner))[0]?.id;
    if (report === undefined) throw new Error(`learner ${learner} has no report yet`);
    await checkNarrative(store, pod, learner, report, options.narrative);
    return store.updateReport(pod, learner, report, { narrative: options.narrative });
  });
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { narrative: { type: "string" }, report: { type: "string" } },
  });
  const learner = LearnerId.safeParse(positionals[0]);
  if (!learner.success || positionals.length !== 1) throw new Error(USAGE);
  if (values.report !== undefined && values.narrative === undefined) throw new Error(USAGE);
  const url = databaseUrl();
  if (url === undefined) throw new Error("DATABASE_URL is unset: see .env.example");
  const store = createPostgresStore(url);
  try {
    const report = await dream(store, learner.data, {
      ...(values.narrative === undefined
        ? {}
        : {
            narrative: ReportNarrative.parse(JSON.parse(readFileSync(values.narrative, "utf8"))),
          }),
      ...(values.report === undefined ? {} : { report: LearnerReportId.parse(values.report) }),
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await store.close();
  }
}

await main().catch((error: unknown) => {
  process.stderr.write(`dream: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
