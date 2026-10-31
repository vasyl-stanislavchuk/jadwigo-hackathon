import { FEATURED_POD_ID } from "@jadwigo/contracts";
import { catalogue } from "@jadwigo/core";
import { InMemoryStore } from "@jadwigo/store";
import { describe, expect, it } from "vitest";
import { fromCatalogue, type SeedCatalogue, seedCatalogue } from "./curriculum.ts";

/** A made-up catalogue: 2 topics, 3 skills, one with an alias and one with no topic. */
const CATALOGUE: SeedCatalogue = {
  curriculum: {
    code: "podstawa-test",
    name: "Podstawa programowa, klasy 1-3",
    country: "PL",
    version: "2017",
    language: "pl",
    source_url: null,
  },
  topics: [
    { code: "II.3.3", area: "II.3", text: "Mnoży i dzieli w zakresie tabliczki mnożenia." },
    { code: "II.4.1", area: "II.4", text: "Mierzy długość." },
  ],
  skills: [
    {
      code: "maths.multiplication.row-7",
      topic: "II.3.3",
      kind: "speed",
      status: "reviewed",
      can_do: { pl: { child: "Umiem mnożyć przez 7.", parent: "Mnoży przez 7.", reviewed: false } },
      aliases: ["maths.mul.7x"],
      prerequisites: [],
      source: "bank:enrichment",
    },
    {
      code: "maths.measure.length-cm",
      topic: "II.4.1",
      kind: "accuracy",
      status: "proposed",
      can_do: null,
      aliases: [],
      prerequisites: [],
      source: "fixture",
    },
    {
      code: "maths.alfik.word-problems",
      topic: null,
      kind: "accuracy",
      status: "reviewed",
      can_do: null,
      aliases: [],
      prerequisites: ["maths.multiplication.row-7"],
      source: "bank:enrichment",
    },
  ],
};

describe("seedCatalogue", () => {
  it("writes the catalogue into the shared pod, each skill under its topic's row, and a 2nd run changes nothing", async () => {
    const store = new InMemoryStore();
    const first = await seedCatalogue(store, CATALOGUE);
    expect(first).toMatchObject({ topics: 2, skills: CATALOGUE.skills.map((s) => s.code) });

    const skills = await store.listSkills(FEATURED_POD_ID);
    const topics = await store.putTopics(
      FEATURED_POD_ID,
      CATALOGUE.topics.map((t) => ({ ...t, curriculum_id: first.curriculum })),
    );
    const topicOf = new Map(topics.map((t) => [t.id, t.code]));
    expect(
      skills.map((s) => [
        s.code,
        s.pod_id,
        s.topic_id === null ? null : topicOf.get(s.topic_id),
        s.aliases,
      ]),
    ).toEqual([
      ["maths.alfik.word-problems", FEATURED_POD_ID, null, []],
      ["maths.measure.length-cm", FEATURED_POD_ID, "II.4.1", []],
      ["maths.multiplication.row-7", FEATURED_POD_ID, "II.3.3", ["maths.mul.7x"]],
    ]);

    expect(await seedCatalogue(store, CATALOGUE)).toEqual(first);
    expect(await store.listSkills(FEATURED_POD_ID)).toEqual(skills);
  });

  it("refuses a skill whose topic the catalogue lacks, before writing anything", async () => {
    const store = new InMemoryStore();
    const [skill] = CATALOGUE.skills;
    if (skill === undefined) throw new Error("no skill");
    await expect(
      seedCatalogue(store, { ...CATALOGUE, skills: [{ ...skill, topic: "IX.9" }] }),
    ).rejects.toThrow("IX.9");
    // Not even the shared pod was written.
    await expect(store.listSkills(FEATURED_POD_ID)).rejects.toMatchObject({ type: "NotFound" });
  });
});

describe("fromCatalogue", () => {
  it("seeds packages/core's real catalogue: every topic and skill once, each skill under its topic, and a 2nd run changes nothing", async () => {
    const core = catalogue();
    const store = new InMemoryStore();
    const first = await seedCatalogue(store, fromCatalogue(core));
    expect(first.topics).toBe(core.topics.length);
    expect([...first.skills].sort()).toEqual(core.skills.map((s) => s.code).sort());

    const topics = await store.putTopics(
      FEATURED_POD_ID,
      core.topics.map((t) => ({ ...t, curriculum_id: first.curriculum })),
    );
    const topicOf = new Map(topics.map((t) => [t.id, t.code]));
    const written = new Map(
      (await store.listSkills(FEATURED_POD_ID)).map((s) => [
        s.code,
        s.topic_id === null ? null : (topicOf.get(s.topic_id) ?? "missing"),
      ]),
    );
    for (const skill of core.skills) expect(written.get(skill.code)).toBe(skill.topic_code);

    expect(await seedCatalogue(store, fromCatalogue(core))).toEqual(first);
  });
});
