import type { VerbName } from "@jadwigo/contracts/run";
import type { MuseClient, MuseRequest, MuseResponse } from "./client.ts";

/**
 * One scripted answer: words, function calls, or both, and what it costs. `ScriptedMuse` fills in
 * the ids: `response_id` `resp_<n>` and `call_id` `call_<n>`, counted across the script.
 */
export interface ScriptedReply {
  text?: string;
  /** An input may be a function of the request, for what only the run knows: its id. */
  tool_calls?: readonly {
    verb: VerbName;
    input: Record<string, unknown> | ((request: MuseRequest) => Record<string, unknown>);
  }[];
  cost_usd?: number;
}

/**
 * A `MuseClient` that replays a script, one reply per call in order, deterministic and with no
 * network. The dev page (`apps/web/dev/engine-plugin.ts`) and the tests both run it, so it lives
 * here and not under `src/testing/`, which only test files may import (dependency-cruiser
 * `testing-only-in-tests`). `calls` records every request it was sent. A call past the script's end
 * throws. Step 0 (dl-z5ja.12) fixes the shape; the verbs lane (dl-z5ja.15) writes the body.
 */
export class ScriptedMuse implements MuseClient {
  readonly calls: MuseRequest[] = [];

  constructor(readonly script: readonly ScriptedReply[]) {}

  respond(_request: MuseRequest): Promise<MuseResponse> {
    return Promise.reject(new Error("ScriptedMuse waits on dl-z5ja.15 (the verbs lane)"));
  }
}
