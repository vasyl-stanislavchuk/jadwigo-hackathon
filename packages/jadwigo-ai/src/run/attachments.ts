import { ID_PREFIXES, type PodId, uuidOf } from "@jadwigo/contracts";
import type { MessageAttachment } from "@jadwigo/contracts/run";

/**
 * Where the runner reads a parent's photo (dl-z5ja.11.4, wave 5 Lead decision 53): S3's GetObject
 * in `apps/runner`, a map in tests. `undefined` when no object is stored at the path; any other
 * failure throws, and the step is retried.
 */
export interface AttachmentReader {
  read(storage_path: string): Promise<Uint8Array | undefined>;
}

/**
 * Whether `storage_path` is a photo of `pod`: the runner trusts only a key under
 * `pods/<the run's pod>/attachments/` (the review of #578), the pod named by its id or its uuid,
 * so a message can never point the runner at another pod's object or at the pending prefix.
 */
export function ownPath(pod: PodId, storage_path: string): boolean {
  const rest = [`pods/${pod}/attachments/`, `pods/${uuidOf(ID_PREFIXES.pod, pod)}/attachments/`]
    .filter((prefix) => storage_path.startsWith(prefix))
    .map((prefix) => storage_path.slice(prefix.length));
  return rest.some((name) => name.length > 0 && !name.includes("/") && !name.includes(".."));
}

/** A photo's bytes as the `data:` URL an `input_image` part carries. */
export function dataUrl(media_type: MessageAttachment["media_type"], bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${media_type};base64,${btoa(binary)}`;
}

/** Why the converter would not render a file (dl-z5ja.11.8's stable codes, and `unavailable`). */
export type ConvertRefusal = "too_many_pages" | "encrypted" | "unreadable" | "unavailable";

/** One page the converter wrote: a JPEG under the file's own folder, `<id>/p<n>.jpg`. */
export interface ConvertedPage {
  storage_path: string;
  width: number;
  height: number;
  bytes: number;
}

/** The converter's answer: the file's pages in order, or why it refused. */
export type Converted = { pages: readonly ConvertedPage[] } | { refused: ConvertRefusal };

/**
 * Where the runner turns a HEIC, a PDF or a DOCX into page JPEGs (dl-z5ja.11.7, wave 6 decision
 * 59): the converter Lambda in `apps/runner`, a fake in tests. A second call for the same file
 * answers the pages it wrote the first time. A refusal is an answer; a failure to reach the
 * converter throws, and the step is retried.
 */
export interface Converter {
  pages(attachment: MessageAttachment, pod: PodId): Promise<Converted>;
}

/**
 * Whether `page` is a page the converter wrote for `storage_path`, a file `ownPath` already
 * trusts: `<its path without the extension>/p<n>.jpg` and nothing else, so a converter's answer
 * can never point the runner at another file, another pod or the pending prefix.
 */
export function ownPage(pod: PodId, storage_path: string, page: string): boolean {
  if (!ownPath(pod, storage_path)) return false;
  const name = storage_path.slice(storage_path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  const folder =
    dot > 0 ? storage_path.slice(0, storage_path.length - name.length + dot) : storage_path;
  return page.startsWith(`${folder}/`) && /^p[1-9][0-9]*\.jpg$/.test(page.slice(folder.length + 1));
}
