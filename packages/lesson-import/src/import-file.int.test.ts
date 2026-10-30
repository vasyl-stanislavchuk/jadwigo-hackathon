// `bun run import <file>` against the database `make migrate` built (DATABASE_URL), then the same
// rows read back through createPostgresStore: the published version and the assignment at the
// printed play path, in the drafts pod and never among the featured lessons (dl-e8ov.2.59). apps/api's roundtrips.int.test.ts plays these fixtures through the api.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { AssignmentId } from "@jadwigo/contracts";
import { createPostgresStore } from "@jadwigo/store";
import { afterAll, describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";
import { DRAFTS_POD, FEATURED_POD, featuredAssignmentId } from "./ids.ts";

const pkg = fileURLToPath(new URL("..", import.meta.url));
const fixture = fileURLToPath(
  new URL("../../testing/src/lessons/multiplication-times-four.json", import.meta.url),
);
const store = createPostgresStore(databaseUrl());
afterAll(() => store.close());

function runImport(): { status: number | null; line: string } {
  const run = spawnSync("bun", ["run", "import", fixture], {
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
});
