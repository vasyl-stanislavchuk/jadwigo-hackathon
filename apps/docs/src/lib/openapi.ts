import type { RouteTag } from "@jadwigo/contracts";

/** What each section of the API reference holds, shown on its tag page. */
const TAG_DESCRIPTIONS: Readonly<Record<RouteTag, string>> = {
  attempts:
    "A child's play: start an attempt, answer, ask for help, pause and read the results. No sign-in; the attempt id is the access.",
  parents:
    "The parent screens: the signed-in adult, their pod, their children and what each child played. Every route takes a Supabase Auth token.",
  lessons: "The lessons anyone may play, and the playground's written examples.",
  bank: "The question bank: search it, and read one question. Every route takes the bank's read token.",
  health: "Whether the API is up.",
};

/**
 * The order the API reference lists its sections in: the order the first-call guide meets them.
 * Only the served document is reordered; the committed snapshot keeps ROUTE_TAGS order.
 */
export const REFERENCE_TAG_ORDER: readonly RouteTag[] = [
  "health",
  "lessons",
  "attempts",
  "parents",
  "bank",
];

/** The parts of an OpenAPI document this file reads and writes; the rest passes through as is. */
export interface OpenApiDocument {
  readonly openapi: string;
  readonly tags?: readonly { readonly name: string; readonly description?: string }[];
  readonly servers?: readonly { readonly url: string }[];
  readonly paths: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly [key: string]: unknown;
}

const METHODS = new Set(["get", "post", "patch", "put", "delete", "head", "options", "trace"]);

/** The number of operations in a document: one per method under each path. */
export function operationCount(document: OpenApiDocument): number {
  return Object.values(document.paths).reduce(
    (sum, item) => sum + Object.keys(item).filter((key) => METHODS.has(key)).length,
    0,
  );
}

/**
 * The document docs.jadwigo.pl serves: the committed snapshot, which names no server, plus the
 * one server it is called at and a description on every tag, in REFERENCE_TAG_ORDER.
 */
export function servedDocument(snapshot: OpenApiDocument, apiBase: string): OpenApiDocument {
  return {
    ...snapshot,
    servers: [{ url: apiBase }],
    tags: REFERENCE_TAG_ORDER.map((name) => ({ name, description: TAG_DESCRIPTIONS[name] })),
  };
}
