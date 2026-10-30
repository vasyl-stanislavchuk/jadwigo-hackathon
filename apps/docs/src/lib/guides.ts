import { ROUTE_TAGS, ROUTES } from "@jadwigo/contracts";

/** Where the API reference lives in the docs: starlight-openapi's `base` (astro.config.mjs). */
export const API_REFERENCE_BASE = "api";

/** The docs' own pages for one operation and one tag, as starlight-openapi slugs them. */
export const operationHref = (name: string): string =>
  `/${API_REFERENCE_BASE}/operations/${name.toLowerCase()}/`;
const tagHref = (tag: string): string => `/${API_REFERENCE_BASE}/operations/tags/${tag}/`;

/** Every page under /api/ the API reference builds: its overview, each tag and each operation. */
export const API_PAGES: ReadonlySet<string> = new Set([
  `/${API_REFERENCE_BASE}/`,
  ...ROUTE_TAGS.map(tagHref),
  ...Object.keys(ROUTES).map(operationHref),
]);

/** `/api/v1/` or `/api/v2/` on its own: the version prefix a guide names, not a route. */
const VERSION_PREFIX = /^\/api\/v\d+\/$/;

/** An API path written in a page, cut where the path ends. */
const API_PATH = /\/api\/[A-Za-z0-9_\-{}$.…/]*/g;

/** A link into the docs' own /api/ pages: a markdown target or an href. */
const DOCS_LINK = /(?:\]\(|href=")(\/api\/[^)"#\s]*)/g;

/** True when `written` (with `{x}`, `$X` or `…` for a segment) is a path in ROUTES. */
function isRoutePath(written: string): boolean {
  const parts = written.split("/");
  return Object.values(ROUTES).some((route) => {
    const segments = route.path.split("/");
    return (
      segments.length === parts.length &&
      segments.every((segment, i) => {
        const part = parts[i] ?? "";
        if (segment.startsWith("{")) return part !== "";
        return part === segment;
      })
    );
  });
}

/** The API paths a page names that are not in ROUTES, docs links left out. */
export function unknownApiPaths(text: string): string[] {
  const unlinked = text.replace(DOCS_LINK, "");
  return [...unlinked.matchAll(API_PATH)]
    .map((match) => match[0].replace(/[.…]+$/, ""))
    .filter((path) => !VERSION_PREFIX.test(path) && !isRoutePath(path));
}

/** The links a page makes into /api/ that the API reference does not build. */
export function unknownApiLinks(text: string): string[] {
  return [...text.matchAll(DOCS_LINK)]
    .map((match) => match[1] ?? "")
    .filter((href) => !API_PAGES.has(href.endsWith("/") ? href : `${href}/`));
}
