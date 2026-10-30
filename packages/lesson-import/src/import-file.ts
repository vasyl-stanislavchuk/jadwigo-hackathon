import { readFileSync } from "node:fs";
import { createPostgresStore } from "@jadwigo/store";
import { databaseUrl } from "./config.ts";
import { DRAFTS_POD } from "./ids.ts";
import { importLessonFile } from "./import.ts";

/**
 * Imports one lesson file into DATABASE_URL through the Store, as `seed.ts` imports a folder
 * (dl-e8ov.5.38.3): `make lesson-import FILE=<path> [ENV=dev]`, or `bun run import <path>` from this
 * package. It writes into the drafts pod (`DRAFTS_POD`, dl-e8ov.2.59), never among the featured
 * lessons: the lesson, its questions, a new published version when the list changed, and the
 * assignment compile names (audience `anyone`, identity `none`, so its play path plays for anyone),
 * then prints one line:
 * `<file>: <lesson id> version <n> published|unchanged, play /play/<assignment id>`.
 * Check a file first with `bun run check <path>`; this stops at the same first problem.
 */
const file = process.argv[2];
if (file === undefined) {
  process.stderr.write("usage: bun run import <lesson file>\n");
  process.exit(2);
}
const raw: unknown = JSON.parse(readFileSync(file, "utf8"));
const store = createPostgresStore(databaseUrl());
try {
  const { lesson, version, published, assignment } = await importLessonFile(store, raw, DRAFTS_POD);
  process.stdout.write(
    `${file}: ${lesson.id} version ${version.version}${published ? " published" : " unchanged"}, play /play/${assignment.id}\n`,
  );
} finally {
  await store.close();
}
