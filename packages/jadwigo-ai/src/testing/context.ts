import { AccountId, ID_PREFIXES, idOf, PodId } from "@jadwigo/contracts";
import { RunId } from "@jadwigo/contracts/run";
import type { MuseRequest } from "../muse/client.ts";
import type { VerbContext } from "../verbs/types.ts";

/** Test-only helpers for the muse and verbs suites: a run's ids, a verb context, a request. */

export function runId(): RunId {
  return RunId.parse(idOf(ID_PREFIXES.run, crypto.randomUUID()));
}

export function contextFor(
  run_id: RunId,
  call_id: string,
  lesson: VerbContext["lesson"] = null,
): VerbContext {
  return {
    pod: PodId.parse(idOf(ID_PREFIXES.pod, crypto.randomUUID())),
    created_by: AccountId.parse(idOf(ID_PREFIXES.account, crypto.randomUUID())),
    run_id,
    call_id,
    lesson,
  };
}

export function requestFor(
  run_id: RunId,
  call_no: number,
  tag = "product:lesson-compose",
): MuseRequest {
  return {
    run_id,
    call_no,
    tag,
    prompt_cache_key: "jadwigo-lesson-compose:v1",
    instructions: "Draft a lesson from the parent's words.",
    input: [{ type: "message", role: "user", text: "Adding within 20, grade 1." }],
    tools: [],
    names: [],
  };
}
