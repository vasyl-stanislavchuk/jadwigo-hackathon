import { describe, expect, it } from "vitest";
import { liveBank } from "../config.ts";
import { contextFor, runId } from "../testing/context.ts";
import { apiBank, httpBankReads } from "./bank-api.ts";
import { createVerbs } from "./index.ts";

/**
 * The real bank's draw against the deployed dev bank (dl-1u6fn.4 acceptance). It waits on the
 * bank's deploy: `GET /api/v1/question-sets/{id}` (jadwigo-bank #67 and the api route) and
 * bodies that name their question type (`sync derive` and `sync up`). Until then the draw finds
 * no ready question and this fails. It reads only, and the owner runs it with the read token
 * sourced from jw's file, never typed or on argv:
 *
 *   set -a; . ~/.config/jadwigo-bank/bank.env; set +a; bunx vitest run --config vitest.config.ts \
 *     --project integration packages/jadwigo-ai/src/verbs/bank-api.int.test.ts
 *
 * Without JW_API_URL and JW_BANK_READ_TOKEN it is skipped, so CI never calls the bank. It prints
 * the draw's time against the 10 s Lambda.
 */
describe.skipIf(liveBank() === null)("lesson_draft on the deployed bank", () => {
  it("drafts a lesson whose every step is a bank question with based_on", async () => {
    const bank = liveBank();
    if (bank === null) throw new Error("unreachable: skipped without the bank");
    const verbs = createVerbs({ bank: apiBank(httpBankReads(bank)) });
    const started = performance.now();
    const effect = await verbs.lesson_draft.run(contextFor(runId(), "call_1"), {
      request: "a short lesson",
      grade: "2",
      names: [],
      topic: "dodawanie do 20",
      count: 10,
    });
    const ms = Math.round(performance.now() - started);
    const script = effect.lesson_file?.["script"] as
      | { parts: { steps: { based_on: { question: string } }[] }[] }
      | undefined;
    const steps = script?.parts.flatMap((p) => p.steps) ?? [];
    process.stdout.write(`draw: ${steps.length} questions in ${ms} ms\n`);
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) expect(step.based_on.question).toMatch(/^bank:/);
  }, 30_000);
});
