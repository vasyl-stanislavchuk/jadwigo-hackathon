// Run before every build and dev server: writes the gitignored public/openapi.json, the document
// the API reference is generated from and that agents fetch at /openapi.json (dl-5ssh.90.7).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { apiBase } from "../src/index.ts";
import { type OpenApiDocument, servedDocument } from "../src/lib/openapi.ts";

const snapshot = new URL("../../../packages/contracts/openapi.json", import.meta.url);
const target = new URL("../public/openapi.json", import.meta.url);

const document = JSON.parse(readFileSync(snapshot, "utf8")) as OpenApiDocument;
mkdirSync(new URL("./", target), { recursive: true });
writeFileSync(target, `${JSON.stringify(servedDocument(document, apiBase), null, 2)}\n`);
console.warn("public/openapi.json written");
