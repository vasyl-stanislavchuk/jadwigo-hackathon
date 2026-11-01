/**
 * Doubles for `UploadDeps`, shared by upload.test.ts and AttachmentChips.test.tsx. Every picture
 * here is synthetic: sizes and byte counts made in code, never a photo.
 */

import {
  Attachment,
  type AttachmentCreate,
  type AttachmentUpload,
  EventId,
  ID_PREFIXES,
  idOf,
} from "@jadwigo/contracts";
import type { Decoded, EncodeCanvas, FormXhr, UploadDeps } from "./upload.ts";

const uuid = (n: number): string => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

/** A picture of the given size that the fake canvas can draw. */
export const picture = (width: number, height: number): Decoded => ({
  source: {} as CanvasImageSource,
  width,
  height,
});

/** A file by name and type, with a few bytes in it. */
export const fileOf = (name: string, type: string, bytes = 16): File =>
  new File([new Uint8Array(bytes)], name, { type });

/** A canvas whose JPEG weighs `sizeAt(quality, width, height)` bytes, recording what it drew. */
class FakeCanvas implements EncodeCanvas {
  width = 0;
  height = 0;
  readonly drawn: { width: number; height: number }[] = [];
  readonly tried: number[] = [];
  readonly types: string[] = [];
  constructor(private readonly sizeAt: (quality: number) => number = () => 1000) {}
  getContext(): Pick<CanvasRenderingContext2D, "drawImage"> {
    return {
      drawImage: ((_source: CanvasImageSource, _x: number, _y: number, w: number, h: number) => {
        this.drawn.push({ width: w, height: h });
      }) as CanvasRenderingContext2D["drawImage"],
    };
  }
  toBlob(done: (blob: Blob | null) => void, type: string, quality: number): void {
    this.tried.push(quality);
    this.types.push(type);
    done(new Blob([new Uint8Array(this.sizeAt(quality))], { type }));
  }
}

/** An XHR the test answers by hand. */
class FakeXhr implements FormXhr {
  status = 0;
  responseText = "";
  upload: FormXhr["upload"] = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  url = "";
  body: FormData | null = null;
  aborted = false;
  open(_method: string, url: string): void {
    this.url = url;
  }
  send(body: FormData): void {
    this.body = body;
  }
  abort(): void {
    this.aborted = true;
    this.onabort?.();
  }
  progress(loaded: number, total: number): void {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total } as ProgressEvent);
  }
  answer(status: number, text = ""): void {
    this.status = status;
    this.responseText = text;
    this.onload?.();
  }
  drop(): void {
    this.onerror?.();
  }
}

/** The api double: each create answers a new attachment and form, numbered from 1. */
export class FakeApi {
  readonly bodies: AttachmentCreate[] = [];
  refuse: unknown = null;
  async createAttachment(body: AttachmentCreate): Promise<AttachmentUpload> {
    this.bodies.push(body);
    if (this.refuse) throw this.refuse;
    const n = this.bodies.length;
    const attachment = Attachment.parse({
      id: idOf(ID_PREFIXES.attachment, uuid(n)),
      pod_id: idOf(ID_PREFIXES.pod, uuid(900)),
      account_id: idOf(ID_PREFIXES.account, uuid(901)),
      event_id: body.event_id,
      state: "pending",
      media_type: body.media_type,
      bytes: body.bytes,
      width: body.width ?? null,
      height: body.height ?? null,
      name: body.name ?? null,
      conversation_id: null,
      storage_path: null,
      created_at: "2026-09-01T08:00:00.000Z",
      expires_at: "2026-09-02T08:00:00.000Z",
      attached_at: null,
    });
    return {
      attachment,
      upload: {
        url: "https://uploads.invalid/",
        fields: {
          key: `pending/pod/${attachment.id}`,
          "Content-Type": body.media_type,
          policy: `p${n}`,
        },
        expires_at: "2026-09-01T08:10:00.000Z",
      },
    };
  }
}

export interface Harness {
  deps: UploadDeps;
  api: FakeApi;
  canvas: FakeCanvas;
  xhrs: FakeXhr[];
  revoked: string[];
}

/** Deps where `decode` reads `decoded` (null: the browser cannot read the file). */
export function harness(
  options: { decoded?: Decoded | null; sizeAt?: (quality: number) => number } = {},
): Harness {
  const api = new FakeApi();
  const canvas = new FakeCanvas(options.sizeAt);
  const xhrs: FakeXhr[] = [];
  const revoked: string[] = [];
  let events = 0;
  let urls = 0;
  const deps: UploadDeps = {
    api,
    decode: async () => (options.decoded === undefined ? picture(4000, 3000) : options.decoded),
    canvas: () => canvas,
    xhr: () => {
      const xhr = new FakeXhr();
      xhrs.push(xhr);
      return xhr;
    },
    eventId: () => {
      events += 1;
      return EventId.parse(uuid(events));
    },
    objectUrl: {
      create: () => {
        urls += 1;
        return `blob:photo-${urls}`;
      },
      revoke: (url) => {
        revoked.push(url);
      },
    },
  };
  return { deps, api, canvas, xhrs, revoked };
}

/** Lets pending promises run, so the upload reaches its next await. */
export const settle = async (): Promise<void> => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};
