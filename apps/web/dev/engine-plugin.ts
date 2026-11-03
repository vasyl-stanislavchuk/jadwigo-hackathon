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
  Verb,
  Verbs,
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
import { type PacePlay, playOf } from "./paces.ts";

const ENGINE_PLUGIN = "jadwigo-engine";
/** How far past a turn's longest life a `pastMax` pace runs its clock, so the turn ends failed. */
const PAST_MAX_MS = 24 * 60 * 60 * 1000;
/** How far a retrying pace moves its queue's clock, past a step's visibility timeout (60 s). */
const PAST_VISIBILITY_MS = 61_000;

/** The engine's fence around words someone wrote (packages/jadwigo-ai src/fence): tag, what it says, the words. */
const FENCED = /^<jadwigo_untrusted source="[a-z]+">\n[^\n]*\n([\s\S]*)\n<\/jadwigo_untrusted>$/;

/**
 * The words inside the engine's fence, or the text as it came when it has none (dl-uukj.47.39):
 * the scripted draft is about what the parent wrote, never about the fence's own sentence.
 */
export function unfenced(text: string): string {
  return FENCED.exec(text.trim())?.[1]?.trim() ?? text;
}

/** The parent's latest words in a request: what the scripted draft is about. */
function lastWords(request: MuseRequest): string {
  const said = request.input.filter((i) => i.type === "message" && i.role === "user");
  const last = said.at(-1);
  if (last?.type !== "message") return "";
  // A message with photos carries parts (dl-z5ja.11.4): its words are its text parts.
  if (typeof last.text === "string") return unfenced(last.text);
  return last.text.flatMap((p) => (p.type === "input_text" ? [unfenced(p.text)] : [])).join(" ");
}

export interface Modules {
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

/** Where the engine pushes a run's events, and where it logs: the dev server, or a test. */
export interface EngineHost {
  push(channel: string, data: LivePush): void;
  error(message: string): void;
}

/** Which queue a pace's steps go to (see `devEngine`). */
type LaneKind = "main" | "held" | "failing" | "retrying";
const laneKind = (play: PacePlay): LaneKind => {
  // A retry first: its step must come back, which a held lane never lets it.
  if (play.failOnce !== undefined) return "retrying";
  if (play.stall || play.hold) return "held";
  return play.pastMax ? "failing" : "main";
};

const never = <T>(): Promise<T> => new Promise<T>(() => {});

/**
 * The engine for one dev server: one made-up pod and parent, everything in memory. Each
 * conversation plays the pace it was sent with (`dev/paces.ts`), so 2 pages at different paces
 * never pace each other's turns: a run's pace is its conversation's.
 */
export function devEngine(host: EngineHost, m: Modules) {
  const { acceptMessage, createVerbs, drain, fixtureBank, InMemoryRunQueue, VerbError } = m.engine;
  const { ConversationId, RunId } = m.run;

  /** A script per run, so every turn plays its pace from its start. */
  const scripts = new Map<string, ScriptedMuse>();
  /** Each run's verb calls so far, by verb: a hold and a refusal count them. */
  const calls = new Map<string, Map<string, number>>();
  /** The runs whose failing model call has failed its once. */
  const failedOnce = new Set<string>();
  const paces = new Map<string, Pace>();
  const conversations = new Map<string, string>();

  /** The store, with every append pushed to the page on `run:<id>`. */
  const store = new m.store.InMemoryStore();
  const append = store.appendRunEvents.bind(store);
  store.appendRunEvents = async (pod, run, attempt, events) => {
    const appended = await append(pod, run, attempt, events);
    if (!appended.stale && appended.value.length > 0)
      host.push(runChannel(run), { run_id: run, events: [...appended.value] });
    return appended;
  };

  /** A run's play: its conversation's pace, looked up once. */
  async function playOfRun(run: string): Promise<PacePlay> {
    let conversation = conversations.get(run);
    if (conversation === undefined) {
      const pod = await store.findRunPod(RunId.parse(run));
      if (!pod) return playOf(null);
      conversation = (await store.getRun(pod, RunId.parse(run))).conversation_id ?? "";
      conversations.set(run, conversation);
    }
    return playOf(paces.get(conversation) ?? null);
  }

  /**
   * The queues. A held pace's steps (a model or a verb that never answers) go to a lane that
   * archives a step the moment it is read: the step hangs, and one delivered again would hang the
   * next drain on it and write a retry into a log that must stay still. A failing lane drains on a
   * clock past the turn's max deadline, so the engine ends it failed with `RunTimedOut`. A retrying
   * lane's clock jumps past the visibility timeout when its model call fails, so the same drain
   * reads the step again and logs the retry. Each lane is read only by its own drains.
   */
  const lane = (clock: () => Date = () => new Date()): Engine.InMemoryRunQueue =>
    new InMemoryRunQueue(clock);
  const held = lane();
  const readHeld = held.read.bind(held);
  held.read = async (vt_s, qty) => {
    const read = await readHeld(vt_s, qty);
    for (const step of read) await held.archive(step.msg_id);
    return read;
  };
  const failing = lane();
  let skew = 0;
  const retrying = lane(() => new Date(Date.now() + skew));
  const queue = lane();
  const enqueue = queue.send.bind(queue);
  const LANES: Readonly<Record<Exclude<LaneKind, "main">, Engine.InMemoryRunQueue>> = {
    held,
    failing,
    retrying,
  };
  queue.send = async (message, delay_s) => {
    const kind = laneKind(await playOfRun(message.run_id));
    return kind === "main" ? enqueue(message, delay_s) : LANES[kind].send(message, delay_s);
  };

  const muse: MuseClient = {
    async respond(request: MuseRequest): Promise<MuseResponse> {
      const play = await playOfRun(request.run_id);
      let scripted = scripts.get(request.run_id);
      if (scripted === undefined) {
        scripted = new m.engine.ScriptedMuse(play.script(lastWords));
        scripts.set(request.run_id, scripted);
      }
      // `stall`: the step has taken the parent's words into the log; the model never answers.
      if (play.stall) return never();
      await new Promise((resolve) => setTimeout(resolve, play.think_ms));
      if (
        play.failOnce !== undefined &&
        scripted.calls.length === play.failOnce &&
        !failedOnce.has(request.run_id)
      ) {
        failedOnce.add(request.run_id);
        skew += PAST_VISIBILITY_MS;
        throw new Error("the scripted model failed once, as a dev pace asks");
      }
      return scripted.respond(request);
    },
  };

  const now = () => new Date();
  // The learner verbs read the dev page's own made-up pod (dl-z5ja.25).
  const real = createVerbs({ bank: fixtureBank(), learners: store, now });
  /** Each verb, counted per run, so a pace can hold one call or refuse the first. */
  const paced = (verb: Verb): Verb => ({
    ...verb,
    async run(context, input) {
      const play = await playOfRun(context.run_id);
      const counted = calls.get(context.run_id) ?? new Map<string, number>();
      calls.set(context.run_id, counted);
      const n = (counted.get(verb.name) ?? 0) + 1;
      counted.set(verb.name, n);
      if (play.hold?.verb === verb.name && play.hold.call === n) return never();
      if (play.refuseOnce === verb.name && n === 1)
        throw new VerbError("input", `${verb.name}: refused once, as a dev pace asks`);
      return verb.run(context, input);
    },
  });
  const verbs = Object.fromEntries(
    Object.entries(real).map(([name, verb]) => [name, paced(verb)]),
  ) as unknown as Verbs;
  const deps: EngineDeps = { store, muse, verbs, queue, now };
  const member = store.createAccount(m.contracts.Uuid.parse(crypto.randomUUID()), "pl");
  let draining: Promise<unknown> = Promise.resolve();
  /** A step that throws stays in its queue; the host logs why, by run. */
  const logged = {
    onError: (e: unknown, step: { run_id: string }) =>
      host.error(`[${ENGINE_PLUGIN}] run ${step.run_id}: ${String(e)}`),
  };
  /** A lane's drain: on its own, so it never holds up another turn's. */
  const drainLane = (lane: EngineDeps["queue"], clock: () => Date) => {
    drain({ ...deps, queue: lane, now: clock }, logged).catch((e: unknown) =>
      host.error(`[${ENGINE_PLUGIN}] ${String(e)}`),
    );
  };
  /** One drain at a time; a message mid-drain is picked up by the drain running. */
  const kick = () => {
    draining = draining
      .then(() => drain(deps, logged))
      .catch((e: unknown) => host.error(`[${ENGINE_PLUGIN}] ${String(e)}`));
  };

  return {
    store,
    async send(body: SendBody, pace: Pace | null = null): Promise<SendAnswer> {
      const { pod, account } = await member;
      const conversation_id = ConversationId.parse(body.conversation_id);
      if (pace === null) paces.delete(conversation_id);
      else paces.set(conversation_id, pace);
      const kind = laneKind(playOf(pace));
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
                    ...(body.question_ids === undefined ? {} : { question_ids: body.question_ids }),
                    ...(body.patch === undefined || body.base_revision === undefined
                      ? {}
                      : { patch: body.patch, base_revision: body.base_revision }),
                  },
                }
              : { event_id: body.event_id, kind: "cancel", payload: {} },
      });
      // A held turn's step hangs and was archived when read, so a cancel there has no step to end
      // it: it gets one of its own, which finds the cancel and ends the turn.
      const open = run.status === "queued" || run.status === "in_progress";
      if (kind === "held" && body.kind === "cancel" && open) {
        await enqueue({ run_id: run.id, attempt: run.attempt });
        setTimeout(kick, 0);
        return { run };
      }
      // After the answer: the page subscribes, then fetches after its cursor. Each lane drains on
      // its own.
      setTimeout(() => {
        if (kind === "main") kick();
        else if (kind === "failing") drainLane(failing, () => new Date(Date.now() + PAST_MAX_MS));
        else drainLane(LANES[kind], now);
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
      let live: Promise<ReturnType<typeof devEngine>> | null = null;
      const ready = () => {
        live ??= load(server).then((m) =>
          devEngine(
            {
              push: (channel, data) => server.hot.send(channel, data),
              error: (message) => server.config.logger.error(message),
            },
            m,
          ),
        );
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
