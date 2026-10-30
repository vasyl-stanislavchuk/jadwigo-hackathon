/**
 * A made-up learner's knowledge base for the learner page's tests and its e2e spec: no real
 * learner's data. Times are data, never the clock: the weeks run up to the unit tests' FIXED_NOW,
 * Tuesday 2026-09-01, whose Warsaw week starts Monday 2026-08-31.
 */

import {
  type LearnerAttempt,
  LearnerAttempts,
  LearnerId,
  type LearnerReport,
  LearnerReports,
  LearnerSkills,
  type SkillId,
} from "@jadwigo/contracts";

const POD = "pod_6et2fhbnwvb45aw9atcfzs33za";
const ACCOUNT = "acc_6et2fhbnwvb45aw9atcfzs33zb";
const CREATED = "2026-08-01T09:00:00.000Z";
export const LEARNER = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");

/** Report ids and goal ids by a 1-digit number. */
const reportId = (n: number): string => `rpt_43007b83dp9w2tnfjxhha74cy${n}`;
const goalId = (n: number): string => `gol_43007b83dp9w2tnfjxhha74cy${n}`;
const attemptId = (n: number): string => `att_43007b83dp9w2tnfjxhha74cy${n}`;

export const ADD_10 = "math.add.within-10" as SkillId;
export const ADD_20 = "math.add.within-20" as SkillId;
export const TAKE_AWAY = "math.sub.take-away-to-10" as SkillId;
export const GROUPS = "math.mul.equal-groups" as SkillId;

const learner = {
  id: LEARNER,
  pod_id: POD,
  handle: "ola",
  first_name: "Ola",
  age_group: null,
  country: "PL",
  curriculum_id: null,
  school_grade: 1,
  school_language: "pl",
  created_at: CREATED,
};

function skill(code: string, canDo: unknown) {
  return {
    pod_id: POD,
    code,
    topic_id: null,
    kind: "accuracy",
    status: "reviewed",
    can_do: canDo,
    aliases: [],
    prerequisites: [],
    source: "bank",
    created_at: CREATED,
  };
}

function mastery(code: string, level: string, needsAttention = false) {
  return {
    pod_id: POD,
    learner_id: LEARNER,
    skill_code: code,
    level,
    needs_attention: needsAttention,
    tries: 4,
    last_answered_at: "2026-08-31T15:00:00.000Z",
    due_at: null,
    computed_at: "2026-08-31T15:05:00.000Z",
  };
}

function goal(n: number, name: string) {
  return {
    id: goalId(n),
    pod_id: POD,
    learner_id: LEARNER,
    name,
    words: null,
    lesson_language: "pl",
    status: "active",
    created_at: CREATED,
  };
}

/** 2 goals: one on its way with a skill in each list (one worded by a reviewed line, one by a
 * draft line that is not shown, one by its code), one not started with every list empty. */
export const SKILLS: LearnerSkills = LearnerSkills.parse({
  learner,
  skills: [
    mastery(ADD_10, "familiar"),
    mastery(TAKE_AWAY, "attempted", true),
    mastery(GROUPS, "attempted"),
  ],
  catalogue: [
    skill(ADD_10, {
      pl: { child: "Umiem dodawać do 10.", parent: "Dodaje w zakresie 10.", reviewed: true },
      en: { child: "I can add within 10.", parent: "Adds within 10.", reviewed: true },
    }),
    skill(ADD_20, {
      pl: { child: "Umiem dodawać do 20.", parent: "Dodaje w zakresie 20.", reviewed: false },
    }),
    skill(TAKE_AWAY, null),
    skill(GROUPS, null),
  ],
  goals: [
    {
      goal: goal(1, "Dodawanie i odejmowanie"),
      skill_codes: [ADD_10, ADD_20, TAKE_AWAY],
      status: "on_its_way",
      can_do_now: [ADD_10],
      needs_attention: [TAKE_AWAY],
      next: [ADD_20],
    },
    {
      goal: goal(2, "Mnożenie"),
      skill_codes: [],
      status: "not_started",
      can_do_now: [],
      needs_attention: [],
      next: [],
    },
  ],
  brief: { computed_at: "2026-08-31T15:05:00.000Z", entries: [], school: "nothing_recorded" },
});

/** A learner with no goal yet. */
export const NO_GOALS: LearnerSkills = { ...SKILLS, goals: [] };

function played(n: number, startedAt: string): LearnerAttempt {
  return {
    attempt: {
      id: attemptId(n),
      pod_id: POD,
      assignment_id: "asg_0ectzj2evqb95a3v1v6wewjzy3",
      lesson_version_id: "lesv_0ectzj2evqb95a3v1v6wewjzy1",
      learner_id: LEARNER,
      player_name: null,
      mode: "real",
      status: "finished",
      resume_at: null,
      started_at: startedAt,
      finished_at: startedAt,
    },
    title: "Równe grupy",
    language: "pl",
    results: [],
  } as unknown as LearnerAttempt;
}

/** One lesson in each of the 4 weeks, newest first, as the API answers. */
export const ATTEMPTS: LearnerAttempts = LearnerAttempts.parse({
  learner,
  attempts: [
    played(4, "2026-08-31T15:00:00.000Z"),
    played(3, "2026-08-26T15:00:00.000Z"),
    played(2, "2026-08-19T15:00:00.000Z"),
    played(1, "2026-08-12T15:00:00.000Z"),
  ],
}) as LearnerAttempts;

const skillCite = (code: string) => ({ kind: "skill", skill_code: code });

function digest(changes: Record<string, unknown>) {
  return {
    shape: "digest/1",
    counts: { attempts: 2, questions: 14, days_played: 2 },
    skills_moved: [],
    needs_attention: [],
    mistakes: [],
    brief: { computed_at: "2026-08-31T15:05:00.000Z", entries: [], school: "nothing_recorded" },
    goals: [],
    standing: [],
    proposals: [],
    asks: [],
    ...changes,
  };
}

/** The newest report, written: a headline, the direction, both answers, 2 proposals (the 2nd
 * already accepted) and an ask. */
const WRITTEN = {
  id: reportId(2),
  pod_id: POD,
  learner_id: LEARNER,
  period_starts_at: "2026-08-25T00:00:00.000Z",
  period_ends_at: "2026-08-31T18:00:00.000Z",
  inputs_hash: "h2",
  reused: false,
  digest: digest({
    skills_moved: [
      { skill_code: ADD_10, from: "attempted", to: "familiar", attempt_id: attemptId(3) },
    ],
    needs_attention: [
      {
        skill_code: TAKE_AWAY,
        mistake_classes: ["off_by_small"],
        citations: [skillCite(TAKE_AWAY)],
      },
    ],
    proposals: [
      {
        id: "p1",
        kind: "focus",
        list: "reteach",
        skill_codes: [TAKE_AWAY],
        citations: [skillCite(TAKE_AWAY)],
      },
      {
        id: "p2",
        kind: "focus",
        list: "new",
        skill_codes: [ADD_20],
        citations: [skillCite(ADD_20)],
      },
    ],
    asks: [{ id: "a1", about: "school_context" }],
  }),
  narrative: {
    language: "pl",
    headline: "Ola dodaje w zakresie 10 coraz pewniej.",
    direction_now: "W tym tygodniu warto wrócić do odejmowania w zakresie 10.",
    answers: [
      {
        question: "skills_standing",
        answer: "Dodawanie w zakresie 10 idzie do przodu; odejmowanie jeszcze się myli o 1.",
        citations: [skillCite(ADD_10)],
      },
      {
        question: "next_focus",
        answer: "Najpierw odejmowanie w zakresie 10, potem dodawanie do 20.",
        citations: [skillCite(TAKE_AWAY)],
      },
    ],
    proposals: [
      {
        proposal_id: "p1",
        claim: "Powtórzyć odejmowanie w zakresie 10.",
        rationale: "W 2 lekcjach wynik wychodził o 1 za mały.",
        citations: [skillCite(TAKE_AWAY)],
      },
      {
        proposal_id: "p2",
        claim: "Zacząć dodawanie do 20.",
        rationale: "Dodawanie do 10 jest już pewne.",
        citations: [skillCite(ADD_20)],
      },
    ],
    asks: [{ ask: "Co Ola przerabia teraz w szkole?", why: "Lekcje mogą iść w tym samym rytmie." }],
    made_by: "jadwigo-report-write/test",
  },
  decisions: [
    {
      proposal_id: "p2",
      decision: "accepted",
      decided_at: "2026-09-01T07:00:00.000Z",
      decided_by: ACCOUNT,
    },
  ],
  created_at: "2026-08-31T18:00:00.000Z",
};

/** The report the week before, counted but not written: a skill forward, one back. */
const COUNTED = {
  id: reportId(1),
  pod_id: POD,
  learner_id: LEARNER,
  period_starts_at: "2026-08-10T00:00:00.000Z",
  period_ends_at: "2026-08-24T18:00:00.000Z",
  inputs_hash: "h1",
  reused: false,
  digest: digest({
    skills_moved: [
      { skill_code: ADD_10, from: "not_started", to: "attempted", attempt_id: attemptId(1) },
      { skill_code: GROUPS, from: "familiar", to: "attempted", attempt_id: attemptId(2) },
    ],
  }),
  narrative: null,
  decisions: [],
  created_at: "2026-08-24T18:00:00.000Z",
};

/** The learner's reports, newest first. */
export const REPORTS: LearnerReports = LearnerReports.parse({ reports: [WRITTEN, COUNTED] });

/** The newest report with its narrative not written yet. */
export const UNWRITTEN: LearnerReport = {
  ...(REPORTS.reports[0] as LearnerReport),
  narrative: null,
};

/** The newest report with an empty narrative: no answers, proposals or asks. */
export const EMPTY_NARRATIVE: LearnerReport = {
  ...(REPORTS.reports[0] as LearnerReport),
  narrative: {
    language: "pl",
    headline: "Mało lekcji w tym tygodniu.",
    direction_now: "Wystarczy jedna krótka lekcja.",
    answers: [],
    proposals: [],
    asks: [],
    made_by: "jadwigo-report-write/test",
  },
  decisions: [],
};
