import { createHash } from "node:crypto";
import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  type Attachment,
  AttachmentCreate,
  AttachmentId,
  AttachmentMediaType,
  type AttachmentRead,
  type AttachmentUpload,
  type ConversationId,
  type ConversationMessage,
  ErrorType,
  type EventId,
  ID_PREFIXES,
  idOf,
  LIMITS,
  type MessageAttachment,
  type PodId,
  type RunInbox,
} from "@jadwigo/contracts";
import { type AttachedPhoto, type Store, StoreError } from "@jadwigo/store";
import type { Claims } from "./auth.ts";
import { authorizeMember } from "./authorize.ts";
import { type ReadParameter, readSsm, uploadsBucket } from "./config.ts";
import { ApiError, badRequest } from "./errors.ts";

/**
 * A parent's photos on a message (homework epic dl-z5ja.11, issue dl-z5ja.11.3; wave 5 decision 51,
 * `docs/worklog/dl-z5ja/2026-11-01-wave-5.md`). md drop-comments' handshake, the TypeScript way:
 *
 *   POST /api/v1/attachments    a pending row and a presigned form for pending/<pod>/<id>, bound
 *                               to that key, image/jpeg and the exact size; the page posts the
 *                               file straight to S3
 *   postMessage with photos     each photo checked (its size, its first bytes: a JPEG with no
 *                               APP1 segment) and copied to pods/<pod>/attachments/<id>.jpg, then
 *                               its row attached and the inbox row written in the message's unit;
 *                               a unit that rolls back deletes the copies
 *   GET /api/v1/attachments/{id} an attached photo and a 5-minute link to its stored copy
 *
 * The bucket is behind `UploadsBucket`: S3 in the Lambda, `MemoryUploads` in tests. Never the
 * bytes in a log, and a photo's text is never read here: it is data for the model alone.
 */

/** How long the upload form is good for (drop-comments' 10 minutes). */
const FORM_MS = 10 * 60_000;
/** How long a photo no message carried stays pending; S3's lifecycle rule on pending/ is 1 day. */
const PENDING_MS = 24 * 60 * 60_000;
/** How long the link to a stored photo is good for. */
const LINK_MS = 5 * 60_000;
/** The first bytes the check reads: enough for every header a re-encoded JPEG has, and any kind's magic. */
export const HEAD_BYTES = 64 * 1024;
const JPEG = "image/jpeg";

/** The S3 calls the photo routes make, on the uploads bucket. */
export interface UploadsBucket {
  /** A form the bucket takes only for `key`, `contentType` and exactly `bytes` bytes. */
  presignPost(
    key: string,
    contentType: string,
    bytes: number,
    expiresInS: number,
  ): Promise<{ url: string; fields: Record<string, string> }>;
  /** The object's size, or undefined when there is none. */
  size(key: string): Promise<number | undefined>;
  /** The object's first `bytes` bytes (fewer when it is shorter), or undefined when there is none. */
  head(key: string, bytes: number): Promise<Uint8Array | undefined>;
  /** The object's bytes from `start` to `end`, both included, or undefined when there is none. */
  range(key: string, start: number, end: number): Promise<Uint8Array | undefined>;
  /**
   * Copies `from` to `to` with the headers the server picks: the type, and `inline` for a photo
   * or `attachment` for a document, so a browser never renders a PDF from the bucket's origin.
   */
  copy(
    from: string,
    to: string,
    contentType: string,
    disposition: "inline" | "attachment",
  ): Promise<void>;
  remove(keys: readonly string[]): Promise<void>;
  /** A link that reads `key` for `expiresInS` seconds. */
  presignGet(key: string, expiresInS: number): Promise<string>;
}

/** Where the browser's upload waits for its message. */
export function pendingKey(pod: PodId, id: AttachmentId): string {
  return `pending/${pod}/${id}`;
}

/** Each kind's extension in the bucket, and whether a browser may show it in place. */
const KINDS: Readonly<
  Record<
    AttachmentMediaType,
    { readonly ext: string; readonly disposition: "inline" | "attachment" }
  >
> = {
  "image/jpeg": { ext: "jpg", disposition: "inline" },
  "image/heic": { ext: "heic", disposition: "inline" },
  "application/pdf": { ext: "pdf", disposition: "attachment" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: "docx",
    disposition: "attachment",
  },
};

/**
 * Where a sent file is kept, under its pod: the copy the model and the thread read,
 * `pods/<pod>/attachments/<id>.<jpg|heic|pdf|docx>`.
 */
export function storedKey(
  pod: PodId,
  id: AttachmentId,
  media_type: AttachmentMediaType = JPEG,
): string {
  return `pods/${pod}/attachments/${id}.${KINDS[media_type].ext}`;
}

/** The converter's first page of a sent HEIC, PDF or DOCX (wave 6 decision 58). */
export function previewKey(pod: PodId, id: AttachmentId): string {
  return `pods/${pod}/attachments/${id}/p1.jpg`;
}

const ascii = (bytes: Uint8Array, start: number, end: number): string =>
  String.fromCharCode(...bytes.subarray(start, end));

/** Whether `head` is a HEIF of a HEIC brand: `ftyp` at byte 4, then heic, heix or mif1. */
export function isHeic(head: Uint8Array): boolean {
  return ascii(head, 4, 8) === "ftyp" && ["heic", "heix", "mif1"].includes(ascii(head, 8, 12));
}

/** Whether `head` starts as a PDF does. */
export function isPdf(head: Uint8Array): boolean {
  return ascii(head, 0, 5) === "%PDF-";
}

/** The bytes a ZIP's end of central directory record takes, and the most its comment adds. */
const EOCD_BYTES = 22;
const ZIP_TAIL = EOCD_BYTES + 0xffff;
/** A DOCX's central directory is a few KB; past this it is not one the page would send. */
const MAX_DIRECTORY = 1024 * 1024;

const u16 = (b: Uint8Array, at: number) => (b[at] ?? 0) | ((b[at + 1] ?? 0) << 8);
const u32 = (b: Uint8Array, at: number) => (u16(b, at) | (u16(b, at + 2) << 16)) >>> 0;

/**
 * Where a ZIP's central directory is, from `tail`, the file's last bytes, and `size`, the file's
 * size: the last end-of-central-directory record, and the directory inside the file. Undefined
 * when there is no record, or the directory is ZIP64, past the file or larger than a DOCX's.
 */
export function zipDirectory(
  tail: Uint8Array,
  size: number,
): { offset: number; length: number } | undefined {
  for (let at = tail.length - EOCD_BYTES; at >= 0; at--) {
    if (u32(tail, at) !== 0x06054b50) continue;
    const length = u32(tail, at + 12);
    const offset = u32(tail, at + 16);
    if (offset === 0xffffffff || length === 0xffffffff) return undefined;
    if (length === 0 || length > MAX_DIRECTORY || offset + length > size) return undefined;
    return { offset, length };
  }
  return undefined;
}

/** Whether a ZIP's central directory names `name` among its file headers. */
export function zipNames(directory: Uint8Array, name: string): boolean {
  let at = 0;
  while (at + 46 <= directory.length && u32(directory, at) === 0x02014b50) {
    const nameLength = u16(directory, at + 28);
    const extra = u16(directory, at + 30);
    const comment = u16(directory, at + 32);
    if (ascii(directory, at + 46, at + 46 + nameLength) === name) return true;
    at += 46 + nameLength + extra + comment;
  }
  return false;
}

/**
 * Whether the upload at `key`, of `size` bytes, is a DOCX: a ZIP (its local header first) whose
 * central directory, read by ranged GETs from the end, names `word/document.xml`.
 */
async function isDocx(
  uploads: UploadsBucket,
  key: string,
  head: Uint8Array,
  size: number,
): Promise<boolean> {
  if (u32(head, 0) !== 0x04034b50) return false;
  const start = Math.max(0, size - ZIP_TAIL);
  const tail = await uploads.range(key, start, size - 1);
  if (tail === undefined) return false;
  const found = zipDirectory(tail, size);
  if (found === undefined) return false;
  const directory = await uploads.range(key, found.offset, found.offset + found.length - 1);
  return directory !== undefined && zipNames(directory, "word/document.xml");
}

/** Whether the upload is the kind it was declared as, by its first bytes (and a DOCX's last). */
async function isDeclaredKind(
  uploads: UploadsBucket,
  key: string,
  media_type: AttachmentMediaType,
  size: number,
): Promise<boolean> {
  const head = await uploads.head(key, HEAD_BYTES);
  if (head === undefined) return false;
  switch (media_type) {
    case "image/jpeg":
      return jpegHasNoExif(head);
    case "image/heic":
      return isHeic(head);
    case "application/pdf":
      return isPdf(head);
    default:
      return isDocx(uploads, key, head, size);
  }
}

/**
 * Whether `head`, a file's first bytes, is a JPEG that carries no APP1 segment: no Exif, so no
 * camera, time or GPS, and no XMP either. The page re-encodes every photo through a canvas, which
 * writes none, so a file with one did not come from the page. It walks the markers from SOI to the
 * first SOS (the start of the pixels); a file whose headers do not end inside `head` is refused.
 */
export function jpegHasNoExif(head: Uint8Array): boolean {
  if (head[0] !== 0xff || head[1] !== 0xd8 || head[2] !== 0xff) return false;
  let at = 2;
  while (at < head.length) {
    if (head[at] !== 0xff) return false;
    // Fill bytes: any number of 0xFF before a marker.
    while (head[at] === 0xff) at += 1;
    const marker = head[at];
    if (marker === undefined) return false;
    at += 1;
    if (marker === 0xda) return true;
    if (marker === 0xd9 || marker === 0xd8) return false;
    // Markers with no length: TEM and the restart markers.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const high = head[at];
    const low = head[at + 1];
    if (high === undefined || low === undefined) return false;
    const length = (high << 8) | low;
    if (length < 2) return false;
    if (marker === 0xe1) return false;
    at += length;
  }
  return false;
}

/** A photo's id, named by the page's `event_id` within the caller's pod, as a conversation's is. */
function attachmentIdFor(pod: PodId, event_id: EventId): AttachmentId {
  const bytes = createHash("sha256").update(`attachment\u001f${pod}\u001f${event_id}`).digest();
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x80;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return AttachmentId.parse(idOf(ID_PREFIXES.attachment, uuid));
}

/** No uploads bucket is wired (a local server, or a module test): the photo routes fail loudly. */
function noBucket(): Error {
  return new Error("no uploads bucket is wired: set UPLOADS_BUCKET");
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * `POST /api/v1/attachments`: a pending photo and its upload form, once by `event_id`. A resend
 * answers the same photo with a fresh form while it is pending; the same `event_id` with another
 * declaration is 409 `EventIdMismatch`, one a message carries is `AttachmentAttached`, one past its
 * `expires_at` is `AttachmentExpired`. Past the pod's daily count it is 429 `AttachmentLimitDay`,
 * counted under the pod's lock so 2 creates at 199 cannot both pass.
 */
export async function createAttachment(
  store: Store,
  deps: {
    readonly uploads: UploadsBucket | undefined;
    readonly lockPod: (pod: PodId) => Promise<void>;
    readonly now: () => Date;
  },
  claims: Claims,
  raw: unknown,
): Promise<AttachmentUpload> {
  const { pod, account } = await authorizeMember(store, claims);
  const parsed = AttachmentCreate.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const uploads = deps.uploads;
  if (uploads === undefined) throw noBucket();
  const declared = parsed.data;
  const id = attachmentIdFor(pod, declared.event_id);
  const now = deps.now().getTime();
  await deps.lockPod(pod);
  let attachment = await stored(store, pod, id);
  if (attachment === undefined) {
    const day = new Date(now);
    day.setUTCHours(0, 0, 0, 0);
    if ((await store.countAttachments(pod, day.toISOString())) >= LIMITS.attachmentsPerPodPerDay)
      throw new ApiError(
        ErrorType.enum.AttachmentLimitDay,
        "today's photos for this family are used up: try again tomorrow",
      );
    attachment = await store.createAttachment(pod, {
      id,
      account_id: account,
      event_id: declared.event_id,
      media_type: declared.media_type,
      bytes: declared.bytes,
      width: declared.width ?? null,
      height: declared.height ?? null,
      name: declared.name ?? null,
      expires_at: iso(now + PENDING_MS),
    });
  }
  if (
    attachment.media_type !== declared.media_type ||
    attachment.bytes !== declared.bytes ||
    attachment.width !== (declared.width ?? null) ||
    attachment.height !== (declared.height ?? null)
  )
    throw new ApiError(ErrorType.enum.EventIdMismatch, "this event id was sent with another body");
  if (attachment.state === "attached")
    throw new ApiError(ErrorType.enum.AttachmentAttached, "a message carries this photo already");
  if (attachment.expires_at === null || Date.parse(attachment.expires_at) <= now) throw expired();
  // Bound to the file's own kind and its exact size: at most attachmentBytes for a JPEG and
  // documentBytes for the rest, as AttachmentCreate holds them.
  const form = await uploads.presignPost(
    pendingKey(pod, id),
    attachment.media_type,
    attachment.bytes,
    FORM_MS / 1000,
  );
  return { attachment, upload: { ...form, expires_at: iso(now + FORM_MS) } };
}

/**
 * `GET /api/v1/attachments/{id}`: an attached photo and a 5-minute link to its stored copy. A
 * pending one, and another pod's, is 404: only what a message carries has a link.
 */
export async function getAttachment(
  store: Store,
  deps: { readonly uploads: UploadsBucket | undefined; readonly now: () => Date },
  claims: Claims,
  id: AttachmentId,
): Promise<AttachmentRead> {
  const { pod } = await authorizeMember(store, claims);
  const attachment = await store.getAttachment(pod, id);
  if (attachment.state !== "attached" || attachment.storage_path === null)
    throw new ApiError(ErrorType.enum.NotFound, "this photo is not on a message");
  if (deps.uploads === undefined) throw noBucket();
  const url = await deps.uploads.presignGet(attachment.storage_path, LINK_MS / 1000);
  // A JPEG is its own preview. Another kind's is the converter's first page, once a turn has read
  // the file (wave 6 decision 61); until then, none.
  let preview_url: string | null = null;
  if (attachment.media_type !== JPEG) {
    const preview = previewKey(pod, attachment.id);
    if ((await deps.uploads.size(preview)) !== undefined)
      preview_url = await deps.uploads.presignGet(preview, LINK_MS / 1000);
  }
  return { attachment, url, preview_url, expires_at: iso(deps.now().getTime() + LINK_MS) };
}

async function stored(store: Store, pod: PodId, id: AttachmentId): Promise<Attachment | undefined> {
  try {
    return await store.getAttachment(pod, id);
  } catch (error) {
    if (error instanceof StoreError && error.type === ErrorType.enum.NotFound) return undefined;
    throw error;
  }
}

function mismatch(why: string): ApiError {
  return new ApiError(ErrorType.enum.AttachmentMismatch, why);
}

function expired(): ApiError {
  return new ApiError(
    ErrorType.enum.AttachmentExpired,
    "this photo's upload has expired: add it again",
  );
}

/**
 * What one message request did to the bucket: the copies it wrote, which a unit that rolls back
 * deletes, and the pending uploads it took, which a unit that commits deletes. `settlePhotos` does
 * both once the unit has ended.
 */
export interface PhotoWork {
  readonly uploads: UploadsBucket | undefined;
  readonly copied: string[];
  readonly taken: string[];
}

export function photoWork(uploads: UploadsBucket | undefined): PhotoWork {
  return { uploads, copied: [], taken: [] };
}

/**
 * Ends a message request's photo work: on a commit the pending uploads go, on a throw (a refusal
 * or a failed commit) the copies do. Both deletes are best effort; S3's lifecycle rule takes a
 * pending upload left behind after a day.
 */
export async function settlePhotos<T>(work: PhotoWork, unit: Promise<T>): Promise<T> {
  try {
    const result = await unit;
    await removeQuietly(work.uploads, work.taken);
    return result;
  } catch (error) {
    await removeQuietly(work.uploads, work.copied);
    throw error;
  }
}

async function removeQuietly(uploads: UploadsBucket | undefined, keys: readonly string[]) {
  if (uploads === undefined || keys.length === 0) return;
  try {
    await uploads.remove(keys);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "WARN",
        message: "photo delete failed",
        keys: keys.length,
        error: error instanceof Error ? error.name : typeof error,
      }),
    );
  }
}

/**
 * A message's photos, for `postMessage`, under the pod's lock: the inbox payload's `attachments`,
 * whether a stored inbox row carries the same ones, and `attach`, which marks the rows attached in
 * the message's unit once the inbox row is written. A message with no photos gets an empty payload.
 *
 * A resend (the pod already holds an inbox row for the `event_id`) checks and copies nothing: its
 * stored row answers, and `same` compares its photos with the resend's, in order. Otherwise each
 * photo is checked and copied at once, all in parallel; the first refusal refuses the message:
 * - not the pod's, or no upload of the declared size, or not a JPEG, or one with an APP1 segment:
 *   409 `AttachmentMismatch`;
 * - one another message carries: 409 `AttachmentAttached`; one past `expires_at`: `AttachmentExpired`.
 */
export async function messagePhotos(
  store: Store,
  work: PhotoWork | undefined,
  now: Date,
  pod: PodId,
  conversation: ConversationId,
  message: ConversationMessage,
): Promise<{
  readonly payload: { attachments?: MessageAttachment[] };
  same(inbox: RunInbox): boolean;
  attach(): Promise<void>;
}> {
  const ids = message.attachment_ids ?? [];
  const same = (inbox: RunInbox) =>
    inbox.kind === "message" &&
    JSON.stringify((inbox.payload.attachments ?? []).map((a) => a.attachment_id)) ===
      JSON.stringify(ids);
  if (ids.length === 0) return { payload: {}, same, attach: async () => {} };
  if (work?.uploads === undefined) throw noBucket();
  const uploads = work.uploads;
  const resent = await store.findRunInbox(pod, message.event_id);
  if (resent !== undefined) {
    const kept = resent.kind === "message" ? resent.payload.attachments : undefined;
    return { payload: kept ? { attachments: kept } : {}, same, attach: async () => {} };
  }
  const settled = await Promise.allSettled(
    ids.map((id) => checkAndCopy(store, uploads, work, now, pod, id)),
  );
  const refused = settled.find((s) => s.status === "rejected");
  if (refused) throw refused.reason;
  const attachments = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
  const photos: AttachedPhoto[] = attachments.map((a) => ({
    id: a.attachment_id,
    storage_path: a.storage_path,
  }));
  return {
    payload: { attachments },
    same,
    attach: async () => {
      await store.attachToMessage(pod, conversation, photos, now.toISOString());
    },
  };
}

async function checkAndCopy(
  store: Store,
  uploads: UploadsBucket,
  work: PhotoWork,
  now: Date,
  pod: PodId,
  id: AttachmentId,
): Promise<MessageAttachment> {
  const row = await stored(store, pod, id);
  if (row === undefined) throw mismatch("a photo is not this family's");
  if (row.state === "attached")
    throw new ApiError(ErrorType.enum.AttachmentAttached, "a message carries this photo already");
  if (row.expires_at === null || Date.parse(row.expires_at) <= now.getTime()) throw expired();
  const from = pendingKey(pod, id);
  if ((await uploads.size(from)) !== row.bytes)
    throw mismatch("a photo did not arrive at the size it was declared");
  const media_type = AttachmentMediaType.parse(row.media_type);
  if (!(await isDeclaredKind(uploads, from, media_type, row.bytes)))
    throw mismatch(
      media_type === JPEG
        ? "a photo is not a JPEG without Exif data"
        : "a file is not the kind it was declared as",
    );
  const to = storedKey(pod, id, media_type);
  await uploads.copy(from, to, media_type, KINDS[media_type].disposition);
  work.copied.push(to);
  work.taken.push(from);
  return {
    attachment_id: id,
    storage_path: to,
    media_type,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
  };
}

/** No such key: a 404, or a 403 since the role has no `s3:ListBucket`. */
function missing(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { name?: unknown; $metadata?: { httpStatusCode?: unknown } };
  return (
    e.name === "NotFound" ||
    e.name === "NoSuchKey" ||
    e.$metadata?.httpStatusCode === 404 ||
    e.$metadata?.httpStatusCode === 403
  );
}

/**
 * The uploads bucket in the Lambda: its name from `UPLOADS_BUCKET`, else from the SSM parameter
 * (`config.ts`), read once per cold start and again after a failed read.
 */
export function s3Uploads(
  client: S3Client = new S3Client({}),
  read: ReadParameter = readSsm,
): UploadsBucket {
  let name: Promise<string> | undefined;
  const bucket = (): Promise<string> => {
    name ??= uploadsBucket(read).then((value) => {
      if (value === undefined) throw noBucket();
      return value;
    });
    name.catch(() => {
      name = undefined;
    });
    return name;
  };
  return {
    async presignPost(key, contentType, bytes, expiresInS) {
      const post = await createPresignedPost(client, {
        Bucket: await bucket(),
        Key: key,
        Fields: { "Content-Type": contentType },
        Conditions: [
          ["eq", "$Content-Type", contentType],
          ["content-length-range", bytes, bytes],
        ],
        Expires: expiresInS,
      });
      return { url: post.url, fields: post.fields };
    },
    async size(key) {
      try {
        const out = await client.send(new HeadObjectCommand({ Bucket: await bucket(), Key: key }));
        return out.ContentLength;
      } catch (error) {
        if (missing(error)) return undefined;
        throw error;
      }
    },
    async head(key, bytes) {
      try {
        const out = await client.send(
          new GetObjectCommand({ Bucket: await bucket(), Key: key, Range: `bytes=0-${bytes - 1}` }),
        );
        return out.Body === undefined ? undefined : await out.Body.transformToByteArray();
      } catch (error) {
        if (missing(error)) return undefined;
        throw error;
      }
    },
    async range(key, start, end) {
      try {
        const out = await client.send(
          new GetObjectCommand({
            Bucket: await bucket(),
            Key: key,
            Range: `bytes=${start}-${end}`,
          }),
        );
        return out.Body === undefined ? undefined : await out.Body.transformToByteArray();
      } catch (error) {
        if (missing(error)) return undefined;
        throw error;
      }
    },
    async copy(from, to, contentType, disposition) {
      const Bucket = await bucket();
      await client.send(
        new CopyObjectCommand({
          Bucket,
          Key: to,
          CopySource: `${Bucket}/${from}`,
          ContentType: contentType,
          ContentDisposition: disposition,
          MetadataDirective: "REPLACE",
        }),
      );
    },
    async remove(keys) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: await bucket(),
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    },
    async presignGet(key, expiresInS) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: await bucket(), Key: key }), {
        expiresIn: expiresInS,
      });
    },
  };
}
