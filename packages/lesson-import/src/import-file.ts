import { readFileSync } from "node:fs";
import { createPostgresStore } from "@jadwigo/store";
import { databaseUrl } from "./config.ts";
import { DRAFTS_POD, FEATURED_POD } from "./ids.ts";
import { importLessonFile } from "./import.ts";

/**
 * Imports one lesson file into DATABASE_URL through the Store, as `seed.ts` imports a folder
 * (dl-e8ov.5.38.3): `make lesson-import FILE=<path> [ENV=dev] [FEATURED=1]`, or
 * `bun run import <path> [--featured]` from this package. By default it writes into the drafts pod
 * (`DRAFTS_POD`, dl-e8ov.2.59), never among the featured lessons. `--featured` writes into the
 * featured pod (`FEATURED_POD`) instead, so `GET /api/v1/featured-lessons` lists the lesson at once:
 * on prod, running that is the owner's approval of a featured lesson (dl-e8ov.2.97). Either way it
 * writes the lesson, its questions, a new published version when the list changed, and the
 * assignment compile names (`featuredAssignmentId` under that pod; audience `anyone`, identity
 * `none`, so its play path plays for anyone), then prints one line:
 * `<file>: <lesson id> version <n> published|unchanged, play /play/<assignment id>`.
 * Check a file first with `bun run check <path>`; this stops at the same first problem.
 */
// `--json` prints the same as one object, for a caller that reads it (jw's `lesson_publish`,
// dl-a38n wave 3): `{file, lesson_id, version, version_id, published, assignment_id, play_path,
// questions}`, `questions` being the planned ones in the version.
const args = process.argv.slice(2);
const json = args.includes("--json");
const pod = args.includes("--featured") ? FEATURED_POD : DRAFTS_POD;
const file = args.find((a) => !a.startsWith("--"));
if (file === undefined) {
  process.stderr.write("usage: bun run import <lesson file> [--json] [--featured]\n");
  process.exit(2);
}
const raw: unknown = JSON.parse(readFileSync(file, "utf8"));
const store = createPostgresStore(databaseUrl());
try {
  const { lesson, version, published, assignment } = await importLessonFile(store, raw, pod);
  const playPath = `/play/${assignment.id}`;
  if (json) {
    const listed = await store.getLessonVersion(pod.id, version.id);
    const out = {
      file,
      lesson_id: lesson.id,
      version: version.version,
      version_id: version.id,
      published,
      assignment_id: assignment.id,
      play_path: playPath,
      questions: listed.questions.filter((q) => q.role === "planned").length,
    };
    process.stdout.write(`${JSON.stringify(out)}\n`);
  } else {
    process.stdout.write(
      `${file}: ${lesson.id} version ${version.version}${published ? " published" : " unchanged"}, play ${playPath}\n`,
    );
  }
} finally {
  await store.close();
}
