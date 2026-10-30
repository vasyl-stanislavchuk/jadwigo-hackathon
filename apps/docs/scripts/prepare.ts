// Run before every build and dev server: writes the gitignored snapshots the generated pages read
// into public/, where the site also serves them: /openapi.json, the document the API reference is
// generated from (dl-5ssh.90.7), and /mcp-tools.json, the tool list the MCP pages are made from
// (dl-5ssh.90.8). A plain file read, so docs never imports another app.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { apiBase } from "../src/index.ts";
import { type OpenApiDocument, servedDocument } from "../src/lib/openapi.ts";

/** One snapshot: where it is in the repo, its place in public/, and how it changes on the way. */
interface Copy {
  readonly from: string;
  readonly to: string;
  /** Rewrites the parsed JSON; without one, the file is copied as it is. */
  readonly transform?: (json: never) => unknown;
}

const COPIES: readonly Copy[] = [
  {
    from: "../../../packages/contracts/openapi.json",
    to: "../public/openapi.json",
    transform: (document: OpenApiDocument) => servedDocument(document, apiBase),
  },
  { from: "../../cli/mcp-tools.json", to: "../public/mcp-tools.json" },
];

mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
for (const { from, to, transform } of COPIES) {
  const source = new URL(from, import.meta.url);
  const target = new URL(to, import.meta.url);
  if (transform === undefined) copyFileSync(source, target);
  else {
    const json = transform(JSON.parse(readFileSync(source, "utf8")) as never);
    writeFileSync(target, `${JSON.stringify(json, null, 2)}\n`);
  }
  console.warn(`public/${to.split("/").at(-1)} written`);
}
