import { EventId, ID_PREFIXES, idOf } from "@jadwigo/contracts";
import { RunId } from "@jadwigo/contracts/run";

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
 * The run a parent's message opens, named by the message's own `event_id`: a resend of the message
 * that opened a turn finds that turn instead of opening a 2nd.
 */
export async function runIdFor(opening: EventId) {
  return RunId.parse(idOf(ID_PREFIXES.run, await uuidV5(`run\u001f${opening}`)));
}
