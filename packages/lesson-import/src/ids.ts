import { createHash } from "node:crypto";
import {
  AssignmentId,
  ID_PREFIXES,
  idOf,
  LessonId,
  LessonQuestionId,
  PodId,
  Uuid,
  uuidOf,
} from "@jadwigo/contracts";
import type { NewPod } from "@jadwigo/store";

/**
 * The ids an import writes are uuid v5 (RFC 9562, sha1), named under the pod's uuid, so importing a
 * file twice hits the same rows (decision
 * `2026-10-27-jadwigo-ids-are-uuid-v4-in-the-database-written-as-a-prefix-and`). The names:
 *
 * | Record | Name under the pod's uuid |
 * | --- | --- |
 * | lesson | `lesson/<file id>` |
 * | lesson question | `question/<file id>/<step id>/<content hash>`, a twin `<step id>t` |
 * | featured assignment | `assignment/<file id>` |
 *
 * A lesson question is written once, so its content hash is in its name: an edited question is a
 * new row and a new version, never a refused write. A lesson version keeps the store's v4 id.
 */

/** The namespace the featured pod's own uuid is named under. Fixed for good: every id hangs off it. */
export const IMPORT_NAMESPACE = Uuid.parse("a54b1238-9d13-4345-9e54-79da54d11c86");

export function uuidV5(namespace: Uuid, name: string): Uuid {
  const hash = createHash("sha1")
    .update(Buffer.from(namespace.replaceAll("-", ""), "hex"))
    .update(name, "utf8")
    .digest()
    .subarray(0, 16);
  hash.writeUInt8((hash.readUInt8(6) & 0x0f) | 0x50, 6);
  hash.writeUInt8((hash.readUInt8(8) & 0x3f) | 0x80, 8);
  const hex = hash.toString("hex");
  return Uuid.parse(
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`,
  );
}

/** Jadwigo's own pod, which holds the featured lessons (`docs/research/core-data-model.md`). */
export const FEATURED_POD: NewPod = {
  id: PodId.parse(idOf(ID_PREFIXES.pod, uuidV5(IMPORT_NAMESPACE, "pod/jadwigo"))),
  name: "Jadwigo",
  language: "pl",
};

/**
 * The pod a single draft is imported into (`make lesson-import`, `jw lesson_check`'s play path), so
 * a test draft plays at its own path but never joins `GET /api/v1/featured-lessons`, which lists the
 * featured pod's assignments only (dl-e8ov.2.59). Named under `IMPORT_NAMESPACE` like the featured
 * pod, and fixed for good the same way.
 */
export const DRAFTS_POD: NewPod = {
  id: PodId.parse(idOf(ID_PREFIXES.pod, uuidV5(IMPORT_NAMESPACE, "pod/jadwigo-drafts"))),
  name: "Jadwigo drafts",
  language: "pl",
};

function named(pod: PodId, name: string): Uuid {
  return uuidV5(uuidOf(ID_PREFIXES.pod, pod), name);
}

export function lessonIdFor(pod: PodId, fileId: string): LessonId {
  return LessonId.parse(idOf(ID_PREFIXES.lesson, named(pod, `lesson/${fileId}`)));
}

export function lessonQuestionIdFor(
  pod: PodId,
  fileId: string,
  stepId: string,
  contentHash: string,
): LessonQuestionId {
  return LessonQuestionId.parse(
    idOf(ID_PREFIXES.lesson_question, named(pod, `question/${fileId}/${stepId}/${contentHash}`)),
  );
}

/** The featured assignment of a lesson file: what the playground starts an attempt on. */
export function featuredAssignmentId(fileId: string, pod: PodId = FEATURED_POD.id): AssignmentId {
  return AssignmentId.parse(idOf(ID_PREFIXES.assignment, named(pod, `assignment/${fileId}`)));
}
