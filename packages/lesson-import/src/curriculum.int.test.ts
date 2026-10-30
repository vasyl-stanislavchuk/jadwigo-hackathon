// The curriculum seed writer against the database `make migrate` built (DATABASE_URL): a made-up
// catalogue under codes no other run holds, written twice into the shared pod: the 2nd run returns
// the rows the 1st wrote, and the catalogue every pod reads is unchanged.
import { FEATURED_POD_ID } from "@jadwigo/contracts";
import { createPostgresStore } from "@jadwigo/store";
import { afterAll, describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";
import { type SeedCatalogue, seedCatalogue } from "./curriculum.ts";

const store = createPostgresStore(databaseUrl());
afterAll(() => store.close());

describe("seedCatalogue on PostgresStore", () => {
  it("writes the catalogue once: a 2nd run returns the same rows and adds none", async () => {
    const run = crypto.randomUUID().slice(0, 8);
    const catalogue: SeedCatalogue = {
      curriculum: {
        code: `test-podstawa-${run}`,
        name: "Podstawa programowa, klasy 1-3",
        country: "PL",
        version: "2017",
        language: "pl",
        source_url: null,
      },
      topics: [
        { code: "II.3.3", area: "II.3", text: "Mnoży w zakresie tabliczki mnożenia." },
        { code: "II.4.1", area: "II.4", text: "Mierzy długość." },
      ],
      skills: [
        {
          code: `test.lk${run}.row-7`,
          topic: "II.3.3",
          kind: "speed",
          status: "reviewed",
          can_do: null,
          aliases: [`test.lk${run}.mul-7x`],
          prerequisites: [],
          source: "fixture",
        },
        {
          code: `test.lk${run}.length`,
          topic: "II.4.1",
          kind: "accuracy",
          status: "proposed",
          can_do: null,
          aliases: [],
          prerequisites: [],
          source: "fixture",
        },
        {
          code: `test.lk${run}.words`,
          topic: null,
          kind: "accuracy",
          status: "proposed",
          can_do: null,
          aliases: [],
          prerequisites: [`test.lk${run}.row-7`],
          source: "fixture",
        },
      ],
    };
    const first = await seedCatalogue(store, catalogue);
    const catalogueAfter = await store.listSkills(FEATURED_POD_ID);
    expect(await seedCatalogue(store, catalogue)).toEqual(first);
    expect(await store.listSkills(FEATURED_POD_ID)).toEqual(catalogueAfter);
    expect(first.topics).toBe(2);

    const shared = (await store.listSkills(FEATURED_POD_ID)).filter((s) => s.code.includes(run));
    expect(shared.map((s) => [s.code, s.topic_id === null])).toEqual([
      [`test.lk${run}.length`, false],
      [`test.lk${run}.row-7`, false],
      [`test.lk${run}.words`, true],
    ]);
  });
});
