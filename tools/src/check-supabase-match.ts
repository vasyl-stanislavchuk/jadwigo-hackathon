// Local Postgres matches Supabase (dl-5ssh.34.54, decision
// jadwigo-platform/decisions/2026-10-27-jadwigo-runs-on-a-prod-and-a-dev-supabase-project-a-native-local):
// the server's major version, the extensions available and their versions, the Supabase roles and
// whether they bypass row-level security, and the auth functions supabase/tests/shim.sql stands in for.
// Locally it reads the database DATABASE_URL names, where `make migrate` applied the shim. Remotely it
// runs one catalog query through the Management API's read-only endpoint (as supabase_read_only_user),
// so it writes nothing. The token comes from ~/.config/jadwigo/supabase.env (mode 600), else the
// keychain item supabase-access-token, as the Makefile's db targets read it; it is never printed.
// It needs a network and a secret, so it is not in lint:repo: the owner runs it.
// Run: bun tools/src/check-supabase-match.ts [dev|prod]
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export interface Facts {
  readonly serverMajor: number;
  /** Each extension's default version, or null where it is not available. */
  readonly extensions: Readonly<Record<string, string | null>>;
  /** Each role's rolbypassrls, or null where the role does not exist. */
  readonly roles: Readonly<Record<string, boolean | null>>;
  /** Each auth function's result type, or null where it does not exist. */
  readonly authFunctions: Readonly<Record<string, string | null>>;
}

export const EXTENSIONS = ["pgtap", "vector", "pgcrypto", "uuid-ossp", "pg_cron"] as const;
export const ROLES = ["anon", "authenticated", "authenticator", "service_role"] as const;
export const AUTH_FUNCTIONS = ["uid", "jwt", "role", "email"] as const;

/** Drifts a decision or an issue already accepts: printed, never failing. */
export const ACCEPTED: Readonly<Record<string, string>> = {
  "extension pg_cron":
    "plain Postgres has no pg_cron; the expiry migration schedules its job only where it is available (dl-5ssh.3.5)",
};

const list = (names: readonly string[]) => names.map((n) => `'${n}'`).join(", ");

/** One row, one column: the facts as JSON. Catalog reads only. */
export const FACTS_SQL = `select json_build_object(
  'serverMajor', current_setting('server_version_num')::int / 10000,
  'extensions', (select coalesce(json_object_agg(name, default_version), '{}')
    from pg_available_extensions where name in (${list(EXTENSIONS)})),
  'roles', (select coalesce(json_object_agg(rolname, rolbypassrls), '{}')
    from pg_roles where rolname in (${list(ROLES)})),
  'authFunctions', (select coalesce(json_object_agg(p.proname, pg_get_function_result(p.oid)), '{}')
    from pg_proc as p join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname in (${list(AUTH_FUNCTIONS)}) and p.pronargs = 0)
) as facts`;

/** Fills every name the check compares, so a missing one reads as null rather than absent. */
export function parseFacts(raw: unknown): Facts {
  const r = (raw ?? {}) as Record<string, Record<string, unknown> | number | undefined>;
  const pick = <T>(names: readonly string[], from: unknown): Record<string, T | null> => {
    const o = (from ?? {}) as Record<string, T | undefined>;
    return Object.fromEntries(names.map((n) => [n, o[n] ?? null]));
  };
  return {
    serverMajor: Number(r["serverMajor"]),
    extensions: pick<string>(EXTENSIONS, r["extensions"]),
    roles: pick<boolean>(ROLES, r["roles"]),
    authFunctions: pick<string>(AUTH_FUNCTIONS, r["authFunctions"]),
  };
}

/** The extensions a migration or a pgTAP test creates: their versions must match exactly. */
export function usedExtensions(sql: readonly string[]): Set<string> {
  const used = new Set<string>();
  for (const text of sql) {
    for (const m of text.matchAll(/create\s+extension\s+(?:if\s+not\s+exists\s+)?"?([\w-]+)"?/gi)) {
      if (m[1]) used.add(m[1]);
    }
  }
  return used;
}

const show = (v: unknown) => (v === null ? "missing" : String(v));

/**
 * Drifts fail. Notes do not: an accepted drift, and a version difference in an extension
 * nothing of ours creates.
 */
export function compare(
  local: Facts,
  remote: Facts,
  used: ReadonlySet<string>,
): { drifts: string[]; notes: string[] } {
  const drifts: string[] = [];
  const notes: string[] = [];
  const differ = (key: string, what: string, l: unknown, r: unknown, soft = false) => {
    if (l === r) return;
    const line = `${what}: local ${show(l)}, Supabase ${show(r)}`;
    const accepted = ACCEPTED[key];
    if (accepted) notes.push(`${line} (accepted: ${accepted})`);
    else if (soft) notes.push(`${line} (no migration or test creates it)`);
    else drifts.push(line);
  };
  differ("server", "server major version", local.serverMajor, remote.serverMajor);
  for (const e of EXTENSIONS) {
    const l = local.extensions[e] ?? null;
    const r = remote.extensions[e] ?? null;
    // Present on one side only is a drift; a different version only where we create it.
    const soft = l !== null && r !== null && !used.has(e);
    differ(`extension ${e}`, `extension ${e}`, l, r, soft);
  }
  for (const role of ROLES) {
    differ(
      `role ${role}`,
      `role ${role} bypassrls`,
      local.roles[role] ?? null,
      remote.roles[role] ?? null,
    );
  }
  for (const f of AUTH_FUNCTIONS) {
    differ(
      `auth.${f}`,
      `auth.${f}() returns`,
      local.authFunctions[f] ?? null,
      remote.authFunctions[f] ?? null,
    );
  }
  return { drifts, notes };
}

const REFS: Readonly<Record<string, string>> = {
  dev: "jweuvslwntdimuwcvlzq",
  prod: "xhzkmpainwzrfktxffjv",
};

/** The access token, from the secrets file (mode 600) or the keychain. Never printed. */
function accessToken(): string {
  const file = process.env["SUPABASE_SECRETS"] ?? join(homedir(), ".config/jadwigo/supabase.env");
  if (existsSync(file)) {
    if ((statSync(file).mode & 0o777) !== 0o600) throw new Error(`run chmod 600 ${file} first`);
    const line = readFileSync(file, "utf8")
      .split("\n")
      .find((l) => /^\s*(export\s+)?SUPABASE_ACCESS_TOKEN=/.test(l));
    const value = line
      ?.replace(/^\s*(export\s+)?SUPABASE_ACCESS_TOKEN=/, "")
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2");
    if (value) return value;
  }
  const out = spawnSync(
    "security",
    ["find-generic-password", "-s", "supabase-access-token", "-w"],
    {
      encoding: "utf8",
    },
  );
  const token = out.stdout.trim();
  if (out.status !== 0 || !token) {
    throw new Error(
      `set SUPABASE_ACCESS_TOKEN in ${file}, or add the keychain item supabase-access-token`,
    );
  }
  return token;
}

async function remoteFacts(env: string): Promise<Facts> {
  const ref = REFS[env];
  if (!ref) throw new Error("name dev or prod");
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query/read-only`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: FACTS_SQL }),
  });
  if (!res.ok)
    throw new Error(`jadwigo-${env}'s query failed: HTTP ${res.status} ${await res.text()}`);
  const rows = (await res.json()) as { facts?: unknown }[];
  return parseFacts(rows[0]?.facts);
}

function localFacts(url: string): Facts {
  const out = spawnSync("psql", [url, "-XAtq", "-v", "ON_ERROR_STOP=1", "-c", FACTS_SQL], {
    encoding: "utf8",
  });
  if (out.status !== 0) throw new Error(`psql ${url}: ${out.stderr.trim()}`);
  return parseFacts(JSON.parse(out.stdout));
}

function repoSql(): string[] {
  const root = resolve(import.meta.dirname, "../../supabase");
  return ["migrations", "tests"].flatMap((d) =>
    readdirSync(join(root, d))
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(join(root, d, f), "utf8")),
  );
}

if (import.meta.main) {
  const env = process.argv[2] ?? "dev";
  const url = process.env["DATABASE_URL"] ?? "postgresql://localhost:5433/jadwigo_test";
  try {
    const { drifts, notes } = compare(
      localFacts(url),
      await remoteFacts(env),
      usedExtensions(repoSql()),
    );
    for (const n of notes) console.log(`check-supabase-match: note: ${n}`);
    for (const d of drifts) console.error(`check-supabase-match: ${d}`);
    if (drifts.length > 0) process.exit(1);
    console.log(`check-supabase-match: ${url.replace(/\/\/[^@/]*@/, "//")} matches jadwigo-${env}`);
  } catch (e) {
    console.error(`check-supabase-match: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}
