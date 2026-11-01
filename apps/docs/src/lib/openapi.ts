import type { RouteName, RouteTag } from "@jadwigo/contracts";

/** What each section of the API reference holds, shown on its tag page. */
const TAG_DESCRIPTIONS: Readonly<Record<RouteTag, string>> = {
  attempts:
    "A child's play: start an attempt, answer, ask for help, pause and read the results. No sign-in; the attempt id is the access.",
  parents:
    "The parent screens: the signed-in adult, their pod, their children and what each child played. Every route takes a Supabase Auth token.",
  conversations:
    "A parent's chat with the AI: start a conversation, send a message, read each turn's events and stop a turn. Every route takes a Supabase Auth token.",
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
  "conversations",
  "bank",
];

/** Each section's name in the reference, in Title Case; the document's tags stay lowercase. */
export const TAG_TITLES: Readonly<Record<RouteTag, string>> = {
  health: "Health",
  lessons: "Lessons",
  attempts: "Attempts",
  parents: "Parents",
  conversations: "Conversations",
  bank: "Bank",
};

/**
 * Each operation's short name in the sidebar and on its page, a verb first. The route's own
 * summary, a full sentence, opens the operation's description instead.
 */
const OPERATION_TITLES: Readonly<Record<RouteName, string>> = {
  health: "Check the API is up",
  featuredLessons: "List featured lessons",
  playgroundExamples: "List playground examples",
  startAttempt: "Start an attempt",
  getAttempt: "Read an attempt",
  patchAttempt: "Pause or resume an attempt",
  answer: "Send an answer",
  help: "Ask for help",
  getResults: "Read the results",
  getReview: "Review a finished attempt",
  getAssignmentAttempts: "List an assignment's attempts",
  createAccount: "Create the account",
  getMe: "Read the signed-in adult",
  createLearner: "Add a child",
  claimAttempt: "Claim an attempt",
  getLearnerAttempts: "List a child's attempts",
  getParentReview: "Review a child's attempt",
  getLearnerSkills: "Read a child's skills",
  getLearnerGoals: "List a child's goals",
  createGoal: "Add a goal",
  patchGoal: "Change a goal",
  getLearnerReports: "List a child's reports",
  createReport: "Work out a report",
  patchReport: "Write a report's narrative",
  listSkills: "List the skill catalogue",
  createConversation: "Start a conversation",
  listConversations: "List conversations",
  patchConversation: "Archive a conversation",
  postMessage: "Send a message",
  listConversationRuns: "List a conversation's runs",
  listRunEvents: "List a run's events",
  cancelRun: "Stop a run",
  questionSearches: "Search the bank",
  questionBody: "Read a question",
};

/**
 * The order operations are listed in within their section: the order a client calls them. The
 * reference lists a section's operations in path order, so paths are sorted by the first of their
 * operations here; 2 operations on one path stay together.
 */
export const OPERATION_ORDER: readonly RouteName[] = [
  "health",
  "featuredLessons",
  "playgroundExamples",
  "startAttempt",
  "getAssignmentAttempts",
  "getAttempt",
  "patchAttempt",
  "answer",
  "help",
  "getResults",
  "getReview",
  "createAccount",
  "getMe",
  "createLearner",
  "claimAttempt",
  "getLearnerAttempts",
  "getParentReview",
  "getLearnerSkills",
  "getLearnerGoals",
  "createGoal",
  "patchGoal",
  "getLearnerReports",
  "createReport",
  "patchReport",
  "listSkills",
  "createConversation",
  "listConversations",
  "patchConversation",
  "postMessage",
  "listConversationRuns",
  "listRunEvents",
  "cancelRun",
  "questionSearches",
  "questionBody",
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

interface Operation {
  readonly operationId?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly [key: string]: unknown;
}

function isTag(name: string): name is RouteTag {
  return Object.hasOwn(TAG_TITLES, name);
}

function isRouteName(name: string): name is RouteName {
  return Object.hasOwn(OPERATION_TITLES, name);
}

/** One operation as the reference shows it: a short title, its sentence first, its tag titled. */
function servedOperation(operation: Operation): Operation {
  const id = operation.operationId ?? "";
  if (!isRouteName(id)) return operation;
  const description = [operation.summary, operation.description].filter(Boolean).join("\n\n");
  return {
    ...operation,
    summary: OPERATION_TITLES[id],
    ...(description ? { description } : {}),
    tags: (operation.tags ?? []).map((tag) => (isTag(tag) ? TAG_TITLES[tag] : tag)),
  };
}

/** Where a path sits in the reference: the place of its first operation in OPERATION_ORDER. */
function pathRank(item: Readonly<Record<string, unknown>>): number {
  const ranks = Object.entries(item)
    .filter(([key]) => METHODS.has(key))
    .map(([, operation]) =>
      OPERATION_ORDER.indexOf((operation as Operation).operationId as RouteName),
    )
    .filter((rank) => rank >= 0);
  return ranks.length > 0 ? Math.min(...ranks) : OPERATION_ORDER.length;
}

/**
 * The document docs.jadwigo.pl serves: the committed snapshot, which names no server, plus the
 * one server it is called at, a titled and described section per tag in REFERENCE_TAG_ORDER, a
 * short title on every operation, and paths in OPERATION_ORDER. The snapshot itself is unchanged.
 */
export function servedDocument(snapshot: OpenApiDocument, apiBase: string): OpenApiDocument {
  const paths = Object.entries(snapshot.paths)
    .sort(([, a], [, b]) => pathRank(a) - pathRank(b))
    .map(([path, item]) => [
      path,
      Object.fromEntries(
        Object.entries(item).map(([key, value]) => [
          key,
          METHODS.has(key) ? servedOperation(value as Operation) : value,
        ]),
      ),
    ]);
  return {
    ...snapshot,
    servers: [{ url: apiBase }],
    tags: REFERENCE_TAG_ORDER.map((name) => ({
      name: TAG_TITLES[name],
      description: TAG_DESCRIPTIONS[name],
    })),
    paths: Object.fromEntries(paths),
  };
}
