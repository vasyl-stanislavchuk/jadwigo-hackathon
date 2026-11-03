import { readFileSync } from "node:fs";
import { type Foundation, foundation } from "./tokens.ts";

/**
 * The diagram-design Jadwigo profile (dl-5ssh.90.53.1): the skill's style guide with every
 * semantic role set to a `--jw-*` token's colour. Its source of truth is
 * `apps/docs/diagrams/jadwigo-profile.md`; `bun run diagram-profile` installs it where the skill
 * reads profiles, and apps/docs' `.diagram-design` marker selects it. Each role row names
 * its token, and the test beside this file holds every colour equal to that token, read through
 * `tokens.ts` from `packages/ui` as the Tokens page reads it.
 */

/** The semantic roles the profile must carry, as the skill's style guide names them. */
export const PROFILE_ROLES = [
  "paper",
  "paper-2",
  "ink",
  "ink-strong",
  "muted",
  "soft",
  "rule",
  "rule-solid",
  "accent",
  "accent-tint",
  "link",
] as const;

/** One row of the profile's Semantic roles table: the role, its token, and its 2 colours. */
export interface ProfileRole {
  readonly role: string;
  /** The `--jw-*` token the row names, without the dashes: `jw-ground`. */
  readonly token: string;
  readonly light: string;
  readonly dark: string;
}

/** The profile's Semantic roles table, row by row. A row that does not parse is left out. */
export function parseProfileRoles(text: string): ProfileRole[] {
  const section = text.split("### Semantic roles")[1]?.split("\n##")[0] ?? "";
  return section
    .split("\n")
    .filter((line) => line.startsWith("| `"))
    .flatMap((line) => {
      const cells = line.split("|").map((cell) => cell.trim());
      const role = /^`([^`]+)`$/.exec(cells[1] ?? "")?.[1] ?? "";
      const token = /\(`--(jw-[\w-]+)`\)/.exec(cells[2] ?? "")?.[1] ?? "";
      const light = /^`([^`]+)`$/.exec(cells[3] ?? "")?.[1] ?? "";
      const dark = /^`([^`]+)`$/.exec(cells[4] ?? "")?.[1] ?? "";
      return role === "" ? [] : [{ role, token, light, dark }];
    });
}

/**
 * Every way the profile's colours differ from the tokens it names, one line each; none when each
 * of PROFILE_ROLES is present and equal to its token in light and dark.
 */
export function profileProblems(text: string, tiers: Foundation = foundation()): string[] {
  const problems: string[] = [];
  const tokens = new Map(
    [...tiers.roles, ...tiers.scales].map((token) => [token.name, token] as const),
  );
  const rows = parseProfileRoles(text);
  for (const role of PROFILE_ROLES)
    if (!rows.some((row) => row.role === role)) problems.push(`the profile has no ${role} row`);
  for (const row of rows) {
    const token = tokens.get(row.token);
    if (token === undefined) {
      problems.push(`${row.role} names --${row.token || "?"}, which foundation.css does not set`);
      continue;
    }
    if (row.light.toLowerCase() !== token.light.toLowerCase())
      problems.push(`${row.role} is ${row.light} by day, --${row.token} is ${token.light}`);
    if (row.dark.toLowerCase() !== token.dark.toLowerCase())
      problems.push(`${row.role} is ${row.dark} by night, --${row.token} is ${token.dark}`);
  }
  return problems;
}

/** The profile as it is now, at `apps/docs/diagrams/jadwigo-profile.md`. */
export const readProfile = (): string =>
  readFileSync(new URL("../../diagrams/jadwigo-profile.md", import.meta.url), "utf8");
