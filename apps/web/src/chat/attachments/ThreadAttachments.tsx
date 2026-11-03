/**
 * What Jadwigo received with a parent's message (dl-z5ja.11.6): a strip of thumbnails under the
 * bubble, "Tak Jadwigo widzi zdjęcia". Each photo shows the local copy the first screen handed over
 * (sentPreviews.ts) until the stored copy's link is read, then the stored one, which is cached until
 * its `expires_at` and read again after. A tap opens the photo at full size. A photo that will not
 * load is a name chip, and a file with no picture (a PDF, a DOCX) is its kind and number.
 */

import type { AttachmentId, AttachmentRead } from "@jadwigo/contracts";
import type { MessageAttachment } from "@jadwigo/contracts/run";
import { copy, type Language } from "@jadwigo/copy";
import { Dialog, DialogContent, DialogTrigger } from "@jadwigo/ui";
import { FileTextIcon, ImageOffIcon } from "lucide-react";
import { type ReactElement, useEffect, useState } from "react";
import { releaseSent, sentPreview } from "./sentPreviews.ts";

/** Reads one attachment's link: `GET /api/v1/attachments/{id}`. */
export type ReadAttachment = (id: AttachmentId) => Promise<AttachmentRead>;

/** A link read back early enough that it does not expire while the page shows it. */
const MARGIN_MS = 15_000;

interface Link {
  url: string;
  preview_url: string | null;
  expires: number;
}

/** Each attachment's last link, shared by every strip on the page. */
const links = new Map<AttachmentId, Link>();

/** Reads under way, so 2 strips (or React's second mount) showing one photo ask once. */
const reading = new Map<AttachmentId, Promise<Link>>();

/** Forgets every cached link: on sign-out, and in the tests, which each start from none. */
export function forgetLinks(): void {
  links.clear();
  reading.clear();
}

function readOnce(id: AttachmentId, read: ReadAttachment): Promise<Link> {
  const under = reading.get(id);
  if (under !== undefined) return under;
  const next = read(id)
    .then((got) => {
      const link = {
        url: got.url,
        preview_url: got.preview_url,
        expires: Date.parse(got.expires_at),
      };
      links.set(id, link);
      return link;
    })
    .finally(() => reading.delete(id));
  reading.set(id, next);
  return next;
}

function fresh(link: Link | undefined, now: number): link is Link {
  return link !== undefined && link.expires - MARGIN_MS > now;
}

/** The kinds a browser shows as a picture from the stored copy itself. */
const PICTURE = new Set<MessageAttachment["media_type"]>(["image/jpeg"]);

const KIND = {
  "image/heic": "attach_kind_heic",
  "application/pdf": "attach_kind_pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "attach_kind_docx",
} as const;

function useLink(
  attachment: MessageAttachment,
  read: ReadAttachment,
  now: () => number,
): { link: Link | null; unread: boolean; reread: () => boolean } {
  const id = attachment.attachment_id;
  const cached = links.get(id);
  const [link, setLink] = useState<Link | null>(fresh(cached, now()) ? cached : null);
  const [asked, setAsked] = useState(0);
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    const known = links.get(id);
    if (fresh(known, now())) {
      setLink(known);
      return;
    }
    let live = true;
    readOnce(id, read).then(
      (next) => {
        if (live) setLink(next);
      },
      () => {
        if (!live) return;
        setLink(null);
        setUnread(true);
      },
    );
    return () => {
      live = false;
    };
  }, [id, read, now, asked]);
  return {
    link,
    unread,
    // Once per mount: a link that is already stale by this clock (a clock ahead of the server's)
    // must not loop the read.
    reread: () => {
      if (asked > 0) return false;
      links.delete(id);
      setAsked((n) => n + 1);
      return true;
    },
  };
}

function Thumb({
  attachment,
  n,
  language,
  read,
  now,
}: {
  attachment: MessageAttachment;
  n: number;
  language: Language;
  read: ReadAttachment;
  now: () => number;
}): ReactElement {
  const id = attachment.attachment_id;
  const { link, unread, reread } = useLink(attachment, read, now);
  const [failed, setFailed] = useState(false);
  const local = sentPreview(id);
  const stored =
    link === null ? null : PICTURE.has(attachment.media_type) ? link.url : link.preview_url;
  const src = stored ?? local;
  const alt = copy(language, "attach_photo_alt", { n }, "adult");
  const chip =
    "flex h-20 w-16 flex-col items-center justify-center gap-1 rounded-jw-small border-jw border-jw-line bg-jw-ground text-jw-page-small text-jw-ink-soft";

  if (src === null && !PICTURE.has(attachment.media_type)) {
    const kind = KIND[attachment.media_type as keyof typeof KIND];
    return (
      <span className={chip} data-attachment={id} data-kind="document">
        <FileTextIcon aria-hidden className="size-5" />
        {copy(language, kind, {}, "adult")}
      </span>
    );
  }
  // A stored copy that never comes (its read failed, or its picture would not load) is a name chip,
  // and the local copy goes with it.
  const gone = failed || (unread && local === null);
  if (gone || src === null) {
    return (
      <span
        className={chip}
        data-attachment={id}
        data-kind={gone ? "failed" : "loading"}
        role="img"
        aria-label={gone ? copy(language, "chat_photo_unloaded", { n }, "adult") : alt}
      >
        {gone && <ImageOffIcon aria-hidden className="size-5" />}
        {gone && alt}
      </span>
    );
  }
  const onError = () => {
    // An expired link is read again once; a stored copy that still fails is a name chip.
    if (src === stored && link !== null && !fresh(link, now()) && reread()) return;
    const kept = releaseSent(id);
    if (kept !== null) URL.revokeObjectURL(kept);
    setFailed(true);
  };
  const onLoad = () => {
    if (src !== stored) return;
    const kept = releaseSent(id);
    if (kept !== null) URL.revokeObjectURL(kept);
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="h-20 w-16 overflow-hidden rounded-jw-small border-jw border-jw-line focus-visible:outline-3 focus-visible:outline-jw-focus"
          aria-label={copy(language, "chat_photo_open", { n }, "adult")}
          data-attachment={id}
          data-source={src === stored ? "stored" : "local"}
        >
          <img
            src={src}
            alt={alt}
            className="size-full object-cover"
            onLoad={onLoad}
            onError={onError}
          />
        </button>
      </DialogTrigger>
      <DialogContent title={alt} className="max-w-[90vw]">
        <img
          src={src}
          alt={alt}
          className="max-h-[75vh] w-full rounded-jw-small object-contain"
          data-full-size
        />
      </DialogContent>
    </Dialog>
  );
}

export interface ThreadAttachmentsProps {
  language: Language;
  attachments: readonly MessageAttachment[];
  read: ReadAttachment;
  /** The clock a link's expiry is checked against. */
  now?: () => number;
}

export function ThreadAttachments({
  language,
  attachments,
  read,
  now = Date.now,
}: ThreadAttachmentsProps): ReactElement | null {
  if (attachments.length === 0) return null;
  return (
    // ph-no-capture: a photo of homework may show a child's name or handwriting (dl-z5ja.140).
    <figure className="ph-no-capture flex flex-col items-end gap-1" data-thread-attachments>
      <ul className="flex flex-wrap justify-end gap-2">
        {attachments.map((attachment, i) => (
          <li key={attachment.attachment_id}>
            <Thumb attachment={attachment} n={i + 1} language={language} read={read} now={now} />
          </li>
        ))}
      </ul>
      <figcaption className="text-jw-page-small text-jw-ink-soft">
        {copy(language, "chat_photos_received", {}, "adult")}
      </figcaption>
    </figure>
  );
}
