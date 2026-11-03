/**
 * The photos a parent adds in the chat's composer (handoff dl-uukj.47.71 §4.5, dl-uukj.47.71.8):
 * each uploads as soon as it is added, as on the first screen (NewLessonBox.tsx, dl-z5ja.11.16).
 * The composer reads what may go (`ready`), why not (`reason`), and on send takes the uploaded ids;
 * each sent photo's local copy then passes to the thread (sentPreviews.ts), so the bubble shows it
 * at once. An upload still held when the composer goes is stopped.
 */

import type { AttachmentId } from "@jadwigo/contracts";
import type { CopyKey } from "@jadwigo/copy";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { keepSent } from "./attachments/sentPreviews.ts";
import { admit, PhotoUpload, type UploadDeps } from "./attachments/upload.ts";

/** Only images join a message from the chat's composer. */
export const imagesOf = (files: Iterable<File>): File[] =>
  [...files].filter((file) => file.type.startsWith("image/"));

export interface PhotoUploads {
  /** Photos can be added at all: the page has a way to upload them. */
  on: boolean;
  uploads: readonly PhotoUpload[];
  /** How many files the last add left off past the limit. */
  leftOff: number;
  add(files: File[]): void;
  /** The chip's ×: its upload is stopped already. */
  remove(upload: PhotoUpload): void;
  /** Why the photos can't go yet, or null when they can (or there are none). */
  reason: CopyKey | null;
  /** Takes the uploaded ids for a send, hands their local copies to the thread, and empties. */
  take(): AttachmentId[];
}

export function usePhotoUploads(deps: UploadDeps | null): PhotoUploads {
  const [uploads, setUploads] = useState<PhotoUpload[]>([]);
  const [leftOff, setLeftOff] = useState(0);
  const held = useRef<PhotoUpload[]>([]);
  held.current = uploads;
  // Each upload's state change draws the composer again, so the reason and Wyślij follow it.
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const offs = uploads.map((upload) => upload.subscribe(redraw));
    return () => {
      for (const off of offs) off();
    };
  }, [uploads]);
  // Whatever is still held when the composer goes is stopped; nothing of it was sent.
  useEffect(
    () => () => {
      for (const upload of held.current) upload.dispose();
    },
    [],
  );

  const add = useCallback(
    (files: File[]) => {
      if (deps === null || files.length === 0) return;
      const { admitted, leftOff: left } = admit(held.current.length, files);
      setLeftOff(left);
      if (admitted.length === 0) return;
      const added = admitted.map((file) => new PhotoUpload(file, deps));
      held.current = [...held.current, ...added];
      setUploads(held.current);
      for (const upload of added) void upload.start();
    },
    [deps],
  );
  const remove = useCallback((upload: PhotoUpload) => {
    held.current = held.current.filter((u) => u !== upload);
    setUploads(held.current);
    setLeftOff(0);
  }, []);
  const take = useCallback((): AttachmentId[] => {
    const ids: AttachmentId[] = [];
    for (const upload of held.current) {
      const id = upload.get().attachmentId;
      if (id !== null) {
        ids.push(id);
        const preview = upload.handOff();
        if (preview !== null) keepSent(id, preview);
      }
      upload.dispose();
    }
    held.current = [];
    setUploads([]);
    setLeftOff(0);
    return ids;
  }, []);

  const views = uploads.map((upload) => upload.get());
  const reason: CopyKey | null = views.some((v) => v.state === "refused")
    ? "parent_send_photo_refused"
    : views.some((v) => v.state === "failed")
      ? "parent_send_photo_failed"
      : views.some((v) => v.state === "uploading")
        ? "parent_send_uploading"
        : null;
  return { on: deps !== null, uploads, leftOff, add, remove, reason, take };
}
