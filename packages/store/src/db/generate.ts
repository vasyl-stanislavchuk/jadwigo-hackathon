// `bun run db:types`: writes src/db/types.ts from the database DATABASE_URL names, after
// `make migrate` built it from supabase/migrations. Run it after a new migration.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { databaseUrl } from "../config.ts";
import { introspect, render } from "./introspect.ts";

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
try {
  const out = fileURLToPath(new URL("./types.ts", import.meta.url));
  writeFileSync(out, render(await introspect(client)));
  execFileSync("bunx", ["biome", "format", "--write", out], { stdio: "inherit" });
} finally {
  await client.end();
}
