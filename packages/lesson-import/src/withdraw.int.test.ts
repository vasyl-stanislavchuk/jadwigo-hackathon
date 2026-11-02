// `bun run withdraw` against the database `make migrate` built (DATABASE_URL), after a featured
// import of a copy of a fixture under a fresh id: the lesson leaves the featured pod's open
// assignments, its play path still starts an attempt, and --restore lists it again (decision
// dl-w0b4.111, dl-9t2o.12).
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPostgresStore } from "@jadwigo/store";
import { afterAll, describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";
import { DRAFTS_POD, FEATURED_POD, featuredAssignmentId, lessonIdFor } from "./ids.ts";

const pkg = fileURLToPath(new URL("..", import.meta.url));
const fixture = fileURLToPath(
  new URL("../../testing/src/lessons/multiplication-times-four.json", import.meta.url),
);
const store = createPostgresStore(databaseUrl());

function run(...args: string[]): { status: number | null; out: string; err: string } {
  const done = spawnSync("bun", ["run", ...args], {
    cwd: pkg,
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: databaseUrl() },
  });
  return { status: done.status, out: done.stdout.trim(), err: done.stderr };
}

describe("bun run withdraw <les_…|asg_…>", () => {
  const fileId = `withdraw-${randomUUID()}`;
  const copy = join(mkdtempSync(join(tmpdir(), "lesson-withdraw-")), `${fileId}.json`);
  const lesson = JSON.parse(readFileSync(fixture, "utf8")) as Record<string, unknown>;
  writeFileSync(copy, JSON.stringify({ ...lesson, id: fileId }));
  const assignment = featuredAssignmentId(fileId);
  const lessonId = lessonIdFor(FEATURED_POD.id, fileId);
  const listed = async () =>
    (await store.listOpenAssignments(FEATURED_POD.id)).map((o) => o.assignment.id);

  // Leave the featured pod as it was found: this lesson withdrawn.
  afterAll(async () => {
    run("withdraw", lessonId);
    await store.close();
  });

  it("takes a featured lesson off the list, and its play path still starts an attempt", async () => {
    expect(run("import", copy, "--featured").status).toBe(0);
    expect(await listed()).toContain(assignment);

    const withdrawn = run("withdraw", assignment);
    expect(withdrawn.status, withdrawn.err).toBe(0);
    expect(withdrawn.out).toBe(
      `${lessonId} archived: off the featured list; its play links still play`,
    );
    expect(await listed()).not.toContain(assignment);
    expect((await store.getLesson(FEATURED_POD.id, lessonId))?.status).toBe("archived");
    const started = await store.startAttempt(FEATURED_POD.id, { assignment_id: assignment });
    expect(started.attempt.assignment_id).toBe(assignment);

    // An unchanged re-import (db-seed's way) publishes nothing, so it stays withdrawn.
    expect(run("import", copy, "--featured").out).toContain(" unchanged, ");
    expect(await listed()).not.toContain(assignment);
  });

  it("--restore puts it back on the list", async () => {
    run("import", copy, "--featured");
    run("withdraw", lessonId);
    const restored = run("withdraw", lessonId, "--restore");
    expect(restored.status, restored.err).toBe(0);
    expect(restored.out).toBe(`${lessonId} published: back on the featured list`);
    expect(await listed()).toContain(assignment);
  });

  it("refuses a draft's assignment and changes nothing", async () => {
    expect(run("import", copy).status).toBe(0);
    const draft = featuredAssignmentId(fileId, DRAFTS_POD.id);
    const refused = run("withdraw", draft);
    expect(refused.status).not.toBe(0);
    expect(refused.err).toContain("not an assignment of the featured pod");
    expect((await store.getLesson(DRAFTS_POD.id, lessonIdFor(DRAFTS_POD.id, fileId)))?.status).toBe(
      "published",
    );
  });
});
