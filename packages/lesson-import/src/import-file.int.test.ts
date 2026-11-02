// `bun run import <file>` against the database `make migrate` built (DATABASE_URL), then the same
// rows read back through createPostgresStore: the published version and the assignment at the
// printed play path, in the drafts pod and never among the featured lessons (dl-e8ov.2.59), and with
// --featured in the featured pod, listed among them (dl-e8ov.2.97). apps/api's roundtrips.int.test.ts
// plays these fixtures through the api.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AssignmentId } from "@jadwigo/contracts";
import { createPostgresStore } from "@jadwigo/store";
import { afterAll, describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";
import { DRAFTS_POD, FEATURED_POD, featuredAssignmentId } from "./ids.ts";
import { withdrawLesson } from "./withdraw.ts";

const pkg = fileURLToPath(new URL("..", import.meta.url));
const fixture = fileURLToPath(
  new URL("../../testing/src/lessons/multiplication-times-four.json", import.meta.url),
);
const store = createPostgresStore(databaseUrl());
afterAll(() => store.close());

function runImport(...flags: string[]): { status: number | null; line: string } {
  return runImportOf(fixture, ...flags);
}

function runImportOf(file: string, ...flags: string[]): { status: number | null; line: string } {
  const run = spawnSync("bun", ["run", "import", file, ...flags], {
    cwd: pkg,
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: databaseUrl() },
  });
  if (run.status !== 0) throw new Error(`bun run import failed: ${run.stderr}`);
  return { status: run.status, line: run.stdout.trim() };
}

describe("bun run import <file>", () => {
  it("publishes the lesson and its anyone/none assignment at the printed play path", async () => {
    const { line } = runImport();
    const printed =
      /^(.+): (les_\w+) version (\d+) (published|unchanged), play \/play\/(asg_\w+)$/.exec(line);
    expect(printed, line).not.toBeNull();
    const [, file, lessonId, version, , assignmentId] = printed ?? [];
    expect(file).toBe(fixture);
    expect(assignmentId).toBe(featuredAssignmentId("multiplication-times-four", DRAFTS_POD.id));
    expect(await store.findAssignmentPod(AssignmentId.parse(assignmentId))).toBe(DRAFTS_POD.id);

    const assignment = await store.getAssignment(DRAFTS_POD.id, AssignmentId.parse(assignmentId));
    expect(assignment).toMatchObject({
      lesson_id: lessonId,
      audience: "anyone",
      identity: "none",
      lesson_version_id: null,
    });
    const latest = await store.getLatestLessonVersion(DRAFTS_POD.id, assignment.lesson_id);
    expect(latest?.version).toBe(Number(version));
    expect(latest?.published_at).not.toBeNull();
    const listed = latest && (await store.getLessonVersion(DRAFTS_POD.id, latest.id));
    expect(listed?.questions.filter((q) => q.role === "planned").length).toBeGreaterThan(0);

    // GET /api/v1/featured-lessons lists the featured pod's open assignments, never this one.
    const featured = await store.listOpenAssignments(FEATURED_POD.id);
    expect(featured.map((o) => o.assignment.id)).not.toContain(assignmentId);
  });

  it("publishes nothing new when the same file is imported again", () => {
    runImport();
    expect(runImport().line).toMatch(/ unchanged, play \/play\/asg_\w+$/);
  });

  it("--json prints the same as one object, with the planned question count", () => {
    runImport();
    const out = JSON.parse(runImport("--json").line) as Record<string, unknown>;
    const assignmentId = featuredAssignmentId("multiplication-times-four", DRAFTS_POD.id);
    expect(out).toMatchObject({
      file: fixture,
      published: false,
      assignment_id: assignmentId,
      play_path: `/play/${assignmentId}`,
    });
    expect(out["lesson_id"]).toMatch(/^les_\w+$/);
    expect(out["version_id"]).toMatch(/^lesv_\w+$/);
    expect(out["questions"]).toBeGreaterThan(0);
  });
});

describe("bun run import <file> --featured", () => {
  // A copy of the fixture under an id no earlier run used, so the featured pod cannot already hold
  // it from db-seed or a previous run: the listing below is this import's doing.
  const fileId = `featured-import-${randomUUID()}`;
  const copy = join(mkdtempSync(join(tmpdir(), "lesson-import-")), `${fileId}.json`);
  const lesson = JSON.parse(readFileSync(fixture, "utf8")) as Record<string, unknown>;
  writeFileSync(copy, JSON.stringify({ ...lesson, id: fileId }));
  const featuredId = featuredAssignmentId(fileId);
  const listed = async () =>
    (await store.listOpenAssignments(FEATURED_POD.id)).map((o) => o.assignment.id);
  // Off the featured list again once the tests are done, so runs do not pile up there.
  afterAll(async () => {
    if (await store.findAssignmentPod(featuredId)) await withdrawLesson(store, featuredId);
  });

  it("without --featured, the lesson is not among the featured pod's open assignments", async () => {
    const { line } = runImportOf(copy);
    expect(line).toContain(`play /play/${featuredAssignmentId(fileId, DRAFTS_POD.id)}`);
    expect(await listed()).not.toContain(featuredId);
  });

  it("with --featured, it lands in the featured pod as an open anyone-assignment", async () => {
    const { line } = runImportOf(copy, "--featured");
    expect(line).toMatch(new RegExp(`play /play/${featuredId}$`));
    expect(await store.findAssignmentPod(featuredId)).toBe(FEATURED_POD.id);
    expect(await store.getAssignment(FEATURED_POD.id, featuredId)).toMatchObject({
      audience: "anyone",
      identity: "none",
    });
    expect(await listed()).toContain(featuredId);
  });
});
