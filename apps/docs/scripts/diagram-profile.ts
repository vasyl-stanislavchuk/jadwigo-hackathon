// Installs the Jadwigo profile where diagram-design reads profiles (dl-5ssh.90.53.1):
// `~/.diagram-design/profiles/jadwigo.md`. The repo copy at diagrams/jadwigo-profile.md is the
// source of truth, and apps/docs' `.diagram-design` marker (`profile: jadwigo`) selects it.
// Run with `bun run diagram-profile` in apps/docs after the profile changes.
import { copyFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const source = new URL("../diagrams/jadwigo-profile.md", import.meta.url);
const dir = join(homedir(), ".diagram-design", "profiles");
mkdirSync(dir, { recursive: true });
const target = join(dir, "jadwigo.md");
copyFileSync(source, target);
console.warn(`${target} written from diagrams/jadwigo-profile.md`);
