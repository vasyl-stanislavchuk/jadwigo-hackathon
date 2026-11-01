import type { MuseInput, MuseRequest } from "./client.ts";
import { laneOf } from "./guarded.ts";
import { PromptGuard } from "./pii.ts";

/**
 * What leaves with a call. A learner's data, names included, may reach any Meta model, the
 * contributor model included (owner decision of 2026-11-01, bead dl-uafq,
 * `jadwigo-hackathon/decisions/2026-11-01-a-learner-s-data-names-included-may-reach-any-meta-model-the-con`), so no tier needs the name guard: a run's prompt goes as it is.
 *
 * The guard stays for bank work, whose prompts have no reason to carry a name: a call whose tag
 * lane is in `guardLanes` (`bank` by default) passes one `PromptGuard` over every text it
 * carries. That covers the instructions, every message, the arguments of a function call the
 * model made and every function call output fed back. The answer is restored with the same
 * table, and only the placeholders it issued are put back.
 */
export interface Outbound {
  request: MuseRequest;
  /** The guard the request passed, to restore the answer with; null when it went unguarded. */
  guard: PromptGuard | null;
}

/** The lanes whose calls pass the name guard by default: bank work. */
const GUARD_LANES: readonly string[] = ["bank"];

export function outbound(
  request: MuseRequest,
  guardLanes: readonly string[] = GUARD_LANES,
): Outbound {
  if (!guardLanes.includes(laneOf(request.tag))) return { request, guard: null };
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
      // The name guard reads words: an image part passes as it is (dl-z5ja.11.4).
      return {
        ...item,
        text:
          typeof item.text === "string"
            ? guard.guard(item.text)
            : item.text.map((part) =>
                part.type === "input_text" ? { ...part, text: guard.guard(part.text) } : part,
              ),
      };
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
