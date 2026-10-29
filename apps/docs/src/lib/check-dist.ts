import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { ERROR_STATUS, ROUTES } from "@jadwigo/contracts";
import { apiBase, servedHost } from "../index.ts";
import { API_PAGES } from "./guides.ts";
import { type OpenApiDocument, operationCount } from "./openapi.ts";

/** A file the built site must have, and a text it must carry. */
export const MUST: readonly (readonly [file: string, text: string])[] = [
  ["index.html", '<html lang="en"'],
  ["index.html", `<link rel="canonical" href="https://${servedHost}/"`],
  ["guides/introduction/index.html", apiBase],
  ["guides/authentication/index.html", ROUTES.getMe.path],
  ["guides/authentication/index.html", ROUTES.questionSearches.path],
  ["guides/authentication/index.html", ROUTES.questionBody.path],
  ["guides/errors/index.html", `<code>${Object.keys(ERROR_STATUS).at(-1)}</code>`],
  ["guides/first-call/index.html", ROUTES.featuredLessons.path],
  ["mcp/index.html", "MCP"],
  ["design-system/index.html", "Design system"],
  ["architecture/index.html", "Architecture"],
  ["404.html", "Page not found"],
  ["llms.txt", `https://${servedHost}/llms-full.txt`],
  ["llms.txt", `https://${servedHost}/openapi.json`],
  ["llms-full.txt", "Your first call"],
  ["sitemap-index.xml", `https://${servedHost}/sitemap-0.xml`],
  ["pagefind/pagefind.js", ""],
];

/** The public docs are self-contained: no page links into the repo (dl-5ssh.90, the owner). */
const REPO_LINK = /href="https?:\/\/(www\.)?github\.com\//;

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
    if (REPO_LINK.test(readFileSync(path, "utf8")))
      problems.push(`dist/${relative(dist, path)} links into GitHub`);
  }
  return problems;
}
