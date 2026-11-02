import { createPostgresStore } from "@jadwigo/store";
import { databaseUrl } from "./config.ts";
import { withdrawLesson } from "./withdraw.ts";

/**
 * Withdraws one featured lesson from DATABASE_URL by archiving it (`withdraw.ts`, decision
 * dl-w0b4.111): `make lesson-withdraw LESSON=les_… | ASSIGNMENT=asg_… [ENV=dev|prod] [UNDO=1]`,
 * or `bun run withdraw <les_…|asg_…> [--restore]` from this package. `--restore` publishes it
 * again, the undo. Prints one line:
 * `<lesson id> archived: off the featured list; its play links still play`, or
 * `<lesson id> published: back on the featured list`.
 */
const args = process.argv.slice(2);
const restore = args.includes("--restore");
const targets = args.filter((a) => !a.startsWith("--"));
const target = targets[0];
if (target === undefined || targets.length > 1) {
  process.stderr.write("usage: bun run withdraw <les_…|asg_…> [--restore]\n");
  process.exit(2);
}
const store = createPostgresStore(databaseUrl());
try {
  const lesson = await withdrawLesson(store, target, { restore });
  process.stdout.write(
    restore
      ? `${lesson.id} ${lesson.status}: back on the featured list\n`
      : `${lesson.id} ${lesson.status}: off the featured list; its play links still play\n`,
  );
} catch (error) {
  process.stderr.write(`withdraw: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  await store.close();
}
