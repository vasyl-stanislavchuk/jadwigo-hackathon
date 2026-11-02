/**
 * The dev workspace's made-up family (dl-uukj.47.27): 2 learners and the parent's first words. No
 * real learner's data; the names are the ones the repo's other fixtures already use.
 */

import { Learner } from "@jadwigo/contracts";

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
