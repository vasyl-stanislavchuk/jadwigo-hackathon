import { ID_PREFIXES, idOf, LearnerId, ToolView, toolViewData, Uuid } from "@jadwigo/contracts";
import { InMemoryStore } from "@jadwigo/store";
import { FIXED_NOW, finishedAttempt } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { runId } from "../testing/context.ts";
import { createVerbs, ENGINE_ONLY, fixtureBank } from "./index.ts";
import { type VerbContext, VerbError } from "./types.ts";

/**
 * The learner verbs (dl-z5ja.25) on InMemoryStore, made-up learners only: each reads one learner
 * of the run's pod and refuses every other, and none answers a level, a score or a percentage.
 */

const ADD_10 = "maths.add.within-10";
const ADD_20 = "maths.add.within-20";
const SUB_10 = "maths.sub.within-10";

async function world() {
  const now = () => FIXED_NOW;
  const store = new InMemoryStore({ now });
  const home = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  const other = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  const ola = (await store.addLearner(home.pod, { first_name: "Ola" })).learner.id;
  const kuba = (await store.addLearner(other.pod, { first_name: "Kuba" })).learner.id;
  await store.addGoal(home.pod, ola, { name: "Dodawanie", skill_codes: [ADD_10, ADD_20] });
  await store.addGoal(home.pod, ola, { name: "Odejmowanie", skill_codes: [SUB_10] });
  await store.addGoal(other.pod, kuba, { name: "Dodawanie", skill_codes: [ADD_10] });
  const verbs = createVerbs({ bank: fixtureBank(), learners: store, now });
  let calls = 0;
  const context = (): VerbContext => ({
    pod: home.pod,
    created_by: home.account,
    run_id: runId(),
    call_id: `call_${++calls}`,
    lesson: null,
  });
  return { store, home, other, ola, kuba, verbs, context };
}

/** A verb's input naming `learner`, as each learner verb takes it. */
function naming(learner: LearnerId | string): Record<string, unknown> {
  return { learner_id: learner };
}

/** The words no learner verb's answer may hold: a level name, a score, a percentage. */
const NEVER = /mastered|proficient|familiar|attempted|"level"|score|percent|%/i;

describe("every learner verb is scoped by the run's pod", () => {
  it.each(ENGINE_ONLY)(
    "%s refuses another pod's learner, as it refuses an unknown one",
    async (name) => {
      const t = await world();
      const theirs = t.verbs[name].run(t.context(), naming(t.kuba));
      await expect(theirs).rejects.toBeInstanceOf(VerbError);
      await expect(theirs).rejects.toMatchObject({ type: "not_found" });
      // A well-formed id no pod holds: the model learns nothing from the refusal about whether
      // another family has the learner (wave 4 decision 44).
      const madeUp = LearnerId.parse(idOf(ID_PREFIXES.learner, crypto.randomUUID()));
      const unknown = t.verbs[name].run(t.context(), naming(madeUp));
      const refusal = (e: unknown) =>
        e instanceof VerbError ? { type: e.type, message: e.message } : e;
      expect(await theirs.catch(refusal)).toEqual(await unknown.catch(refusal));
      await theirs.catch((e: Error) => expect(e.message).not.toContain("Kuba"));
    },
  );

  it.each(ENGINE_ONLY)("%s takes no pod from the model's arguments", async (name) => {
    const t = await world();
    await expect(
      t.verbs[name].run(t.context(), { ...naming(t.ola), pod_id: t.other.pod }),
    ).rejects.toMatchObject({ type: "input" });
  });

  it.each(ENGINE_ONLY)("%s refuses when the engine was given no store to read", async (name) => {
    const verbs = createVerbs({ bank: fixtureBank() });
    const t = await world();
    await expect(verbs[name].run(t.context(), naming(t.ola))).rejects.toMatchObject({
      type: "unavailable",
    });
  });
});

describe("learner_skills", () => {
  it("answers each goal's status word and lists, and the brief, with no level", async () => {
    const t = await world();
    const effect = await t.verbs.learner_skills.run(t.context(), naming(t.ola));
    const view = toolViewData("learner_skills", ToolView.parse(effect.view).data);
    expect(view?.learner).toEqual({ id: t.ola, first_name: "Ola" });
    expect(view?.goals.map((g) => [g.goal.name, g.status])).toEqual([
      ["Dodawanie", "not_started"],
      ["Odejmowanie", "not_started"],
    ]);
    expect(view?.brief.entries.map((e) => [e.skill_code, e.list])).toEqual([
      [ADD_10, "new"],
      [ADD_20, "new"],
      [SUB_10, "new"],
    ]);
    expect(view?.skills.map((s) => s.code).sort()).toEqual([ADD_10, ADD_20, SUB_10]);
    expect(effect.output).toMatchObject({
      learner: { first_name: "Ola" },
      goals: [
        { name: "Dodawanie", status: "not_started", next: [{ skill: ADD_10 }, { skill: ADD_20 }] },
        {},
      ],
    });
    expect(JSON.stringify(effect.output)).not.toMatch(NEVER);
  });
});

describe("lesson_ideas", () => {
  it("offers up to 3 ideas from the brief, each cited by skill and goal", async () => {
    const t = await world();
    const effect = await t.verbs.lesson_ideas.run(t.context(), naming(t.ola));
    const view = toolViewData("lesson_ideas", ToolView.parse(effect.view).data);
    expect(view?.ideas.length).toBeGreaterThan(0);
    expect(view?.ideas.length).toBeLessThanOrEqual(3);
    for (const idea of view?.ideas ?? []) {
      expect(idea.citations).toEqual(
        expect.arrayContaining(
          idea.skill_codes.map((skill_code) => ({ kind: "skill", skill_code })),
        ),
      );
      expect(idea.citations.some((c) => c.kind === "goal")).toBe(true);
    }
    expect(JSON.stringify(effect.output)).not.toMatch(NEVER);
  });

  it("says why there is no idea rather than making one up", async () => {
    const t = await world();
    const lone = (await t.store.addLearner(t.home.pod, { first_name: "Ala" })).learner.id;
    const effect = await t.verbs.lesson_ideas.run(t.context(), naming(lone));
    expect(effect.output).toMatchObject({
      ideas: [],
      nothing_recorded: "the learner has no active goal",
    });
  });
});

describe("learner_mistakes and learner_week", () => {
  async function playedWorld() {
    const t = await world();
    await finishedAttempt({
      store: t.store,
      pod: t.home.pod,
      learner: t.ola,
      title: "Made-up adding",
      questions: [
        { skills: [ADD_10], correct: true, answered_at: "2026-08-31T08:00:00.000Z" },
        { skills: [ADD_10], correct: false, answered_at: "2026-08-31T08:01:00.000Z" },
      ],
    });
    return t;
  }

  it("learner_mistakes answers the missed question, the child's answer fenced for the model", async () => {
    const t = await playedWorld();
    const effect = await t.verbs.learner_mistakes.run(t.context(), naming(t.ola));
    const view = toolViewData("learner_mistakes", ToolView.parse(effect.view).data);
    expect(view?.questions.map((q) => [q.seq, q.answers])).toEqual([[2, ["7"]]]);
    const out = effect.output as { questions: { child_answers: string | null }[] };
    expect(out.questions[0]?.child_answers).toContain('<jadwigo_untrusted source="child">');
    expect(out.questions[0]?.child_answers).toContain("7");
    expect(JSON.stringify(effect.output)).not.toMatch(NEVER);
  });

  it("learner_week counts this week's lesson and lists it", async () => {
    const t = await playedWorld();
    const effect = await t.verbs.learner_week.run(t.context(), { ...naming(t.ola), weeks: 2 });
    const view = toolViewData("learner_week", ToolView.parse(effect.view).data);
    expect(view?.weeks.map((w) => w.lessons)).toEqual([0, 1]);
    expect(view?.lessons.map((l) => [l.title, l.questions])).toEqual([["Made-up adding", 2]]);
    expect(JSON.stringify(effect.output)).not.toMatch(NEVER);
  });
});

describe("curriculum_topics", () => {
  it("answers the curriculum's topics with no learner, and marks a learner's goals with one", async () => {
    const t = await world();
    const all = await t.verbs.curriculum_topics.run(t.context(), {});
    const every = toolViewData("curriculum_topics", ToolView.parse(all.view).data);
    expect(every?.learner).toBeNull();
    expect(every?.topics.length).toBeGreaterThan(0);
    const some = await t.verbs.curriculum_topics.run(t.context(), {
      learner_id: t.ola,
      words: "dodawanie",
    });
    const found = toolViewData("curriculum_topics", ToolView.parse(some.view).data);
    expect(found?.learner?.first_name).toBe("Ola");
    expect(found?.topics.length).toBeLessThan(every?.topics.length ?? 0);
  });
});
