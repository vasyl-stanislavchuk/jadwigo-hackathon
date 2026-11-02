/**
 * The things the chat can open (dl-uukj.47.58): a lesson, a learner, a skill, an assignment or an
 * attempt, each by its id. Jadwigo's form of PostHog's object kinds
 * (`docs/research/chat-objects.md`): a tool widget draws what a step did, and an object ref names a
 * thing the parent can open beside the chat for its details.
 *
 * A ref travels in the page's URL as `?open=<kind>:<id>`, so a reload or a shared link keeps the
 * same thing open. A lesson is named by its conversation: the lesson a conversation writes has no
 * other id before it is given.
 */

import { AssignmentId, AttemptId, ConversationId, LearnerId, SkillId } from "@jadwigo/contracts";

const OBJECT_KINDS = ["lesson", "learner", "skill", "assignment", "attempt"] as const;
export type ObjectKind = (typeof OBJECT_KINDS)[number];

/** One thing to open, by its kind and id. */
export interface ObjectRef {
  kind: ObjectKind;
  id: string;
}

/** Each kind's id, read through the contracts' parser, so a ref never carries a malformed id. */
const ID_OF: Readonly<Record<ObjectKind, { safeParse(value: unknown): { success: boolean } }>> = {
  lesson: ConversationId,
  learner: LearnerId,
  skill: SkillId,
  assignment: AssignmentId,
  attempt: AttemptId,
};

/** The query parameter a ref travels in. */
export const OPEN_PARAM = "open";

const isKind = (value: string): value is ObjectKind =>
  (OBJECT_KINDS as readonly string[]).includes(value);

/** A ref from its kind and id, or null when the id does not parse as that kind's. */
export function objectRef(kind: ObjectKind, id: string): ObjectRef | null {
  return ID_OF[kind].safeParse(id).success ? { kind, id } : null;
}

/** `?open`'s value as a ref, or null when absent, of an unknown kind, or with a malformed id. */
export function parseOpen(value: string | null): ObjectRef | null {
  if (value === null) return null;
  const at = value.indexOf(":");
  if (at <= 0) return null;
  const kind = value.slice(0, at);
  return isKind(kind) ? objectRef(kind, value.slice(at + 1)) : null;
}

/** A ref as `?open`'s value. */
export const formatOpen = (ref: ObjectRef): string => `${ref.kind}:${ref.id}`;

/** Whether 2 refs name the same thing. */
export const sameObject = (a: ObjectRef | null, b: ObjectRef | null): boolean =>
  a !== null && b !== null && a.kind === b.kind && a.id === b.id;
