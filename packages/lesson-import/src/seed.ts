import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPostgresStore } from "@jadwigo/store";
import { databaseUrl } from "./config.ts";
import { importLessonFile } from "./import.ts";

/**
 * The featured lessons, seeded into DATABASE_URL through the Store, which sets `app.pod_id` per
 * write: `make db-seed`, or `bun run seed [folder]`. The folder defaults to the exported lesson
 * files in `packages/testing/src/lessons/`, read as files: only tests import `@jadwigo/testing`.
 */
const folder =
  process.argv[2] ?? fileURLToPath(new URL("../../testing/src/lessons/", import.meta.url));
const store = createPostgresStore(databaseUrl());
for (const name of readdirSync(folder)
  .filter((f) => f.endsWith(".json"))
  .sort()) {
  const raw: unknown = JSON.parse(readFileSync(join(folder, name), "utf8"));
  const { lesson, version, published, assignment } = await importLessonFile(store, raw);
  process.stdout.write(
    `${name}: ${lesson.id} version ${version.version}${published ? " published" : " unchanged"}, featured ${assignment.id}\n`,
  );
}
