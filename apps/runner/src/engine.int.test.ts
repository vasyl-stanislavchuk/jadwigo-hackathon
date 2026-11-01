// The hosted runner's learner verbs on Postgres (dl-z5ja.127): postgresEngineHost hands the verbs
// its jadwigo_runner store, and one learner verb reads a learner of the run's pod through it. The
// records are written as the API's role, as the app writes them, and read back as the runner's.
import { Uuid } from "@jadwigo/contracts";
import { RunId } from "@jadwigo/contracts/run";
import { createPostgresStore } from "@jadwigo/store";
import { afterAll, expect, it } from "vitest";
import { apiDatabaseUrl } from "./config.ts";
import { postgresEngineHost } from "./engine.ts";
import { ProbeMuse } from "./probe.ts";

const URL = apiDatabaseUrl();
const api = createPostgresStore(URL);
const host = postgresEngineHost(URL, new ProbeMuse(), () => undefined);
afterAll(() => Promise.all([api.close(), host.close()]));

it("a learner verb answers as jadwigo_runner for a learner of the run's pod", async () => {
  const member = await api.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  const { learner } = await api.addLearner(member.pod, {
    first_name: "Mole",
    goals: ["Adding within 20"],
  });
  const context = {
    pod: member.pod,
    created_by: member.account,
    run_id: RunId.parse("run_0000000000000000000000000a"),
    call_id: "call_1",
    lesson: null,
  };

  const effect = await host.engine.verbs.learner_skills.run(context, { learner_id: learner.id });
  expect(effect.output).toMatchObject({
    learner: { id: learner.id, first_name: "Mole" },
    goals: [{ name: "Adding within 20" }],
  });

  // Another pod's learner reads as none: the verb refuses, and names nothing of that pod. A new
  // call id, since a verb answers a repeated (run, call) with its first effect.
  const other = await api.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  await expect(
    host.engine.verbs.learner_skills.run(
      { ...context, pod: other.pod, created_by: other.account, call_id: "call_2" },
      { learner_id: learner.id },
    ),
  ).rejects.toMatchObject({ type: "not_found" });
});
