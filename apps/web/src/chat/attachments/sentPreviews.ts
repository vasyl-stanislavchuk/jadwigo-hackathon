import type { AttachmentId } from "@jadwigo/contracts";

/**
 * The local copies of photos a parent just sent (dl-z5ja.11.6): the first screen hands each
 * upload's object URL here as it sends, so the thread shows the photo at once, before the stored
 * copy's link is read. The thread takes it back once the stored copy has loaded, and revokes it.
 */
const kept = new Map<AttachmentId, string>();

export function keepSent(id: AttachmentId, url: string): void {
  kept.set(id, url);
}

/** The local copy of a sent photo, or null when this tab never held one. */
export function sentPreview(id: AttachmentId): string | null {
  return kept.get(id) ?? null;
}

/** Forgets the local copy and gives its URL back to be revoked. */
export function releaseSent(id: AttachmentId): string | null {
  const url = kept.get(id) ?? null;
  kept.delete(id);
  return url;
}
