import type { RunEvent } from "@jadwigo/contracts/run";
import {
  type MuseClient,
  type MuseRequest,
  ScriptedMuse,
  type ScriptedReply,
} from "@jadwigo/jadwigo-ai";

/**
 * The probe's model (dl-z5ja.5): a scripted turn, answered by `call_no`, so every invocation of a
 * host answers the same whatever process runs it. No network and no paid call. Call 1 drafts a
 * made-up lesson from the fixture bank and checks it, the CPU-heavy verbs; call 2 answers the
 * parent and ends the turn.
 */
export const PROBE_SCRIPT: readonly ScriptedReply[] = [
  {
    tool_calls: [
      {
        verb: "lesson_draft",
        input: { request: "a short lesson", grade: "1", names: [], topic: "addition" },
      },
      { verb: "lesson_check", input: (r) => ({ draft_id: r.run_id, help: {} }) },
    ],
    cost_usd: 0,
  },
  // In Polish, the draft's language: an English answer would be refused (dl-z5ja.64).
  { text: "Lekcja jest gotowa po prawej.", cost_usd: 0 },
];

export class ProbeMuse implements MuseClient {
  respond(request: MuseRequest) {
    const reply = PROBE_SCRIPT[request.call_no - 1];
    if (reply === undefined) {
      return Promise.reject(new Error(`the probe has no reply for call ${request.call_no}`));
    }
    return new ScriptedMuse([reply]).respond(request);
  }
}

/** A turn is good when it ended with `turn_complete` and logged no `error`. */
export function turnOf(events: readonly RunEvent[]): { ok: boolean; types: string } {
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
  const types = [...counts].map(([t, n]) => (n > 1 ? `${t}×${n}` : t)).join(", ");
  const ok = counts.has("turn_complete") && !counts.has("error");
  return { ok, types };
}
