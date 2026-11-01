// What jadwigo_runner reads for a step (dl-z5ja.125): the page context's lesson (dl-z5ja.107,
// dl-z5ja.119) and the learner verbs' records (dl-z5ja.25), each under the pod_scope its unit sets.
// The records are written as the API's role, then read back as the runner's.
import { Uuid } from "@jadwigo/contracts";
import { afterAll, describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";
import { learnerRecords } from "./knowledge.contract.ts";
import { createPostgresStore } from "./postgres.ts";

const api = createPostgresStore(databaseUrl());
const runner = createPostgresStore(databaseUrl(), { role: "jadwigo_runner" });
afterAll(() => Promise.all([api.close(), runner.close()]));

describe("PostgresStore as jadwigo_runner reads what a step reads (dl-z5ja.125)", () => {
  it("reads the page context's lesson, its draft included, and its latest version", async () => {
    const a = await learnerRecords(api);
    expect((await runner.getLesson(a.pod, a.lesson))?.status).toBe("published");
    expect((await runner.getLesson(a.pod, a.draft))?.status).toBe("draft");
    expect(await runner.getLatestLessonVersion(a.pod, a.lesson)).toEqual(
      await api.getLatestLessonVersion(a.pod, a.lesson),
    );
    expect(await runner.getLatestLessonVersion(a.pod, a.draft)).toBeUndefined();
  });

  it("reads the learner records whose policies call no app function past app.current_pod_id", async () => {
    const a = await learnerRecords(api);
    for (const [name, read] of [
      ["getMe", (s: typeof api) => s.getMe(a.pod, a.account)],
      ["listGoals", (s: typeof api) => s.listGoals(a.pod, a.learner)],
      ["getAttempt", (s: typeof api) => s.getAttempt(a.pod, a.attempt)],
      ["listReports", (s: typeof api) => s.listReports(a.pod, a.learner)],
      ["getMastery", (s: typeof api) => s.getMastery(a.pod, a.learner)],
    ] as const)
      expect(await read(runner), name).toEqual(await read(api));
    expect((await runner.listGoals(a.pod, a.learner))[0]?.skill_codes).toHaveLength(2);
    expect((await runner.listReports(a.pod, a.learner)).map((r) => r.id)).toEqual([a.report]);
  });

  // Still refused: these reads go through app.shared_pod_id(), app.asked_skills() or
  // app.asked_question(), which the frozen run.test.sql keeps from jadwigo_runner. The lead decides
  // (dl-z5ja.125); this case turns red, on purpose, once the runner may execute them.
  it("is still refused the reads that call app.shared_pod_id, app.asked_skills or app.asked_question", async () => {
    const a = await learnerRecords(api);
    await expect(runner.listSkills(a.pod)).rejects.toThrow(/shared_pod_id/);
    await expect(runner.getLearnerEvidence(a.pod, a.learner)).rejects.toThrow(/asked_skills/);
    await expect(runner.getAttemptResult(a.pod, a.attempt)).rejects.toThrow(/asked_question/);
    await expect(runner.getLearnerAttempts(a.pod, a.learner)).rejects.toThrow(/asked_question/);
  });

  it("reads none of another pod's records", async () => {
    const a = await learnerRecords(api);
    const b = await api.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
    expect(await runner.getLesson(b.pod, a.lesson)).toBeUndefined();
    expect(await runner.getLatestLessonVersion(b.pod, a.lesson)).toBeUndefined();
    await expect(runner.listGoals(b.pod, a.learner)).rejects.toMatchObject({ type: "NotFound" });
    await expect(runner.getLearnerEvidence(b.pod, a.learner)).rejects.toMatchObject({
      type: "NotFound",
    });
    await expect(runner.getAttempt(b.pod, a.attempt)).rejects.toMatchObject({ type: "NotFound" });
    await expect(runner.listReports(b.pod, a.learner)).rejects.toMatchObject({ type: "NotFound" });
  });
});
