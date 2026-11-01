import type { MuseInput, MuseRequest } from "./client.ts";
import { PromptGuard } from "./pii.ts";

/**
 * What a tier lets leave. `private` trains on nothing it is sent, so a run's prompt goes there as
 * it is, the learner's names included, for the parent's request about their own child
 * (decision dl-2uq1, accepted 2026-11-01). `contributor` trains on its input, so every text of the request passes one
 * `PromptGuard`: the instructions (a parent's steer lands there), every message, the arguments
 * of a function call the model made and every function call output fed back. The answer is
 * restored with the same table, and only the placeholders it issued are put back.
 */
export interface Outbound {
  request: MuseRequest;
  /** The guard the request passed, to restore the answer with; null on the private tier. */
  guard: PromptGuard | null;
}

export function outbound(request: MuseRequest): Outbound {
  if (request.tier === "private") return { request, guard: null };
  const guard = new PromptGuard(request.names);
  return {
    guard,
    request: {
      ...request,
      instructions: guard.guard(request.instructions),
      input: request.input.map((item) => guardInput(item, guard)),
      names: [],
    },
  };
}

function guardInput(item: MuseInput, guard: PromptGuard): MuseInput {
  switch (item.type) {
    case "message":
      return { ...item, text: guard.guard(item.text) };
    case "function_call":
      return { ...item, arguments: mapStrings(item.arguments, (s) => guard.guard(s)) };
    case "function_call_output":
      return { ...item, output: mapStrings(item.output, (s) => guard.guard(s)) };
  }
}

/** Every string value in a JSON object, deep, through `f`; keys and other values stay. */
export function mapStrings(
  value: Record<string, unknown>,
  f: (s: string) => string,
): Record<string, unknown> {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return f(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v !== null && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };
  return walk(value) as Record<string, unknown>;
}
