// The public surface: createBank over the fixture and api profiles, the ports, and BankError.
// The bank itself is never in git (tools/src/check-no-bank.ts); the doubles are at
// @jadwigo/bank/testing, for tests only.
import { type ApiBankOptions, apiSearch } from "./api.ts";
import { fixtureSearch } from "./fixture.ts";
import type { BankSearch } from "./ports.ts";
import type { BankProfile } from "./profiles.ts";

export type { ApiBankOptions } from "./api.ts";
export { bankProfile } from "./config.ts";
export { BankError } from "./envelope.ts";
export type { BankReader, BankSearch, Embedder, QuestionIndex, Reranker } from "./ports.ts";
export { BANK_PROFILES, type BankProfile } from "./profiles.ts";

/**
 * A bank for a profile: `fixture` searches made-up sets in memory, `api` calls
 * `POST /api/v1/question-searches` with the options given. Either way the answer is the public
 * envelope, and a failure is a `BankError`.
 */
export function createBank(profile: "fixture"): BankSearch;
export function createBank(profile: "api", options: ApiBankOptions): BankSearch;
export function createBank(profile: BankProfile, options?: ApiBankOptions): BankSearch;
export function createBank(profile: BankProfile, options?: ApiBankOptions): BankSearch {
  if (profile === "fixture") return fixtureSearch();
  if (options === undefined) throw new Error("the api bank needs its options: base, token");
  return apiSearch(options);
}
