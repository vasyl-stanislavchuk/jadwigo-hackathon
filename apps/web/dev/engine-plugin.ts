/**
 * The AI engine's dev-server side (epic dl-z5ja, wave 1; dl-z5ja.17): one Vite plugin, loaded only
 * while `vite` serves, that runs the engine in-process for `/playground/chat`. A parent's message
 * goes through `acceptMessage`, then `drain` runs its steps on an InMemoryStore, ScriptedMuse,
 * `createVerbs({bank: fixtureBank(), learners: store})` and InMemoryRunQueue: no network, no database, no paid call.
 * Every event a run appends is pushed to the page as the `run:<id>` custom event, shaped like the
 * Realtime broadcast wave 2 brings (dl-z5ja.21); the page fetches the log after its cursor over
 * the routes in `src/chat/wire.ts`. Nothing schedules a run: a run starts only when the
 * parent sends (jadwigo-ai-workflows/decisions/2026-10-31-a-report-runs-only-when-the-parent-asks-for-it-never-on-a-schedu).
 * The wave plan is docs/worklog/dl-z5ja/2026-10-31-wave-1.md.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
// Types only at the top: Vite loads this file with Node's type stripping, which cannot read the
// engine's TypeScript (parameter properties), so the engine itself comes in through
// `server.ssrLoadModule`, which Vite transforms in full.
import type * as Contracts from "@jadwigo/contracts";
import type * as RunContracts from "@jadwigo/contracts/run";
import type * as Engine from "@jadwigo/jadwigo-ai";
import type {
  EngineDeps,
  MuseClient,
  MuseRequest,
  MuseResponse,
  ScriptedMuse,
  ScriptedReply,
} from "@jadwigo/jadwigo-ai";
import type * as Store from "@jadwigo/store";
import type { Plugin, ViteDevServer } from "vite";
import {
  ENGINE_BASE,
  type EventsAnswer,
  type LivePush,
  type Pace,
  paceOf,
  type RunsAnswer,
  runChannel,
  type SendAnswer,
  type SendBody,
} from "../src/chat/wire.ts";

const ENGINE_PLUGIN = "jadwigo-engine";
/** How long the scripted model "thinks" per call, so the page shows a turn in progress. */
const THINK_MS = 400;
/** The same under `?pace=slow` (dl-uukj.47.27): long enough to watch each step land. */
const SLOW_THINK_MS = 2000;
/** How far past a turn's longest life `?pace=fail` runs its clock, so the turn ends failed. */
const PAST_MAX_MS = 24 * 60 * 60 * 1000;
/** How many follow-ups a turn's script answers after it drafts and checks. */
const FOLLOW_UPS = 10;

/** The parent's latest words in a request: what the scripted draft is about. */
function lastWords(request: MuseRequest): string {
  const said = request.input.filter((i) => i.type === "message" && i.role === "user");
  const last = said.at(-1);
  if (last?.type !== "message") return "";
  // A message with photos carries parts (dl-z5ja.11.4): its words are its text parts.
  if (typeof last.text === "string") return last.text;
  return last.text.flatMap((p) => (p.type === "input_text" ? [p.text] : [])).join(" ");
}

/** One turn's script: draft from the parent's words, check, say it is ready; then an edit and a
 * line for each follow-up that arrives mid-turn. */
function turnScript(): ScriptedReply[] {
  return [
    {
      tool_calls: [
        {
          verb: "lesson_draft",
          input: (r) => ({ request: lastWords(r), grade: "1", names: [], topic: lastWords(r) }),
        },
      ],
      cost_usd: 0.02,
    },
    {
      tool_calls: [{ verb: "lesson_check", input: (r) => ({ draft_id: r.run_id, help: {} }) }],
      cost_usd: 0.02,
    },
    { text: "Lekcja jest gotowa po prawej.", cost_usd: 0.01 },
    ...Array.from({ length: FOLLOW_UPS }, (): ScriptedReply[] => [
      {
        tool_calls: [
          {
            verb: "lesson_edit",
            input: (r) => ({ draft_id: r.run_id, step_id: "s01", patch: { prompt: lastWords(r) } }),
          },
        ],
        cost_usd: 0.02,
      },
      { text: "Zmienione, lekcja po prawej.", cost_usd: 0.01 },
    ]).flat(),
  ];
}

interface Modules {
  contracts: typeof Contracts;
  run: typeof RunContracts;
  engine: typeof Engine;
  store: typeof Store;
}

async function load(server: ViteDevServer): Promise<Modules> {
  const [contracts, run, engine, store] = await Promise.all([
    server.ssrLoadModule("@jadwigo/contracts"),
    server.ssrLoadModule("@jadwigo/contracts/run"),
    server.ssrLoadModule("@jadwigo/jadwigo-ai"),
    server.ssrLoadModule("@jadwigo/store"),
  ]);
  return {
    contracts: contracts as typeof Contracts,
    run: run as typeof RunContracts,
    engine: engine as typeof Engine,
    store: store as typeof Store,
  };
}

/** The engine for one dev server: one made-up pod and parent, everything in memory. */
function engine(server: ViteDevServer, m: Modules) {
  const { acceptMessage, createVerbs, drain, fixtureBank, InMemoryRunQueue } = m.engine;
  const { ConversationId, RunId } = m.run;

  /** A script per run, so every turn of the dev page plays the same way from its start. */
  const scripts = new Map<string, ScriptedMuse>();
  /**
   * The pace each conversation was sent with (`?pace=`), so 2 pages at different paces never
   * pace each other's turns: a run's pace is its conversation's.
   */
  const paces = new Map<string, Pace>();
  const conversations = new Map<string, string>();
  const muse: MuseClient = {
    async respond(request: MuseRequest): Promise<MuseResponse> {
      let scripted = scripts.get(request.run_id);
      if (scripted === undefined) {
        scripted = new m.engine.ScriptedMuse(turnScript());
        scripts.set(request.run_id, scripted);
      }
      const pace = await paceOfRun(request.run_id);
      // `stall`: the step has taken the parent's words into the log; the model never answers.
      if (pace === "stall") return new Promise<MuseResponse>(() => {});
      const think = pace === "slow" ? SLOW_THINK_MS : THINK_MS;
      await new Promise((resolve) => setTimeout(resolve, think));
      return scripted.respond(request);
    },
  };

  /** The store, with every append pushed to the page on `run:<id>`. */
  const store = new m.store.InMemoryStore();
  const append = store.appendRunEvents.bind(store);
  store.appendRunEvents = async (pod, run, attempt, events) => {
    const appended = await append(pod, run, attempt, events);
    if (!appended.stale && appended.value.length > 0)
      server.hot.send(runChannel(run), {
        run_id: run,
        events: [...appended.value],
      } satisfies LivePush);
    return appended;
  };

  /** A run's pace: its conversation's, looked up once. */
  async function paceOfRun(run: string): Promise<Pace | null> {
    let conversation = conversations.get(run);
    if (conversation === undefined) {
      const pod = await store.findRunPod(RunId.parse(run));
      if (!pod) return null;
      conversation = (await store.getRun(pod, RunId.parse(run))).conversation_id ?? "";
      conversations.set(run, conversation);
    }
    return paces.get(conversation) ?? null;
  }

  /**
   * The queue, paced: a stalled or failing conversation's steps go to a lane of their own, which
   * only that pace's drains read, so no pace ever plays another's turn. A stalled step is archived
   * the moment it is read: its model never answers, and a step delivered again would hang the next
   * stalled drain on it (and write a retry into a log that must stay still). A failing lane drains
   * on a clock past the turn's max deadline, so the engine ends it failed with `RunTimedOut`.
   */
  const lane = (): Engine.InMemoryRunQueue => new InMemoryRunQueue(() => new Date());
  const stalled = lane();
  const readStalled = stalled.read.bind(stalled);
  stalled.read = async (vt_s, qty) => {
    const read = await readStalled(vt_s, qty);
    for (const step of read) await stalled.archive(step.msg_id);
    return read;
  };
  const failing = lane();
  const queue = lane();
  const enqueue = queue.send.bind(queue);
  queue.send = async (message, delay_s) => {
    const pace = await paceOfRun(message.run_id);
    if (pace === "stall") return stalled.send(message, delay_s);
    if (pace === "fail") return failing.send(message, delay_s);
    return enqueue(message, delay_s);
  };
  const now = () => new Date();
  const deps: EngineDeps = {
    store,
    muse,
    // The learner verbs read the dev page's own made-up pod (dl-z5ja.25).
    verbs: createVerbs({ bank: fixtureBank(), learners: store, now }),
    queue,
    now,
  };
  const member = store.createAccount(m.contracts.Uuid.parse(crypto.randomUUID()), "pl");
  let draining: Promise<unknown> = Promise.resolve();
  /** A paced lane's drain: on its own, so it never holds up another turn's. */
  const drainLane = (lane: EngineDeps["queue"], clock: () => Date) => {
    drain({ ...deps, queue: lane, now: clock }).catch((e: unknown) =>
      server.config.logger.error(`[${ENGINE_PLUGIN}] ${String(e)}`),
    );
  };
  /** One drain at a time; a message mid-drain is picked up by the drain running. */
  const kick = () => {
    draining = draining
      .then(() => drain(deps))
      .catch((e: unknown) => server.config.logger.error(`[${ENGINE_PLUGIN}] ${String(e)}`));
  };

  return {
    async send(body: SendBody, pace: Pace | null = null): Promise<SendAnswer> {
      const { pod, account } = await member;
      const conversation_id = ConversationId.parse(body.conversation_id);
      if (pace === null) paces.delete(conversation_id);
      else paces.set(conversation_id, pace);
      await store.createConversation(pod, {
        id: conversation_id,
        created_by: account,
        title: null,
      });
      const { run } = await acceptMessage(deps, {
        pod,
        created_by: account,
        conversation_id,
        entry:
          body.kind === "message"
            ? { event_id: body.event_id, kind: "message", payload: { text: body.text } }
            : body.kind === "steer"
              ? {
                  event_id: body.event_id,
                  kind: "steer",
                  payload: {
                    text: body.text,
                    source: body.source,
                    question_ids: body.question_ids,
                    ...(body.patch === undefined || body.base_revision === undefined
                      ? {}
                      : { patch: body.patch, base_revision: body.base_revision }),
                  },
                }
              : { event_id: body.event_id, kind: "cancel", payload: {} },
      });
      // After the answer: the page subscribes, then fetches after its cursor. A `stall` step logs
      // the parent's message and then waits on a model that never answers; a `fail` step finds
      // its turn past its max deadline. Each drains in its own lane.
      setTimeout(() => {
        if (pace === "stall") drainLane(stalled, now);
        else if (pace === "fail") drainLane(failing, () => new Date(Date.now() + PAST_MAX_MS));
        else kick();
      }, 0);
      return { run };
    },
    async runs(conversation: string): Promise<RunsAnswer> {
      const { pod } = await member;
      const id = ConversationId.safeParse(conversation);
      if (!id.success) return { runs: [] };
      try {
        return { runs: [...(await store.listRuns(pod, id.data))] };
      } catch {
        return { runs: [] }; // a conversation this server has not seen yet
      }
    },
    async events(run: string, after: number): Promise<EventsAnswer> {
      const { pod } = await member;
      return { events: [...(await store.listRunEvents(pod, RunId.parse(run), after))] };
    },
  };
}

/** The request as the gate reads it, so a test needs no socket. */
interface PostRequest {
  headers: Record<string, string | string[] | undefined>;
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * null when a POST may start a run, else the status and the reason (dl-z5ja.45). The Origin must
 * be this dev server's own: its host and port are the Host the request came in on. A browser sends
 * Origin on every POST, and another page's is its own, so it cannot start a scripted run here. The
 * body must be JSON: a cross-site form can send only form and text types without a preflight.
 */
export function admitPost(req: PostRequest): { status: number; error: string } | null {
  const host = one(req.headers["host"]);
  const origin = one(req.headers["origin"]);
  let own = false;
  try {
    const url = new URL(origin ?? "");
    own = (url.protocol === "http:" || url.protocol === "https:") && url.host === host;
  } catch {
    own = false;
  }
  if (!own) return { status: 403, error: "the engine only answers this dev server's own page" };
  const type = (one(req.headers["content-type"]) ?? "").split(";")[0]?.trim().toLowerCase();
  if (type !== "application/json")
    return { status: 415, error: "the engine takes a JSON body (Content-Type: application/json)" };
  return null;
}

async function body(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function answer(res: ServerResponse, status: number, value: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(value));
}

/** The plugin: on `serve` only, so a build never carries it. */
export function enginePlugin(): Plugin {
  return {
    name: ENGINE_PLUGIN,
    apply: "serve",
    configureServer(server: ViteDevServer) {
      // Loaded on the first request, so a server start never waits on the engine.
      let live: Promise<ReturnType<typeof engine>> | null = null;
      const ready = () => {
        live ??= load(server).then((m) => engine(server, m));
        return live;
      };
      server.middlewares.use(ENGINE_BASE, (req, res) => {
        const url = new URL(req.url ?? "/", "http://dev.local");
        const runs = url.pathname.match(/^\/conversations\/([^/]+)\/runs$/)?.[1];
        const events = url.pathname.match(/^\/runs\/([^/]+)\/events$/)?.[1];
        const reply = (work: Promise<unknown>) =>
          work
            .then((value) => answer(res, 200, value))
            .catch((e: unknown) =>
              answer(res, 400, { error: e instanceof Error ? e.message : String(e) }),
            );
        if (req.method === "POST" && url.pathname === "/messages") {
          const refused = admitPost(req);
          if (refused !== null) return answer(res, refused.status, { error: refused.error });
          return void reply(
            Promise.all([ready(), body(req)]).then(([e, b]) =>
              e.send(b as SendBody, paceOf(url.searchParams.get("pace"))),
            ),
          );
        }
        if (req.method === "GET" && runs !== undefined)
          return void reply(ready().then((e) => e.runs(decodeURIComponent(runs))));
        if (req.method === "GET" && events !== undefined)
          return void reply(
            ready().then((e) =>
              e.events(decodeURIComponent(events), Number(url.searchParams.get("after") ?? 0)),
            ),
          );
        answer(res, 404, { error: `no engine route ${req.method} ${url.pathname}` });
      });
    },
  };
}
