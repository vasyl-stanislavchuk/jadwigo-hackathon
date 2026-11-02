import { request } from "node:http";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import type { RunStepInput } from "@jadwigo/contracts";
import { localRunnerUrl, runnerLiveAliasArn } from "./config.ts";

/**
 * Wakes the step host for one step its route just committed (dl-z5ja.88, the interface the host
 * lane named in dl-z5ja.20). It never throws: the step is already queued, and the host's
 * every-minute schedule drains it if the poke is lost.
 */
export type PokeStepHost = (step: RunStepInput) => Promise<void>;

/** The client the step host is invoked through: `LambdaClient` in the Lambda, a fake in tests. */
export interface PokeClient {
  send(command: InvokeCommand): Promise<unknown>;
}

/**
 * The poke in the Lambda: an async invoke (`InvocationType: "Event"`) of the alias
 * `RUNNER_LIVE_ALIAS_ARN` names, with the step as its payload, the run's wire id and attempt
 * only. Undefined when the variable is unset, so the routes poke nothing.
 */
export function lambdaPoke(
  arn = runnerLiveAliasArn(),
  client: PokeClient = new LambdaClient({}),
): PokeStepHost | undefined {
  if (arn === undefined) return undefined;
  return async (step) => {
    await client.send(
      new InvokeCommand({
        FunctionName: arn,
        InvocationType: "Event",
        Payload: new TextEncoder().encode(JSON.stringify(step)),
      }),
    );
  };
}

/** Where a local poke goes: a unix socket's path, or a host and port, and the request path. */
export type PokeTarget =
  | { socketPath: string; path: string }
  | { host: string; port: number; path: string };

/** The path the local step host answers a poke on (apps/runner/src/dev.ts), when the URL names none. */
const LOCAL_POKE_PATH = "/poke";

/** The hosts a local poke may go to: this machine only, never the network. */
const LOOPBACK = new Set(["127.0.0.1", "localhost", "::1"]);

/**
 * How long a poke may take. The route awaits its pokes before it replies, so a step host that
 * takes the connection and never answers must not hold the parent's request: past this the poke
 * fails, `pokeAll` logs it, and the step waits in the queue for the host's next drain.
 */
const POKE_TIMEOUT_MS = 2000;

/**
 * Where `LOCAL_RUNNER_URL` points: `unix:<absolute path>` (what `make dev-all` sets, so the host
 * needs no port of its own) or `http://<loopback host>:<port>[/path]`, where `[::1]` is IPv6's.
 * A URL's path is kept as given, `/poke` when it names none. Anything else throws, naming the form.
 */
export function pokeTarget(url: string): PokeTarget {
  const form =
    "LOCAL_RUNNER_URL is neither unix:<absolute path> nor http://<127.0.0.1, localhost or [::1]>:<port>";
  if (url.startsWith("unix:")) {
    const socketPath = url.slice("unix:".length);
    if (!socketPath.startsWith("/")) throw new Error(form);
    return { socketPath, path: LOCAL_POKE_PATH };
  }
  const parsed = URL.canParse(url) ? new URL(url) : undefined;
  // URL keeps an IPv6 host in its brackets; node:http wants it bare.
  const host = parsed?.hostname.replace(/^\[(.*)\]$/, "$1");
  if (parsed?.protocol !== "http:" || host === undefined || !LOOPBACK.has(host))
    throw new Error(form);
  const path = parsed.pathname === "/" ? LOCAL_POKE_PATH : `${parsed.pathname}${parsed.search}`;
  return { host, port: Number(parsed.port || 80), path };
}

/** Posts one JSON body to a target and resolves on a 2xx answer; the default speaks node:http. */
export type PostJson = (target: PokeTarget, body: string) => Promise<void>;

/** node:http's POST, failed once `timeout_ms` passes with no answer (POKE_TIMEOUT_MS). */
export function httpPost(timeout_ms = POKE_TIMEOUT_MS): PostJson {
  return (target, body) =>
    new Promise((resolve, reject) => {
      const req = request(
        {
          ...target,
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": Buffer.byteLength(body),
          },
        },
        (res) => {
          res.resume();
          const status = res.statusCode ?? 0;
          if (status >= 200 && status < 300) resolve();
          else reject(new Error(`the local step host answered ${status}`));
        },
      );
      req.setTimeout(timeout_ms, () =>
        req.destroy(new Error(`the local step host did not answer in ${timeout_ms} ms`)),
      );
      req.on("error", reject);
      req.end(body);
    });
}

/**
 * The poke on this machine (dl-uukj.47.14.1): `make dev-all`'s step host (apps/runner/src/dev.ts)
 * takes the step as Lambda's alias does, a POST of the run's wire id and attempt only. Undefined
 * when `LOCAL_RUNNER_URL` is unset, so the routes poke nothing.
 */
export function localPoke(
  url = localRunnerUrl(),
  post: PostJson = httpPost(),
): PokeStepHost | undefined {
  if (url === undefined) return undefined;
  const target = pokeTarget(url);
  return (step) => post(target, JSON.stringify(step));
}

/**
 * Pokes once for each step, after the unit committed, and swallows a failure into one log line:
 * the route's reply never depends on it. The line names the run and the error, never a body.
 */
export async function pokeAll(poke: PokeStepHost | undefined, steps: readonly RunStepInput[]) {
  if (poke === undefined) return;
  for (const step of steps) {
    try {
      await poke(step);
    } catch (error) {
      const failure =
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { name: typeof error, message: String(error) };
      console.error(
        JSON.stringify({
          level: "WARN",
          message: "step host poke failed; the schedule drains the step",
          run_id: step.run_id,
          attempt: step.attempt,
          error: failure,
        }),
      );
    }
  }
}
