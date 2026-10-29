// gitleaks with the family-name rule (dl-5ssh.34.39). The names never enter git: they are read
// at run time from the owner's private-terms file (JADWIGO_PRIVATE_TERMS, by default
// ~/.config/jadwigo/private-terms.txt, the one md's merge steward reads) and added to a temp
// config that extends .gitleaks.toml. Without the file only the default rules run. CI runs those.
// Decision: jadwigo-platform/decisions/2026-10-29-the-family-name-gitleaks-rule-reads-the-owner-s-private-terms-fi
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

/** One term a line; blank lines and # comments skipped. */
export function parseTerms(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
}

/** A config that extends the repo's and adds the family-name rule. apps/site may name the family
 * (2026-10-27-fence-9-narrows-the-marketing-site-may-name-the-owner-s-family-n), and so may the
 * david-learns tracker's path. RE2 has no lookahead, so that is a line allowlist. */
export function familyNameConfig(base: string, terms: string[]): string {
  const escaped = terms.map((t) => t.replace(/[\\.+*?()|[\]{}^$]/g, "\\$&"));
  // RE2's \b knows only ASCII letters, so a name starting with Ł needs its own boundary.
  const regex = `(?i)(?:^|[^\\p{L}\\p{N}_])(?:${escaped.join("|")})(?:[^\\p{L}\\p{N}_]|$)`;
  const keywords = terms.map((t) => JSON.stringify(t.toLowerCase())).join(", ");
  return `[extend]
path = ${JSON.stringify(base)}

[[rules]]
id = "family-name"
description = "A family member's name in a committed file"
regex = '''${regex}'''
keywords = [${keywords}]

[[rules.allowlists]]
paths = ['''(^|/)apps/site/''']

[[rules.allowlists]]
regexTarget = "line"
regexes = ['''(?i)\\pL+[-_]learns''']
`;
}

if (import.meta.main) {
  const repo = resolve(import.meta.dirname, "../..");
  const base = join(repo, ".gitleaks.toml");
  const termsFile =
    process.env["JADWIGO_PRIVATE_TERMS"] ?? join(homedir(), ".config/jadwigo/private-terms.txt");
  const terms = existsSync(termsFile) ? parseTerms(readFileSync(termsFile, "utf8")) : [];
  let config = base;
  let dir: string | undefined;
  if (terms.length > 0) {
    dir = mkdtempSync(join(tmpdir(), "gitleaks-"));
    config = join(dir, "gitleaks.toml");
    writeFileSync(config, familyNameConfig(base, terms), { mode: 0o600 });
  } else {
    console.error(`gitleaks: no terms in ${termsFile}, so the family-name rule is off.`);
  }
  const out = spawnSync("gitleaks", [...process.argv.slice(2), "--config", config], {
    stdio: "inherit",
  });
  if (dir) rmSync(dir, { recursive: true, force: true });
  if (out.error) console.error(`gitleaks: ${out.error.message}`);
  process.exit(out.status ?? 1);
}
