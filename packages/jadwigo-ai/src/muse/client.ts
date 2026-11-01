import type { ModelUsage, RunId, ToolCall, VerbName } from "@jadwigo/contracts/run";

/**
 * The model behind the engine (Lead decision 10). It copies `jw.muse.ask`
 * (`apps/cli/src/jw/muse.py`): a prompt guarded before it leaves (`names` are what the guard
 * replaces, `apps/cli/src/jw/pii.py`), a `tag` naming the lane, a budget check before the call, a
 * ledger row per call that carries the `run_id`, and a `prompt_cache_key` stable per workflow.
 * Wave 1 runs `ScriptedMuse` (`scripted.ts`); `HttpMuse` against `/v1/responses` is dl-z5ja.18.
 * Decision `david-learns/decisions/2026-10-24-every-ai-workflow-in-the-jadwigo-service-runs-on-meta-s-api`.
 */

/** One item of the conversation the model reads, in the shape of `/v1/responses` input. */
export type MuseInput =
  | { type: "message"; role: "system" | "user" | "assistant"; text: string }
  | { type: "function_call"; call_id: string; verb: VerbName; arguments: Record<string, unknown> }
  | { type: "function_call_output"; call_id: string; output: Record<string, unknown> };

/** A verb as a function tool: its name, what it does, and its JSON Schema input. */
export interface MuseTool {
  name: VerbName;
  description: string;
  parameters: Record<string, unknown>;
}

export interface MuseRequest {
  run_id: RunId;
  /** 1, 2, ... per run: with `run_id`, the key a redelivered step finds a recorded answer by. */
  call_no: number;
  /** `<lane>:<what>`, as `jw.muse.ask` takes it: `product:lesson-compose`. */
  tag: string;
  /** Stable per workflow and its instructions, so the provider's prompt cache holds. */
  prompt_cache_key: string;
  instructions: string;
  input: readonly MuseInput[];
  tools: readonly MuseTool[];
  /** The names the guard replaces before the prompt leaves and restores in the answer. */
  names: readonly string[];
}

/** What the model answered: words, function calls, or both. Becomes one `model_response` event. */
export interface MuseResponse {
  response_id: string;
  text: string | null;
  tool_calls: readonly ToolCall[];
  usage: ModelUsage;
  cost_usd: number;
}

export interface MuseClient {
  respond(request: MuseRequest): Promise<MuseResponse>;
}
