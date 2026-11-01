import { EventId, ID_PREFIXES, idOf } from "@jadwigo/contracts";
import { type ConversationId, RunId } from "@jadwigo/contracts/run";

/**
 * Deterministic ids (Lead decision 5): the same write names the same `event_id` on every delivery,
 * so the store keeps it once. A key names what the event is (the run, the model call, Muse's
 * `call_id`), never the attempt that writes it, or a redelivery would write it twice.
 */

/** The engine's own uuid v5 namespace, fixed forever: changing it renames every event. */
const NAMESPACE = "7d1f0b52-3c2e-4b8a-9f61-2a4c5e8d9b07";

async function uuidV5(name: string): Promise<string> {
  const ns = Uint8Array.from(NAMESPACE.replaceAll("-", "").match(/../g) ?? [], (h) =>
    Number.parseInt(h, 16),
  );
  const text = new TextEncoder().encode(name);
  const data = new Uint8Array(ns.length + text.length);
  data.set(ns);
  data.set(text, ns.length);
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-1", data)).slice(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The `event_id` of the event `parts` name, within one run. */
export async function eventIdFor(run: RunId, ...parts: readonly (string | number)[]) {
  return EventId.parse(await uuidV5([run, ...parts].join("\u001f")));
}

/**
 * A conversation's turn `turn` (0, 1, ...), named by the conversation and the turn's number
 * (dl-z5ja.85): 2 first messages racing name the same run, which the store writes once, so the 2nd
 * joins the 1st's turn instead of opening another.
 */
export async function turnRunIdFor(conversation: ConversationId, turn: number) {
  return RunId.parse(idOf(ID_PREFIXES.run, await uuidV5(`turn\u001f${conversation}\u001f${turn}`)));
}
