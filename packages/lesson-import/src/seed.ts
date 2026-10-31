import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { catalogue } from "@jadwigo/core";
import { createPostgresStore } from "@jadwigo/store";
import { databaseUrl } from "./config.ts";
import { fromCatalogue, seedCatalogue } from "./curriculum.ts";
import { importLessonFile } from "./import.ts";
import { importExamples } from "./playground/import.ts";

/**
 * The featured lessons, the playground's written examples in Polish and English (dl-w3.75), then
 * the shared curriculum, its topics and skills (dl-e8ov.5.44),
 * seeded into DATABASE_URL through the Store, which sets `app.pod_id` per
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
const examples = await importExamples(store);
for (const [language, rows] of Object.entries(examples)) {
  process.stdout.write(`playground examples: ${rows.length} in ${language}\n`);
}
// The shared catalogue from packages/core (dl-liwi.15), written once per key (dl-e8ov.5.71).
const seeded = await seedCatalogue(store, fromCatalogue(catalogue()));
process.stdout.write(
  `curriculum ${seeded.curriculum}: ${seeded.topics} topics, ${seeded.skills.length} skills\n`,
);
