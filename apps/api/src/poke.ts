import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import type { RunStepInput } from "@jadwigo/contracts";
import { runnerLiveAliasArn } from "./config.ts";

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
