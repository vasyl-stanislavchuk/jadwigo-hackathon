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
