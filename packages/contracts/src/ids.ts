import { z } from "zod";

/**
 * Ids are uuid columns in Postgres. On the wire and in jw, an id is its record's prefix and the
 * uuid as 26 lowercase Crockford base32 characters (RULES.md rule 8, decision
 * `2026-10-27-jadwigo-ids-are-uuid-v4-in-the-database-written-as-a-prefix-and`). 26 characters
 * hold 130 bits, so the first one is 0 to 7.
 */
export const ID_PREFIXES = {
  pod: "pod_",
  learner: "lrn_",
  lesson: "les_",
  lesson_version: "lesv_",
  lesson_question: "lq_",
  lesson_question_example: "lqx_",
  assignment: "asg_",
  attempt: "att_",
} as const;
export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];

const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
const BODY = "[0-7][0-9a-hjkmnp-tv-z]{25}";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A uuid in its canonical lowercase form, as Postgres prints it. */
export const Uuid = z.string().regex(UUID, "a uuid in lowercase, 8-4-4-4-12").brand<"Uuid">();
export type Uuid = z.infer<typeof Uuid>;

/** The 26 characters after the prefix, for a uuid. */
export function encodeUuid(uuid: string): string {
  if (!UUID.test(uuid)) throw new Error(`not a lowercase uuid: ${uuid}`);
  let n = BigInt(`0x${uuid.replaceAll("-", "")}`);
  let out = "";
  for (let i = 0; i < 26; i++) {
    out = `${ALPHABET[Number(n & 31n)]}${out}`;
    n >>= 5n;
  }
  return out;
}

/** The uuid for 26 characters after the prefix. */
export function decodeUuid(body: string): Uuid {
  if (!new RegExp(`^${BODY}$`).test(body)) throw new Error(`not 26 base32 characters: ${body}`);
  let n = 0n;
  for (const c of body) n = (n << 5n) | BigInt(ALPHABET.indexOf(c));
  const hex = n.toString(16).padStart(32, "0");
  return Uuid.parse(
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`,
  );
}

/** The wire id for a record's uuid: `les_` and 26 characters. */
export function idOf<P extends IdPrefix>(prefix: P, uuid: string): `${P}${string}` {
  return `${prefix}${encodeUuid(uuid)}`;
}

/** The uuid inside a wire id, checked against the prefix it must carry. */
export function uuidOf(prefix: IdPrefix, id: string): Uuid {
  if (!id.startsWith(prefix)) throw new Error(`an id here starts ${prefix}: ${id}`);
  return decodeUuid(id.slice(prefix.length));
}

function prefixedId<B extends string>(prefix: IdPrefix, record: string) {
  return z
    .string()
    .regex(new RegExp(`^${prefix}${BODY}$`), `${record} id is ${prefix} and 26 base32 characters`)
    .brand<B>();
}

/**
 * The branded ids. The brand means a plain string is not a LessonId: the only way to get one is
 * through these parsers, so every id in the system has been checked once at the edge.
 */
export const PodId = prefixedId<"PodId">(ID_PREFIXES.pod, "a pod");
export type PodId = z.infer<typeof PodId>;
/**
 * Jadwigo's own pod, which holds the featured lessons: lesson import names it under its namespace
 * (`packages/lesson-import/src/ids.ts`, whose test pins this value), and `GET /api/v1/featured-lessons`
 * lists its open assignments (owner, 2026-10-28: the featured list is this pod's only).
 */
export const FEATURED_POD_ID = PodId.parse("pod_6et2fhbnwvb45aw9atcfzs33za");

export const LearnerId = prefixedId<"LearnerId">(ID_PREFIXES.learner, "a learner");
export type LearnerId = z.infer<typeof LearnerId>;
export const LessonId = prefixedId<"LessonId">(ID_PREFIXES.lesson, "a lesson");
export type LessonId = z.infer<typeof LessonId>;
export const LessonVersionId = prefixedId<"LessonVersionId">(
  ID_PREFIXES.lesson_version,
  "a lesson version",
);
export type LessonVersionId = z.infer<typeof LessonVersionId>;
export const LessonQuestionId = prefixedId<"LessonQuestionId">(
  ID_PREFIXES.lesson_question,
  "a lesson question",
);
export type LessonQuestionId = z.infer<typeof LessonQuestionId>;
export const LessonQuestionExampleId = prefixedId<"LessonQuestionExampleId">(
  ID_PREFIXES.lesson_question_example,
  "a lesson question example",
);
export type LessonQuestionExampleId = z.infer<typeof LessonQuestionExampleId>;
export const AssignmentId = prefixedId<"AssignmentId">(ID_PREFIXES.assignment, "an assignment");
export type AssignmentId = z.infer<typeof AssignmentId>;
export const AttemptId = prefixedId<"AttemptId">(ID_PREFIXES.attempt, "an attempt");
export type AttemptId = z.infer<typeof AttemptId>;

/** The id the page mints for one write, so a replay is recognised. The bare uuid, no prefix. */
export const EventId = z.string().regex(UUID, "an event id is a lowercase uuid").brand<"EventId">();
export type EventId = z.infer<typeof EventId>;

/** Every id schema with its prefix, for the naming test and the snapshots. */
export const ID_SCHEMAS = {
  pod_id: PodId,
  learner_id: LearnerId,
  lesson_id: LessonId,
  lesson_version_id: LessonVersionId,
  lesson_question_id: LessonQuestionId,
  lesson_question_example_id: LessonQuestionExampleId,
  assignment_id: AssignmentId,
  attempt_id: AttemptId,
} as const;
