import { EventId, ID_PREFIXES, idOf, type PodId, Uuid } from "@jadwigo/contracts";
import { ConversationId, type RunEvent, type RunId } from "@jadwigo/contracts/run";
import {
  acceptMessage,
  createVerbs,
  type EngineDeps,
  fixtureBank,
  PgmqRunQueue,
} from "@jadwigo/jadwigo-ai";
import { createPostgresStore } from "@jadwigo/store";
import pg from "pg";
import { ProbeMuse } from "./probe.ts";

/**
 * The API's half of a turn, for the probe and the smoke run from a laptop: a made-up pod (a random
 * account, no learner, no name), a conversation, and one parent message accepted as `jadwigo_api`
 * accepts it, which sends the first step to `agent_step`. Nothing here reaches a model.
 */

const POOL = { max: 1, connectionTimeoutMillis: 5000 } as const;

export function apiDeps(url: string): EngineDeps & { close(): Promise<void> } {
  const store = createPostgresStore(url, POOL);
  const pool = new pg.Pool({ connectionString: url, ...POOL });
  pool.on("error", () => undefined);
  return {
    store,
    // acceptMessage never calls the model or a verb; EngineDeps names them all.
    muse: new ProbeMuse(),
    verbs: createVerbs({ bank: fixtureBank() }),
    queue: new PgmqRunQueue(pool, { role: "jadwigo_api" }),
    now: () => new Date(),
    close: async () => {
      await Promise.all([store.close(), pool.end()]);
    },
  };
}

export async function seed(deps: EngineDeps, text: string): Promise<{ pod: PodId; run_id: RunId }> {
  const member = await deps.store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  const conversation = await deps.store.createConversation(member.pod, {
    id: ConversationId.parse(idOf(ID_PREFIXES.conversation, crypto.randomUUID())),
    created_by: member.account,
    title: null,
  });
  const { run } = await acceptMessage(deps, {
    pod: member.pod,
    created_by: member.account,
    conversation_id: conversation.id,
    entry: { event_id: EventId.parse(crypto.randomUUID()), kind: "message", payload: { text } },
  });
  return { pod: member.pod, run_id: run.id };
}

/** What a turn spent: each `model_response` counted once, as the run's own `spentOf`. */
export function usdOf(events: readonly RunEvent[]): number {
  const cost = events.reduce(
    (sum, e) => sum + (e.type === "model_response" ? e.payload.cost_usd : 0),
    0,
  );
  return Math.round(cost * 1e6) / 1e6;
}
