/**
 * The dev workspace's made-up family (dl-uukj.47.27): 2 learners and the parent's first words. No
 * real learner's data; the names are the ones the repo's other fixtures already use.
 */

import { ID_PREFIXES, idOf, Learner, LessonGiven } from "@jadwigo/contracts";

export const POD = "pod_6et2fhbnwvb45aw9atcfzs33za";
export const ACCOUNT = "acc_6et2fhbnwvb45aw9atcfzs33zb";
const CREATED = "2026-08-01T09:00:00.000Z";

const learner = (id: string, handle: string, first_name: string, school_grade: number) =>
  Learner.parse({
    id,
    pod_id: POD,
    handle,
    first_name,
    age_group: null,
    country: "PL",
    curriculum_id: null,
    school_grade,
    school_language: "pl",
    created_at: CREATED,
  });

export const LEARNERS: readonly Learner[] = [
  learner("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq", "ola", "Ola", 1),
  learner("lrn_2h4m8gyw0fb1cvz2nkqw0px8fr", "kasztan", "Kasztan", 2),
];

/** What the made-up parent asks for first: the turn the page plays when it opens. */
export const FIRST_WORDS = "Dodawanie do 20 dla 1 klasy.";

/**
 * What giving the lesson answers here (dl-1eieq.1): a made-up assignment of a made-up version, with
 * no network and nothing stored, so the dev page can show Daj lekcję through to its link. The
 * player has no such assignment: its link leads to "no such lesson".
 */
export function madeUpGiven(): LessonGiven {
  const lesson = idOf(ID_PREFIXES.lesson, crypto.randomUUID());
  const version = idOf(ID_PREFIXES.lesson_version, crypto.randomUUID());
  return LessonGiven.parse({
    assignment: {
      id: idOf(ID_PREFIXES.assignment, crypto.randomUUID()),
      pod_id: POD,
      lesson_id: lesson,
      lesson_version_id: version,
      audience: "anyone",
      identity: "none",
      after_not_sure: "next",
      hold_verdicts: false,
      opens_at: null,
      closes_at: null,
      created_at: CREATED,
    },
    lesson_version: {
      id: version,
      pod_id: POD,
      lesson_id: lesson,
      version: 1,
      revises: null,
      published_at: CREATED,
    },
  });
}
