// Run before every build: copies the snapshots the generated pages read into public/, where the
// site serves them as they are. A plain file copy, so docs never imports another app.
import { copyFileSync, mkdirSync } from "node:fs";

/** Each snapshot, from the repo, to its place in public/. */
const COPIES: readonly (readonly [from: string, to: string])[] = [
  ["../../cli/mcp-tools.json", "../public/mcp-tools.json"],
];

mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
for (const [from, to] of COPIES) {
  copyFileSync(new URL(from, import.meta.url), new URL(to, import.meta.url));
}
