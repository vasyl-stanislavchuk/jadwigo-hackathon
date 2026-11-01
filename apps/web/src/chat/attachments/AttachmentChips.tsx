/**
 * A message's photos and documents as 64 × 80 chips (the first screen's, PR #547). A photo shows the
 * re-encoded JPEG; a PDF, a DOCX or a HEIC the browser could not decode shows a document chip, an
 * icon, its kind and its name, until the server renders a preview (wave 6 decision 61,
 * dl-z5ja.11.12). Each chip is in one of 4 states:
 *
 *   uploading  a progress ring over the thumbnail
 *   ready      the thumbnail alone
 *   failed     Retry over the thumbnail, and its reason underneath
 *   refused    its reason underneath, and no Retry: the same photo would never pass
 *
 * Each has ×, which stops its upload and revokes its preview. Past `LIMITS.attachmentsPerMessage`,
 * one line says how many were left off. The thumbnail is the re-encoded JPEG, so the parent sees
 * the photo the right way up and as Jadwigo will (dl-z5ja.11.5). The workspace chat's composer
 * shares this with the first screen.
 */

import { LIMITS } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { FileTextIcon, RotateCwIcon, XIcon } from "lucide-react";
import { type ReactElement, useId, useSyncExternalStore } from "react";
import type { DocumentKind, PhotoUpload } from "./upload.ts";

const KIND_KEY = {
  pdf: "attach_kind_pdf",
  docx: "attach_kind_docx",
  heic: "attach_kind_heic",
} as const satisfies Record<DocumentKind, CopyKey>;

/** The size limit a reason may name, in whole MB. */
const DOCUMENT_MB = Math.round(LIMITS.documentBytes / (1024 * 1024));

/** What a chip is called: "Zdjęcie 2" for a photo, "Plik 2" for a file that goes up as it is. */
function label(language: Language, upload: PhotoUpload, n: number): string {
  return copy(language, upload.get().document ? "attach_file_alt" : "attach_photo_alt", { n });
}

const RING_RADIUS = 14;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export interface AttachmentChipsProps {
  language: Language;
  uploads: readonly PhotoUpload[];
  /** How many photos did not fit under the per-message limit (`admit` counts them). */
  leftOff?: number;
  /** The chip's × was pressed; the upload is already stopped and its preview revoked. */
  onRemove: (upload: PhotoUpload) => void;
}

export function AttachmentChips({
  language,
  uploads,
  leftOff = 0,
  onRemove,
}: AttachmentChipsProps): ReactElement | null {
  const id = useId();
  if (uploads.length === 0 && leftOff === 0) return null;
  return (
    <div className="flex flex-col gap-2" data-attachments>
      {uploads.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {uploads.map((upload, index) => (
            <Chip
              key={chipKey(upload)}
              language={language}
              upload={upload}
              n={index + 1}
              reasonId={`${id}-${index}`}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
      <Reasons language={language} uploads={uploads} id={id} />
      {leftOff > 0 && (
        <p className="text-jw-page-small text-jw-ink-soft" data-left-off>
          {copy(language, "attach_left_off", { max: LIMITS.attachmentsPerMessage, n: leftOff })}
        </p>
      )}
    </div>
  );
}

const keys = new WeakMap<PhotoUpload, string>();
let nextKey = 0;
/** A stable React key per upload: two picks of the same file are still 2 chips. */
function chipKey(upload: PhotoUpload): string {
  let key = keys.get(upload);
  if (key === undefined) {
    nextKey += 1;
    key = `photo-${nextKey}`;
    keys.set(upload, key);
  }
  return key;
}

function useView(upload: PhotoUpload) {
  return useSyncExternalStore(upload.subscribe, upload.get, upload.get);
}

function Chip({
  language,
  upload,
  n,
  reasonId,
  onRemove,
}: {
  language: Language;
  upload: PhotoUpload;
  n: number;
  reasonId: string;
  onRemove: (upload: PhotoUpload) => void;
}): ReactElement {
  const view = useView(upload);
  const percent = Math.round(view.progress * 100);
  const alt = label(language, upload, n);
  return (
    <li
      className="relative h-20 w-16"
      data-chip={view.state}
      aria-describedby={view.reason ? reasonId : undefined}
    >
      {view.document ? (
        <div
          role="img"
          aria-label={`${alt}: ${view.document.name}`}
          className={cn(
            "flex size-full flex-col items-center gap-0.5 overflow-hidden rounded-jw-small border-jw border-jw-line bg-jw-card px-1 pt-2 text-jw-ink",
            view.state === "refused" && "opacity-50",
          )}
          data-document={view.document.kind}
        >
          <FileTextIcon aria-hidden className="size-5 shrink-0 text-jw-ink-soft" />
          <span className="text-jw-page-small font-bold leading-tight">
            {copy(language, KIND_KEY[view.document.kind])}
          </span>
          <span className="line-clamp-2 w-full break-all text-center text-jw-page-small leading-tight text-jw-ink-soft">
            {view.document.name}
          </span>
        </div>
      ) : view.preview ? (
        <img
          src={view.preview}
          alt={alt}
          className={cn(
            "size-full rounded-jw-small border-jw border-jw-line object-cover",
            view.state === "refused" && "opacity-50",
          )}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="size-full rounded-jw-small border-jw border-jw-line bg-jw-ground"
        />
      )}
      {view.state === "uploading" && (
        <div className="absolute inset-0 grid place-items-center">
          <svg
            viewBox="0 0 32 32"
            className="size-8 -rotate-90 text-jw-act"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={copy(language, "attach_uploading", { percent })}
          >
            <circle
              cx="16"
              cy="16"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="3"
              className="stroke-jw-card"
            />
            <circle
              cx="16"
              cy="16"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="3"
              stroke="currentColor"
              strokeLinecap="round"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - view.progress)}
            />
          </svg>
        </div>
      )}
      {view.state === "failed" && (
        <div className="absolute inset-0 grid place-items-center">
          <button
            type="button"
            aria-label={copy(language, "attach_retry")}
            onClick={() => void upload.retry()}
            className="grid size-8 place-items-center rounded-full border-jw border-jw-line bg-jw-card text-jw-ink hover:bg-jw-act-quiet focus-visible:outline-3 focus-visible:outline-jw-focus"
            data-retry
          >
            <RotateCwIcon aria-hidden className="size-4" />
          </button>
        </div>
      )}
      <button
        type="button"
        aria-label={copy(language, "parent_remove_photo")}
        onClick={() => {
          upload.dispose();
          onRemove(upload);
        }}
        className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border-jw border-jw-line bg-jw-card text-jw-ink-soft hover:text-jw-ink focus-visible:outline-3 focus-visible:outline-jw-focus"
        data-remove
      >
        <XIcon aria-hidden className="size-3.5" />
      </button>
    </li>
  );
}

/** One line under the thumbnails for each photo that did not upload, naming it by its number. */
function Reasons({
  language,
  uploads,
  id,
}: {
  language: Language;
  uploads: readonly PhotoUpload[];
  id: string;
}): ReactElement {
  return (
    <>
      {uploads.map((upload, index) => (
        <Reason
          key={chipKey(upload)}
          language={language}
          upload={upload}
          n={index + 1}
          id={`${id}-${index}`}
        />
      ))}
    </>
  );
}

function Reason({
  language,
  upload,
  n,
  id,
}: {
  language: Language;
  upload: PhotoUpload;
  n: number;
  id: string;
}): ReactElement | null {
  const view = useView(upload);
  if (!view.reason) return null;
  return (
    <p id={id} className="text-jw-page-small text-jw-ink-soft" data-reason={view.state}>
      {`${label(language, upload, n)}: ${copy(language, view.reason, { mb: DOCUMENT_MB })}`}
    </p>
  );
}
