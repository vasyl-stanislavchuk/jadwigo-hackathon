import type { AccountId, AttachmentId, EventId, PodId } from "@jadwigo/contracts";
import type { Attachment, AttachmentMediaType, ConversationId } from "@jadwigo/contracts/run";

/**
 * A parent's photos in the store (dl-e8ov.2.22; wave 5 decision 43,
 * `docs/worklog/dl-z5ja/2026-11-01-wave-5.md`): scoped to the pod, `pending` from
 * `POST /api/v1/attachments` until a message's check copies it under the pod and `attachToMessage`
 * marks it `attached`, once. The bytes are in S3; the store keeps what was declared and where the
 * checked copy is. On Postgres it is the `attachment` table
 * (`supabase/migrations/20261101400000_attachment.sql`), whose pg_cron sweep deletes a pending row
 * past `expires_at`.
 */

/**
 * A pending photo as `createAttachment` takes it. The caller derives `id` from `event_id` and the
 * pod, so a resend names the same row; the store sets `state`, `created_at` and the rest.
 */
export interface NewAttachment {
  id: AttachmentId;
  account_id: AccountId;
  event_id: EventId;
  media_type: AttachmentMediaType;
  bytes: number;
  /** A JPEG's size; null for a HEIC, a PDF or a DOCX (wave 6 decision 60). */
  width: number | null;
  height: number | null;
  /** The file's name for the parent's chip, or null. */
  name: string | null;
  /** When a photo no message carried is let go (ISO, UTC); the store keeps it pending until then. */
  expires_at: string;
}

/** One photo `attachToMessage` attaches: its id, and the key its checked copy was written to. */
export interface AttachedPhoto {
  id: AttachmentId;
  storage_path: string;
}

export interface AttachmentStore {
  /**
   * Written once by id: the same id again returns the stored row, whatever else it names. An
   * account outside `pod` is `NotFound`; an id another pod holds is `WriteOnce`.
   */
  createAttachment(pod: PodId, attachment: NewAttachment): Promise<Attachment>;
  /** Pending or attached. `NotFound` outside `pod`. */
  getAttachment(pod: PodId, id: AttachmentId): Promise<Attachment>;
  /** How many photos `pod` created at or after `since` (ISO, UTC), for its daily count. */
  countAttachments(pod: PodId, since: string): Promise<number>;
  /**
   * Attaches each photo to a message of `conversation` at `at` (ISO, UTC), all or none, and answers
   * them in the order given: `attached`, with its `storage_path`, `conversation_id` and
   * `attached_at`, and `expires_at` cleared. Every photo is checked before any is written:
   * - one outside `pod`, or a conversation outside `pod`: `NotFound`;
   * - one already attached: `AttachmentAttached`;
   * - one pending whose `expires_at` is at or before `at`: `AttachmentExpired`;
   * - an empty list, or a photo named twice: `BadRequest`.
   * On Postgres it runs in the unit's transaction, so the message's inbox row and these rows commit
   * or roll back together.
   */
  attachToMessage(
    pod: PodId,
    conversation: ConversationId,
    photos: readonly AttachedPhoto[],
    at: string,
  ): Promise<readonly Attachment[]>;
}

/**
 * What is wrong with `attachToMessage`'s list, or undefined: at least one photo, each named once.
 * Shared by both stores, which refuse it as `BadRequest`.
 */
export function photosProblem(photos: readonly AttachedPhoto[]): string | undefined {
  if (photos.length === 0) return "no photo to attach";
  if (new Set(photos.map((p) => p.id)).size !== photos.length) return "a photo is named twice";
  return undefined;
}
