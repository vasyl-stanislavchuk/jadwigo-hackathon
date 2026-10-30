import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { hosts } from "@jadwigo/config";
import { ERROR_STATUS, ROUTES } from "@jadwigo/contracts";
import { QUESTION_TYPES } from "@jadwigo/lesson-kit/question-types";
import { apiBase, servedHost } from "../index.ts";
import { API_PAGES } from "./guides.ts";
import { REGISTER_HREF } from "./mcp.ts";
import { type OpenApiDocument, operationCount } from "./openapi.ts";
import { gallery } from "./question-types.ts";
import { foundation } from "./tokens.ts";

/** A file the built site must have, and a text it must carry. */
export const MUST: readonly (readonly [file: string, text: string])[] = [
  ["index.html", '<html lang="en"'],
  ["index.html", `<link rel="canonical" href="https://${servedHost}/"`],
  ["index.html", 'href="/guides/agents/"'],
  ["guides/introduction/index.html", apiBase],
  ["guides/authentication/index.html", ROUTES.getMe.path],
  ["guides/authentication/index.html", ROUTES.questionSearches.path],
  ["guides/authentication/index.html", ROUTES.questionBody.path],
  ["guides/errors/index.html", `<code>${Object.keys(ERROR_STATUS).at(-1)}</code>`],
  ["guides/errors/index.html", 'class="generated'],
  ["guides/first-call/index.html", ROUTES.featuredLessons.path],
  ["mcp/index.html", "MCP"],
  ["mcp/index.html", 'href="/mcp/question_item/"'],
  // Registration comes first on the MCP page, and every tool page links back to it (dl-5ssh.90.31).
  ["mcp/index.html", 'id="muse-code"'],
  ["mcp/question_item/index.html", ">item_id</code>"],
  ["mcp/question_item/index.html", `href="${REGISTER_HREF}"`],
  ["mcp-tools.json", '"name": "question_item"'],
  ["design-system/index.html", gallery],
  ["design-system/tokens/index.html", `<code>--${foundation().roles.at(-1)?.name}</code>`],
  ["design-system/question-types/index.html", `<code>${QUESTION_TYPES.at(-1)?.name}</code>`],
  // Mermaid draws in the browser (astro-mermaid), so the HTML carries each diagram's source.
  ["architecture/index.html", '<pre class="mermaid"'],
  ["architecture/index.html", "Supabase Auth"],
  ["architecture/monorepo/index.html", "lesson_kit --&gt; ui"],
  ["architecture/contracts/index.html", '<pre class="mermaid"'],
  ["404.html", "Page not found"],
  ["llms.txt", `https://${servedHost}/llms-full.txt`],
  ["llms.txt", `https://${servedHost}/openapi.json`],
  ["llms-full.txt", "Your first call"],
  ["sitemap-index.xml", `https://${servedHost}/sitemap-0.xml`],
  ["pagefind/pagefind.js", ""],
];

/** The public docs are self-contained: no page links into the repo (dl-5ssh.90, the owner). */
const REPO_LINK = /href="https?:\/\/(www\.)?github\.com\//;

/**
 * Hosts not ours that a page may name, each with what names it. Every other host in the built
 * HTML must be `hosts.prod.app` or `hosts.prod.docs`, so a hand-written URL can't drift from
 * packages/config (dl-5ssh.90.19).
 */
const THIRD_PARTY_HOSTS: Readonly<Record<string, string>> = {
  "json-schema.org": "the $schema id in each MCP tool's JSON Schema (mcp/*)",
  "ui.shadcn.com": "the credit for the neutral components (design-system/primitives)",
};

const OUR_HOSTS = new Set([hosts.prod.app, hosts.prod.docs]);
const ANY_HOST = /https?:\/\/([A-Za-z0-9.-]+)/g;

/** The hosts a page names that are neither ours nor allowlisted, each once. */
export function strayHosts(html: string): string[] {
  const named = new Set([...html.matchAll(ANY_HOST)].map((match) => match[1] ?? ""));
  return [...named].filter((host) => !OUR_HOSTS.has(host) && !(host in THIRD_PARTY_HOSTS));
}

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".html"))
    .map((path) => join(dir, path));
}

/**
 * The API reference: /openapi.json with every route and the app's host as its server, and a built
 * page for the overview, each tag and each operation.
 */
function checkApi(dist: string): string[] {
  const problems: string[] = [];
  const path = join(dist, "openapi.json");
  if (!existsSync(path)) return ["dist/openapi.json is missing"];
  const document = JSON.parse(readFileSync(path, "utf8")) as OpenApiDocument;
  const operations = operationCount(document);
  const routes = Object.keys(ROUTES).length;
  if (operations !== routes)
    problems.push(`dist/openapi.json has ${operations} operations, ROUTES ${routes}`);
  if (document.servers?.[0]?.url !== apiBase)
    problems.push(`dist/openapi.json's servers[0].url is not ${apiBase}`);
  for (const page of API_PAGES) {
    if (!existsSync(join(dist, page, "index.html"))) problems.push(`dist${page} is not built`);
  }
  return problems;
}

/** Every problem with the built site at `dist`, one line each; none when it may be published. */
export function checkDist(dist: string): string[] {
  if (!existsSync(dist)) return [`${dist} does not exist: run the build first`];
  const problems = checkApi(dist);
  for (const [file, text] of MUST) {
    const path = join(dist, file);
    if (!existsSync(path)) problems.push(`dist/${file} is missing`);
    else if (!readFileSync(path, "utf8").includes(text))
      problems.push(`dist/${file} lacks ${text}`);
  }
  for (const path of htmlFiles(dist)) {
    const html = readFileSync(path, "utf8");
    const file = `dist/${relative(dist, path)}`;
    if (REPO_LINK.test(html)) problems.push(`${file} links into GitHub`);
    for (const host of strayHosts(html))
      problems.push(`${file} names ${host}, not ${hosts.prod.app} or ${hosts.prod.docs}`);
  }
  return problems;
}
