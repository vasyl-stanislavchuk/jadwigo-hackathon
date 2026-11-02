/**
 * The real bank behind `BankPort` (dl-1u6fn.4): `question_search` is the bank's search, and
 * `lesson_draft` draws from the best set that has lesson-ready questions in the lesson's language,
 * by its page's `ready_ids` only (decisions dl-kaxj and dl-be2l), and reads their bodies in
 * small batches under the route's throttle, a bounded number in all (dl-n9fr.70). It reads through
 * `BankReads`, the bank routes in contract shapes: `httpBankReads`
 * calls them over HTTP with the bank's read token; apps/api can hand it the same functions
 * in-process. A lesson holds at most 20 questions
 * (jadwigo-hackathon/decisions/2026-11-02-a-lesson-holds-at-most-20-questions-however-it-was-made).
 */
import {
  type Need,
  QUESTION_TYPE_FAMILY,
  QuestionBody,
  QuestionSetPage,
  type QuestionType,
  QuestionTypeCounts,
  ROUTES,
  SearchEnvelope,
} from "@jadwigo/contracts";
import type { BankPort, BankQuery } from "./bank.ts";
import { VerbError } from "./types.ts";

/** Which grade and language a type listing asks for; one left out lists them all. */
interface TypesAsked {
  readonly grade?: string;
  readonly language?: string;
}

/** The bank's reads. `set` and `body` answer undefined for an id the bank does not hold. */
export interface BankReads {
  search(need: Need): Promise<SearchEnvelope>;
  set(id: string): Promise<QuestionSetPage | undefined>;
  body(id: string): Promise<QuestionBody | undefined>;
  /** Which question types the bank holds, with counts per grade and language. */
  types(asked: TypesAsked): Promise<QuestionTypeCounts>;
}

/** The most questions a lesson holds, whatever the query asks. */
export const MAX_LESSON_QUESTIONS = 20;
/** How many sets a draw searches before it gives up: the first with a ready question wins. */
const SETS_TRIED = 5;
/**
 * How many bodies one batch reads at once. The route's throttle is 10 a second with a burst of 20
 * (infra/terraform/modules/app/variables.tf), so a batch stays well under the burst.
 */
export const BODY_BATCH = 8;
/** The most bodies one draw reads across every set it tries: 3 a question asked, at most 40. */
export function maxBodyReads(limit: number): number {
  return Math.min(40, Math.max(BODY_BATCH, 3 * limit));
}

/** Why a draw passed over a ready id: the reason, as the error names it. */
type PassedOver = "missing" | "no variant" | "no question_type" | "family mismatch";

type BankSet = Awaited<ReturnType<BankPort["search"]>>["sets"][number];
type BankQuestion = Awaited<ReturnType<BankPort["sources"]>>[number];

/** The bank as `BankPort`. A failed read rejects, and the verb answers it as its error. */
export function apiBank(reads: BankReads): BankPort {
  return {
    async search(query) {
      const need = needOf(query, query.limit);
      if (need === undefined) return { sets: [] };
      const { rows } = await reads.search(need);
      return { sets: rows.map((row) => setOf(row, query)) };
    },
    async sources(query) {
      const limit = Math.min(query.limit, MAX_LESSON_QUESTIONS);
      const { language } = query;
      const need = needOf(query, SETS_TRIED);
      if (need === undefined || limit < 1 || language === "uk") return [];
      const { rows } = await reads.search(need);
      const tally: Tally = { reads: 0, max: maxBodyReads(limit), passed: new Map() };
      for (const row of rows) {
        if (tally.reads >= tally.max) break;
        const page = await reads.set(row.id);
        if (page === undefined) continue;
        const drawn = await draw(reads, page, limit, language, tally);
        if (drawn.length > 0) return drawn;
      }
      if (tally.reads > 0) throw passedOverAll(tally, language);
      return [];
    },
  };
}

/** The bodies one draw has read, its bound, and why each read was passed over. */
interface Tally {
  reads: number;
  readonly max: number;
  readonly passed: Map<PassedOver, number>;
}

/**
 * Every body the draw read was passed over: a plain error that says why, by count, so the model
 * and the logs read the bank's state (bodies with no question_type, dl-n9fr.70) instead of a 429.
 */
function passedOverAll(tally: Tally, language: "pl" | "en"): VerbError {
  const why = [...tally.passed].map(([reason, n]) => `${n} ${reason}`).join(", ");
  return new VerbError(
    "no-questions",
    `the bank's sets for this need have no playable question in ${language}: read ${tally.reads} lesson-ready questions and passed over all of them (${why})`,
  );
}

/** The need for a query, or undefined when it names nothing to search by. */
function needOf(query: BankQuery, limit: number): Need | undefined {
  if (query.language === "uk") return undefined; // the bank holds pl and en only
  const words = query.words?.trim() || undefined;
  if (words === undefined && query.skills.length === 0) return undefined;
  return {
    language: query.language,
    grade: query.grade,
    ...(words === undefined ? {} : { words }),
    ...(query.skills.length === 0 ? {} : { skills: [...query.skills] }),
    limit,
  };
}

function setOf(row: SearchEnvelope["rows"][number], query: BankQuery): BankSet {
  return {
    set_id: row.id,
    title: row.titles[query.language] ?? Object.values(row.titles)[0] ?? row.id,
    grades: row.grade ? [row.grade] : [],
    skills: row.skill_ids ?? [],
    questions: row.items ?? 0,
    why_found: `the bank's search ranked it ${row.rank} (arm ${row.arm})`,
  };
}

/**
 * Up to `limit` questions from a set's ready ids, in set order. The bodies are read in batches of
 * at most `BODY_BATCH`; a body that is missing or has no playable variant in the language is
 * passed over and the next ready ids are read in its place, until the tally's bound is reached.
 */
async function draw(
  reads: BankReads,
  page: QuestionSetPage,
  limit: number,
  language: "pl" | "en",
  tally: Tally,
): Promise<BankQuestion[]> {
  const ready = page.items.ready_ids[language] ?? [];
  const out: BankQuestion[] = [];
  let next = 0;
  while (out.length < limit && next < ready.length && tally.reads < tally.max) {
    const size = Math.min(BODY_BATCH, limit - out.length, tally.max - tally.reads);
    const ids = ready.slice(next, next + size);
    next += ids.length;
    tally.reads += ids.length;
    const bodies = await Promise.all(ids.map((id) => reads.body(id)));
    for (const body of bodies) {
      const question = body === undefined ? "missing" : questionOf(body, page, language);
      if (typeof question === "string") {
        tally.passed.set(question, (tally.passed.get(question) ?? 0) + 1);
      } else out.push(question);
    }
  }
  return out;
}

function questionOf(
  body: QuestionBody,
  page: QuestionSetPage,
  language: "pl" | "en",
): BankQuestion | PassedOver {
  const variant = body[language];
  if (variant === undefined) return "no variant";
  const type: QuestionType | undefined = variant.question_type ?? body.question_type;
  if (type === undefined) return "no question_type";
  if (QUESTION_TYPE_FAMILY[type] !== variant.family) return "family mismatch";
  return {
    source: `bank:${body.id}`,
    set_id: page.id,
    // shortcut: every set the bank holds today is maths; read the set page's subject when a
    // Polish or English set is published.
    subject: "math",
    question_type: type,
    skill_ids: page.skill_ids,
    say: variant.say ?? "",
    question: {
      family: variant.family,
      data: variant.data,
      key: variant.key,
      help: variant.help ?? {},
    },
  };
}

export interface HttpBankOptions {
  /** The API's origin, e.g. https://app.jadwigo.pl. */
  readonly base: string;
  /** The bank's shared read token, sent as a bearer token. */
  readonly token: string;
  readonly fetch?: typeof fetch;
  /** How long one read may take. Default 10 seconds. */
  readonly timeoutMs?: number;
}

/**
 * The bank's routes over HTTP: `POST /api/v1/question-searches`, `GET /api/v1/question-sets/{id}`,
 * `GET /api/v1/questions/{id}` and `GET /api/v1/question-types`. A 404 is undefined; any other failure rejects without the token.
 */
export function httpBankReads({
  base,
  token,
  fetch: send = globalThis.fetch,
  timeoutMs = 10_000,
}: HttpBankOptions): BankReads {
  async function call(method: string, path: string, body?: unknown): Promise<unknown> {
    const reply = await send(new URL(path, base), {
      method,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (reply.status === 404) return undefined;
    if (reply.status === 429) {
      throw new Error(`the bank route ${path} was throttled (429): too many reads at once`);
    }
    if (!reply.ok) throw new Error(`the bank route ${path} answered ${reply.status}`);
    return reply.json();
  }
  const at = (path: string, id: string) => path.replace("{id}", encodeURIComponent(id));
  return {
    search: async (need) =>
      SearchEnvelope.parse(
        await call(ROUTES.questionSearches.method, ROUTES.questionSearches.path, need),
      ),
    set: async (id) => {
      const page = await call(ROUTES.questionSet.method, at(ROUTES.questionSet.path, id));
      return page === undefined ? undefined : QuestionSetPage.parse(page);
    },
    body: async (id) => {
      const body = await call(ROUTES.questionBody.method, at(ROUTES.questionBody.path, id));
      return body === undefined ? undefined : QuestionBody.parse(body);
    },
    types: async (asked) => {
      const query = new URLSearchParams();
      if (asked.grade !== undefined) query.set("grade", asked.grade);
      if (asked.language !== undefined) query.set("language", asked.language);
      const path = `${ROUTES.questionTypes.path}${query.size > 0 ? `?${query}` : ""}`;
      const counts = await call(ROUTES.questionTypes.method, path);
      if (counts === undefined) throw new Error(`the bank route ${path} answered 404`);
      return QuestionTypeCounts.parse(counts);
    },
  };
}
