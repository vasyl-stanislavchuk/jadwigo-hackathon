/**
 * One parent's photo or document on its way to a message (dl-z5ja.11.5, dl-z5ja.11.12; wave 5
 * decisions 51 and 57, wave 6 decisions 60 and 61).
 *
 * - A photo the browser decodes is drawn, orientation applied, on a canvas no larger than
 *   `LIMITS.attachmentEdgePx` on its long edge, and re-encoded to a JPEG of at most
 *   `LIMITS.attachmentBytes`, which drops EXIF and GPS. Safari decodes HEIC itself.
 * - A PDF, a DOCX, and a HEIC the browser cannot decode (Chrome, Firefox, Android) go up as they
 *   are, with their name and no size in pixels, up to `LIMITS.documentBytes`. The converter turns
 *   them into page JPEGs on the server (dl-z5ja.11.10); no LGPL decoder runs in the browser
 *   (dl-n2wys, as amended).
 *
 * Then `POST /api/v1/attachments` hands back a presigned S3 form, and the file is posted straight
 * to the bucket with progress.
 *
 * Ported from md drop-comments' `Upload` (drop_runtime/src/comments/upload.ts): the browser parts
 * (decoding, the canvas, XHR, object URLs, the api call) come in through `UploadDeps`, so a test
 * runs the whole trip with fakes. A reason is a copy key, never a sentence, so the chip says it in
 * the parent's language.
 */

import type { ApiError } from "@jadwigo/api-client";
import {
  type AttachmentCreate,
  type AttachmentId,
  type AttachmentMediaType,
  type AttachmentUpload,
  type AttachmentUploadForm,
  type EventId,
  LIMITS,
} from "@jadwigo/contracts";
import type { CopyKey } from "@jadwigo/copy";

/** The first quality the JPEG is tried at. */
const JPEG_QUALITY = 0.85;
/** The lowest quality tried before the photo is refused as too large. */
const JPEG_QUALITY_FLOOR = 0.35;
const JPEG = "image/jpeg";
const HEIC = "image/heic";
const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
/** The longest name the api keeps (`AttachmentCreate.name`). */
const NAME_MAX = 120;

/** Why a photo has not uploaded: a copy key the chip shows. */
export type AttachReason = Extract<
  CopyKey,
  | "attach_unreadable"
  | "attach_document_too_large"
  | "attach_too_large"
  | "attach_limit_day"
  | "attach_offline"
  | "attach_expired"
  | "attach_changed"
  | "attach_not_taken"
>;

/** A refusal the page makes itself: the same photo never gets further, so the chip has no Retry. */
export class RefusedError extends Error {
  override name = "RefusedError";
  constructor(readonly reason: AttachReason) {
    super(reason);
  }
}

/** A refusal that may pass on another try: the chip offers Retry. */
class FailedError extends Error {
  override name = "FailedError";
  constructor(readonly reason: AttachReason) {
    super(reason);
  }
}

/** The upload was stopped by its × and says nothing. */
class AbortedError extends Error {
  override name = "AbortedError";
  constructor() {
    super("the upload was stopped");
  }
}

/** A decoded picture, the right way up. `close` frees an ImageBitmap. */
export interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
}

/** The api call this helper needs: `ApiClient.createAttachment` once dl-z5ja.11.3 adds it. */
export interface AttachmentPort {
  createAttachment(body: AttachmentCreate): Promise<AttachmentUpload>;
}

/** The canvas parts the re-encode uses, so a test can hand in a fake. */
export interface EncodeCanvas {
  width: number;
  height: number;
  getContext(kind: "2d"): Pick<CanvasRenderingContext2D, "drawImage"> | null;
  toBlob(done: (blob: Blob | null) => void, type: string, quality: number): void;
}

/** Just the parts of XMLHttpRequest the form post uses. */
export interface FormXhr {
  status: number;
  responseText: string;
  upload: { onprogress: ((event: ProgressEvent) => void) | null };
  onload: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
  open(method: string, url: string): void;
  send(body: FormData): void;
  abort(): void;
}

export interface UploadDeps {
  api: AttachmentPort;
  /** The browser's own decode, orientation applied; null when it cannot read the file. */
  decode: (file: Blob) => Promise<Decoded | null>;
  canvas: () => EncodeCanvas;
  xhr: () => FormXhr;
  eventId: () => EventId;
  objectUrl: { create: (blob: Blob) => string; revoke: (url: string) => void };
}

/** What a document chip calls a file that goes up as it is. */
export type DocumentKind = "pdf" | "docx" | "heic";

/** A HEIC or HEIF by its type or, when the browser gave none, its name. */
export function isHeif(file: { name: string; type: string }): boolean {
  const type = file.type.toLowerCase();
  if (/^image\/hei[cf](-sequence)?$/.test(type)) return true;
  return /\.hei[cf]$/i.test(file.name);
}

/** A PDF or a DOCX by its type or its name: these never go through the canvas. */
function documentKind(file: { name: string; type: string }): "pdf" | "docx" | null {
  const type = file.type.toLowerCase();
  if (type === PDF || /\.pdf$/i.test(file.name)) return "pdf";
  if (type === DOCX || /\.docx$/i.test(file.name)) return "docx";
  return null;
}

const MEDIA: Record<DocumentKind, AttachmentMediaType> = { pdf: PDF, docx: DOCX, heic: HEIC };

/** The size that fits `edge` on the long side, never larger than the picture. */
export function fitEdge(
  width: number,
  height: number,
  edge: number = LIMITS.attachmentEdgePx,
): { width: number; height: number } {
  const scale = Math.min(1, edge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** The qualities tried in turn: 0.85, then a tenth lower each time, down to the floor. */
export function qualities(): number[] {
  const out: number[] = [];
  for (
    let q = JPEG_QUALITY;
    q >= JPEG_QUALITY_FLOOR - 1e-9;
    q = Math.round((q - 0.1) * 100) / 100
  ) {
    out.push(q);
  }
  return out;
}

interface Encoded {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * The photo as the JPEG the store keeps: decoded by the browser, fitted to the long edge, and
 * exported at the first quality that fits the byte limit. Null when the browser cannot decode it.
 */
async function reencode(
  file: File,
  deps: Pick<UploadDeps, "decode" | "canvas">,
): Promise<Encoded | null> {
  const image = await deps.decode(file).catch(() => null);
  if (!image) return null;
  try {
    const size = fitEdge(image.width, image.height);
    const canvas = deps.canvas();
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image.source, 0, 0, size.width, size.height);
    for (const quality of qualities()) {
      const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, JPEG, quality));
      if (!blob) return null;
      if (blob.size <= LIMITS.attachmentBytes) return { blob, ...size };
    }
    throw new RefusedError("attach_too_large");
  } finally {
    image.close?.();
  }
}

/** What goes to the bucket: the re-encoded JPEG, or the original file as it is. */
export interface Prepared {
  blob: Blob;
  media_type: AttachmentMediaType;
  width?: number;
  height?: number;
  /** A document's name and kind, for its chip; absent for a JPEG. */
  document?: { name: string; kind: DocumentKind };
}

/** The original file, typed as what it is so the form's file part says so. */
function asDocument(file: File, kind: DocumentKind): Prepared {
  if (file.size === 0) throw new RefusedError("attach_unreadable");
  if (file.size > LIMITS.documentBytes) throw new RefusedError("attach_document_too_large");
  const media_type = MEDIA[kind];
  const name = file.name.trim().slice(0, NAME_MAX) || `${kind}.${kind}`;
  return {
    blob: file.slice(0, file.size, media_type),
    media_type,
    document: { name, kind },
  };
}

/**
 * The file as it goes up: a PDF or a DOCX as it is; a HEIC re-encoded when the browser decodes it
 * and as it is when it cannot; any other picture re-encoded, or refused when nothing can read it.
 */
export async function prepare(
  file: File,
  deps: Pick<UploadDeps, "decode" | "canvas">,
): Promise<Prepared> {
  const kind = documentKind(file);
  if (kind) return asDocument(file, kind);
  const encoded = await reencode(file, deps);
  if (encoded) return { ...encoded, media_type: JPEG };
  if (isHeif(file)) return asDocument(file, "heic");
  throw new RefusedError("attach_unreadable");
}

/**
 * What the bucket's refusal means to a parent. S3 answers a form POST with XML holding a `<Code>`:
 * a size outside the form's exact range, a form past its expiry, or anything else it will not take.
 */
export function bucketReason(status: number, xml: string): AttachReason {
  if (status === 0) return "attach_offline";
  const code = /<Code>([^<]*)<\/Code>/.exec(xml)?.[1] ?? "";
  const message = /<Message>([^<]*)<\/Message>/.exec(xml)?.[1] ?? "";
  if (code === "EntityTooLarge" || code === "EntityTooSmall") return "attach_changed";
  if (code === "ExpiredToken" || code === "RequestTimeout" || /expired/i.test(message)) {
    return "attach_expired";
  }
  return "attach_not_taken";
}

/** Every field of the presigned form, then the file, which S3 needs last. */
function postForm(
  form: AttachmentUploadForm,
  file: Blob,
  name: string,
  xhr: FormXhr,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((done, fail) => {
    const body = new FormData();
    for (const [key, value] of Object.entries(form.fields)) body.append(key, value);
    body.append("file", file, name);
    xhr.open("POST", form.url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) done();
      else fail(new FailedError(bucketReason(xhr.status, String(xhr.responseText ?? ""))));
    };
    xhr.onerror = () => fail(new FailedError("attach_offline"));
    xhr.onabort = () => fail(new AbortedError());
    xhr.send(body);
  });
}

/** The api's refusal as a reason: the pod's daily limit is final for today, the rest may pass. */
function apiReason(error: unknown): Error {
  const refused = error as Partial<ApiError> | null;
  if (refused?.type === "AttachmentLimitDay") return new RefusedError("attach_limit_day");
  return new FailedError(refused?.status ? "attach_not_taken" : "attach_offline");
}

type UploadState = "uploading" | "ready" | "failed" | "refused";

export interface UploadView {
  state: UploadState;
  /** 0 to 1: how much of the file the bucket has taken. */
  progress: number;
  reason: AttachReason | null;
  /** The attachment a message names, once the bucket holds it. */
  attachmentId: AttachmentId | null;
  /** An object URL of the re-encoded JPEG, the bytes Jadwigo will see; null until encoded, and
   * always null for a document, which has no thumbnail until the server renders one. */
  preview: string | null;
  /** A file that goes up as it is: its name and kind, for the document chip. */
  document: { name: string; kind: DocumentKind } | null;
}

/**
 * One file through the whole trip, as a small store the chip subscribes to. `start` prepares once;
 * `retry` keeps what it prepared and asks for a new slot under a fresh `event_id`, since a slot whose post
 * did not finish is never attached; `dispose` stops what is in flight and revokes the preview.
 */
export class PhotoUpload {
  private view: UploadView = {
    state: "uploading",
    progress: 0,
    reason: null,
    attachmentId: null,
    preview: null,
    document: null,
  };
  private prepared: Prepared | null = null;
  private xhr: FormXhr | null = null;
  private stopped = false;
  private readonly listeners = new Set<() => void>();

  constructor(
    readonly file: File,
    private readonly deps: UploadDeps,
  ) {}

  get = (): UploadView => this.view;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private set(next: Partial<UploadView>): void {
    if (this.stopped) return;
    this.view = { ...this.view, ...next };
    for (const listener of this.listeners) listener();
  }

  /** Runs the trip; resolves with the attachment id, or null when it did not upload. */
  async start(): Promise<AttachmentId | null> {
    this.set({ state: "uploading", progress: 0, reason: null, attachmentId: null });
    try {
      const id = await this.run();
      this.set({ state: "ready", progress: 1, attachmentId: id });
      return id;
    } catch (error) {
      if (error instanceof AbortedError || this.stopped) return null;
      if (error instanceof RefusedError) this.set({ state: "refused", reason: error.reason });
      else if (error instanceof FailedError) this.set({ state: "failed", reason: error.reason });
      else this.set({ state: "failed", reason: "attach_not_taken" });
      return null;
    }
  }

  /** Only a failed upload is tried again; a refused one never is. */
  retry(): Promise<AttachmentId | null> {
    if (this.view.state !== "failed") return Promise.resolve(this.view.attachmentId);
    return this.start();
  }

  dispose(): void {
    this.stopped = true;
    this.xhr?.abort();
    this.xhr = null;
    if (this.view.preview) this.deps.objectUrl.revoke(this.view.preview);
    this.listeners.clear();
  }

  private async run(): Promise<AttachmentId> {
    if (!this.prepared) {
      try {
        this.prepared = await prepare(this.file, this.deps);
      } catch (error) {
        const kind = documentKind(this.file) ?? (isHeif(this.file) ? "heic" : null);
        if (kind) this.set({ document: { name: this.file.name, kind } });
        throw error;
      }
      if (this.stopped) throw new AbortedError();
      const { blob, document } = this.prepared;
      if (document) this.set({ document });
      else this.set({ preview: this.deps.objectUrl.create(blob) });
    }
    const { blob, media_type, width, height, document } = this.prepared;
    const body: AttachmentCreate = { event_id: this.deps.eventId(), media_type, bytes: blob.size };
    if (width !== undefined && height !== undefined) {
      body.width = width;
      body.height = height;
    }
    if (document) body.name = document.name;
    let slot: AttachmentUpload;
    try {
      slot = await this.deps.api.createAttachment(body);
    } catch (error) {
      throw apiReason(error);
    }
    if (this.stopped) throw new AbortedError();
    const xhr = this.deps.xhr();
    this.xhr = xhr;
    try {
      const name = document ? document.name : "photo.jpg";
      await postForm(slot.upload, blob, name, xhr, (progress) => this.set({ progress }));
    } finally {
      this.xhr = null;
    }
    return slot.attachment.id;
  }
}

/**
 * The files a message can still take: at most `LIMITS.attachmentsPerMessage` in all, and how many
 * of `files` were left off, which the chips name in one line.
 */
export function admit(held: number, files: readonly File[]): { admitted: File[]; leftOff: number } {
  const room = Math.max(0, LIMITS.attachmentsPerMessage - held);
  return { admitted: files.slice(0, room), leftOff: Math.max(0, files.length - room) };
}
