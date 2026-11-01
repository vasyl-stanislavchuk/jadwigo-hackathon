import type { VerbName } from "@jadwigo/contracts/run";
import type { Finding } from "@jadwigo/lesson-import/file";
import type { MuseTool } from "../muse/client.ts";
import type { BankPort } from "./bank.ts";
import type { Json } from "./input.ts";
import {
  curriculumTopicsVerb,
  LEARNER_TOOLS,
  type LearnerReads,
  type LearnerVerbName,
  learnerMistakesVerb,
  learnerSkills,
  learnerWeek,
  lessonIdeasVerb,
} from "./learner.ts";
import { lessonCheck, lessonDraft, lessonEdit, lessonShow, questionSearch } from "./lesson.ts";
import { type Verb, type VerbContext, type VerbEffect, VerbError, type Verbs } from "./types.ts";

export { type BankPort, fixtureBank } from "./bank.ts";
export type { LearnerReads } from "./learner.ts";

export interface VerbDeps {
  bank: BankPort;
  /**
   * Where the learner verbs read one learner of the run's pod (dl-z5ja.25): the engine's Store.
   * Without it they refuse, so a host that reads no learner (a test, a probe) says so to the model.
   */
  learners?: LearnerReads;
  /** The clock the learner verbs fold and count weeks by; the wall clock when absent. */
  now?: () => Date;
}

/**
 * The verbs only the hosted engine has: they read a learner of the run's pod, and `jw mcp serve`
 * holds no learner. `parity.test.ts` holds every other verb to jw's tools, and these to their absence.
 */
export const ENGINE_ONLY: readonly LearnerVerbName[] = [
  "learner_skills",
  "learner_week",
  "learner_mistakes",
  "curriculum_topics",
  "lesson_ideas",
];

/** What `lesson_check` answers in its output: `@jadwigo/lesson-import/check` findings. */
export type CheckFindings = readonly Finding[];

const str = { type: "string" } as const;
const strOrNull = { anyOf: [{ type: "string" }, { type: "null" }] } as const;
/**
 * jw's switches for how much a verb answers (`verbose`, `full`). The engine takes them so the
 * tool sets stay one, and answers its compact form either way.
 */
const detail = { type: "boolean", default: false } as const;
const strsOrNull = {
  anyOf: [{ type: "array", items: { type: "string" } }, { type: "null" }],
} as const;

function params(properties: Json, required: readonly string[]): Json {
  return { type: "object", properties, required: [...required], additionalProperties: false };
}

/**
 * The verbs as function tools, with the names and inputs `jw mcp serve` gives them
 * (`apps/cli/mcp-tools.json`; `parity.test.ts` holds the two together). The descriptions are
 * shorter than jw's: no file path, no publish, which wave 1 does not have.
 */
export const TOOLS: Readonly<Record<VerbName, MuseTool>> = {
  lesson_draft: {
    name: "lesson_draft",
    description:
      "Draft a lesson for the parent's request: questions drawn from the bank and copied whole. topic is what the lesson is about in a few words, with no count, grade or name; grade the bare grade number; names every name the family uses, or []. Per question it returns step_id, prompt, key, rungs and you_write: write only what you_write lists, then call lesson_check.",
    parameters: params(
      {
        request: str,
        grade: str,
        names: { type: "array", items: str },
        topic: str,
        language: { type: "string", enum: ["pl", "uk", "en"], default: "pl" },
        kind: {
          type: "string",
          enum: ["practice", "review", "check", "diagnostic"],
          default: "practice",
        },
        count: { anyOf: [{ type: "integer", minimum: 1, maximum: 20 }, { type: "null" }] },
        skills: strsOrNull,
        verbose: detail,
      },
      ["request", "grade", "names", "topic"],
    ),
  },
  lesson_show: {
    name: "lesson_show",
    description:
      "The draft as it stands: one step (step_id) or every step, each with its findings. Read a step here before you patch it with lesson_edit.",
    parameters: params({ draft_id: str, step_id: strOrNull }, ["draft_id"]),
  },
  lesson_edit: {
    name: "lesson_edit",
    description:
      "Change one step by a JSON merge patch on the step as lesson_show returns it: say, and question's data, key and help. A change to a part the bank's copy has needs why, the parent's ask. Returns that step's findings and card.",
    parameters: params(
      {
        draft_id: str,
        step_id: str,
        patch: { type: "object", additionalProperties: true },
        why: strOrNull,
        change: {
          type: "string",
          enum: ["numbers", "context", "wording", "tutor_notes"],
          default: "wording",
        },
        names: { type: "array", items: str },
      },
      ["draft_id", "step_id", "patch", "names"],
    ),
  },
  lesson_check: {
    name: "lesson_check",
    description:
      "Check the draft with your words on it. help maps each step_id to what its you_write lists (twin, boost_by_mistake, look, boost, almost, worked); help {} checks the draft as it stands. Fix what findings list by step id until ok is true.",
    parameters: params(
      {
        draft_id: str,
        help: {
          type: "object",
          additionalProperties: { type: "object", additionalProperties: true },
        },
        title: strOrNull,
        reasoning: strOrNull,
        names: { type: "array", items: str },
        full: detail,
        verbose: detail,
      },
      ["draft_id", "help", "names"],
    ),
  },
  question_search: {
    name: "question_search",
    description:
      "Search the bank for question sets that meet a need. grade is the bare grade number; words the need in plain words in language.",
    parameters: params(
      {
        grade: str,
        words: strOrNull,
        words_en: strOrNull,
        skills: strsOrNull,
        mistakes: strsOrNull,
        language: { type: "string", enum: ["pl", "uk", "en"], default: "pl" },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
        arm: strOrNull,
        stage: strOrNull,
      },
      ["grade"],
    ),
  },
  ...LEARNER_TOOLS,
};

/**
 * The 10 verbs: lesson_draft, lesson_show, lesson_edit, lesson_check, question_search, and the
 * learner verbs (`./learner.ts`): learner_skills, learner_week, learner_mistakes,
 * curriculum_topics, lesson_ideas. Each is
 * idempotent by `call_id`: a second call with one run and call id answers the first call's effect
 * and reads nothing again, so a redelivered step writes nothing new. The memo is this process's;
 * a step redelivered to another process gets the same effect because every verb is a function of
 * its input, the lesson and the bank.
 */
export function createVerbs(deps: VerbDeps): Verbs {
  const now = deps.now ?? (() => new Date());
  const reads = (name: LearnerVerbName): LearnerReads => {
    if (deps.learners === undefined) {
      throw new VerbError("unavailable", `${name}: this engine reads no learner`);
    }
    return deps.learners;
  };
  const done = new Map<string, Promise<VerbEffect>>();
  const verb = (
    name: VerbName,
    body: (c: VerbContext, input: Json) => Promise<VerbEffect>,
  ): Verb => ({
    name,
    tool: TOOLS[name],
    run: (context, input) => {
      const key = `${context.run_id} ${context.call_id}`;
      const known = done.get(key);
      if (known !== undefined) return known.then((e) => structuredClone(e));
      // Async, so a refusal thrown before the body's first await rejects like any other.
      const effect = (async () => body(context, input))();
      done.set(key, effect);
      // A refusal is not remembered: the model may correct the input under a new call id anyway.
      effect.catch(() => done.delete(key));
      return effect.then((e) => structuredClone(e));
    },
  });
  return {
    lesson_draft: verb("lesson_draft", (c, i) => lessonDraft(deps.bank, c, i)),
    lesson_show: verb("lesson_show", lessonShow),
    lesson_edit: verb("lesson_edit", lessonEdit),
    lesson_check: verb("lesson_check", lessonCheck),
    question_search: verb("question_search", (_c, i) => questionSearch(deps.bank, i)),
    learner_skills: verb("learner_skills", (c, i) =>
      learnerSkills(reads("learner_skills"), now(), c, i),
    ),
    learner_week: verb("learner_week", (c, i) => learnerWeek(reads("learner_week"), now(), c, i)),
    learner_mistakes: verb("learner_mistakes", (c, i) =>
      learnerMistakesVerb(reads("learner_mistakes"), c, i),
    ),
    curriculum_topics: verb("curriculum_topics", (c, i) =>
      curriculumTopicsVerb(reads("curriculum_topics"), c, i),
    ),
    lesson_ideas: verb("lesson_ideas", (c, i) =>
      lessonIdeasVerb(reads("lesson_ideas"), now(), c, i),
    ),
  };
}
