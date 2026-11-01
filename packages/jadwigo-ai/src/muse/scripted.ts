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

/** The model a scripted answer names, so a log shows it came from no provider. */
const SCRIPTED_MODEL = "scripted";

/**
 * A `MuseClient` that replays a script, one reply per call in order, deterministic and with no
 * network. The dev page (`apps/web/dev/engine-plugin.ts`) and the tests both run it, so it lives
 * here and not under `src/testing/`, which only test files may import (dependency-cruiser
 * `testing-only-in-tests`). `calls` records every request it was sent. A call past the script's end
 * throws. Step 0 (dl-z5ja.12) fixes the shape; the verbs lane (dl-z5ja.15) writes the body.
 */
export class ScriptedMuse implements MuseClient {
  readonly calls: MuseRequest[] = [];

  /** The first `call_<n>` of each reply: call ids count across the whole script, in order. */
  readonly #firstCall: readonly number[];

  constructor(readonly script: readonly ScriptedReply[]) {
    let next = 1;
    this.#firstCall = script.map((reply) => {
      const first = next;
      next += reply.tool_calls?.length ?? 0;
      return first;
    });
  }

  respond(request: MuseRequest): Promise<MuseResponse> {
    const n = this.calls.length;
    this.calls.push(request);
    const reply = this.script[n];
    const first = this.#firstCall[n];
    if (reply === undefined || first === undefined) {
      return Promise.reject(
        new Error(`ScriptedMuse has ${this.script.length} replies and was called again`),
      );
    }
    const tool_calls = (reply.tool_calls ?? []).map((call, i) => ({
      call_id: `call_${first + i}`,
      verb: call.verb,
      input: typeof call.input === "function" ? call.input(request) : call.input,
    }));
    const text = reply.text ?? null;
    return Promise.resolve({
      response_id: `resp_${n + 1}`,
      model: SCRIPTED_MODEL,
      text,
      tool_calls,
      usage: madeUpUsage(request, text, tool_calls.length),
      cost_usd: reply.cost_usd ?? 0,
    });
  }
}

/** Token counts that look like a call's, from its size: deterministic and never billed. */
function madeUpUsage(request: MuseRequest, text: string | null, calls: number) {
  const sent = request.instructions.length + JSON.stringify(request.input).length;
  return {
    input_tokens: Math.ceil(sent / 4),
    output_tokens: Math.ceil((text?.length ?? 0) / 4) + 20 * calls,
    cached_tokens: 0,
  };
}
