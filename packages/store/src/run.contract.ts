import { EventId, ID_PREFIXES, idOf, PodId, Uuid } from "@jadwigo/contracts";
import {
  type Conversation,
  ConversationId,
  type NewRunEvent,
  RunId,
  RunInbox,
} from "@jadwigo/contracts/run";
import { describe, expect, it } from "vitest";
import type { NewRun } from "./run.ts";
import type { Store } from "./store.ts";

/**
 * The engine's records, as every `Store` keeps them (dl-z5ja.12 step 0; wave plan
 * `docs/worklog/dl-z5ja/2026-10-31-wave-1.md`, Lead decisions 3, 5 and 6). Frozen for the wave's
 * lanes: a gap here is a message to the lead. Wired into `store.test.ts` for `InMemoryStore`; the
 * Postgres store joins it with the dl-z5ja.7 tables (dl-z5ja.19). Each test signs in its own fresh
 * account, so it never assumes an empty database.
 *
 * Until the store lane (dl-z5ja.14) lands, its tests are named in `EXPECTED_RED` and run as
 * `it.fails`: the lane removes each name as it turns green, and the set ends empty.
 */
const EXPECTED_RED = new Set<string>([]);

export function runContract(name: string, make: () => Promise<Store> | Store): void {
  /** `it`, or `it.fails` while the name is in EXPECTED_RED. */
  const frozen = (title: string, body: () => Promise<void>) =>
    (EXPECTED_RED.has(title) ? it.fails : it)(title, body);

  describe(`${name} keeps the run contract`, () => {
    frozen("finds the pod behind a run, and nothing for an unknown id", async () => {
      const store = await make();
      const a = await scope(store);
      const run = await store.createRun(a.pod, newRun(a.account, null));
      expect(await store.findRunPod(run.id)).toBe(a.pod);
      expect(await store.findRunPod(runId())).toBeUndefined();
    });

    frozen("writes a conversation and a run once, a run starting queued at attempt 1", async () => {
      const store = await make();
      const a = await scope(store);
      const conversation = await store.createConversation(a.pod, {
        id: conversationId(),
        created_by: a.account,
        title: "Equal groups",
      });
      expect(conversation).toMatchObject({
        pod_id: a.pod,
        created_by: a.account,
        title: "Equal groups",
      });
      const again = await store.createConversation(a.pod, {
        id: conversation.id,
        created_by: a.account,
        title: "Another title",
      });
      expect(again).toEqual(conversation);

      const given = newRun(a.account, conversation.id);
      const run = await store.createRun(a.pod, given);
      expect(run).toMatchObject({
        ...given,
        pod_id: a.pod,
        status: "queued",
        attempt: 1,
        cancel_requested_at: null,
        spent_usd: 0,
        completed_at: null,
      });
      expect(await store.createRun(a.pod, { ...given, cap_usd: 9 })).toEqual(run);
      expect(await store.getRun(a.pod, run.id)).toEqual(run);
    });

    frozen("lists a conversation's runs oldest first", async () => {
      const store = await make();
      const a = await scope(store);
      const conversation = await store.createConversation(a.pod, {
        id: conversationId(),
        created_by: a.account,
        title: null,
      });
      expect(await store.listRuns(a.pod, conversation.id)).toEqual([]);
      const first = await store.createRun(a.pod, newRun(a.account, conversation.id));
      const second = await store.createRun(a.pod, newRun(a.account, conversation.id));
      await store.createRun(a.pod, newRun(a.account, null));
      expect((await store.listRuns(a.pod, conversation.id)).map((r) => r.id)).toEqual([
        first.id,
        second.id,
      ]);
      const b = await scope(store);
      await expect(store.listRuns(b.pod, conversation.id)).rejects.toMatchObject(NOT_FOUND);
    });

    frozen(
      "finds the runs whose idle or max deadline has come, in every pod, and no ended run",
      async () => {
        const store = await make();
        const a = await scope(store);
        const b = await scope(store);
        const idle = await store.createRun(a.pod, {
          ...newRun(a.account, null),
          idle_deadline_at: "2026-09-01T08:10:00.000Z",
          max_deadline_at: "2026-09-01T08:30:00.000Z",
        });
        const max = await store.createRun(b.pod, {
          ...newRun(b.account, null),
          idle_deadline_at: null,
          max_deadline_at: "2026-09-01T08:10:00.000Z",
        });
        const later = await store.createRun(a.pod, {
          ...newRun(a.account, null),
          idle_deadline_at: "2026-09-01T08:20:00.000Z",
          max_deadline_at: "2026-09-01T08:30:00.000Z",
        });
        const ended = await store.createRun(a.pod, {
          ...newRun(a.account, null),
          idle_deadline_at: "2026-09-01T08:00:00.000Z",
          max_deadline_at: "2026-09-01T08:05:00.000Z",
        });
        await store.updateRun(a.pod, ended.id, 1, { status: "completed" });

        const due = await store.listRunsDue("2026-09-01T08:10:00.000Z");
        const mine = due.filter((d) => [idle.id, max.id, later.id, ended.id].includes(d.run.id));
        expect(mine.map((d) => [d.pod, d.run.id]).sort()).toEqual(
          [
            [a.pod, idle.id],
            [b.pod, max.id],
          ].sort(),
        );
      },
    );

    frozen("reads a run in another pod as NotFound, and writes nothing there", async () => {
      const store = await make();
      const a = await scope(store);
      const b = await scope(store);
      const run = await store.createRun(a.pod, newRun(a.account, null));
      await store.appendRunEvents(a.pod, run.id, 1, [message(run.id, "Halves, grade 2.")]);

      await expect(store.getRun(b.pod, run.id)).rejects.toMatchObject(NOT_FOUND);
      await expect(store.updateRun(b.pod, run.id, 1, { status: "failed" })).rejects.toMatchObject(
        NOT_FOUND,
      );
      await expect(
        store.appendRunEvents(b.pod, run.id, 1, [message(run.id, "Hello")]),
      ).rejects.toMatchObject(NOT_FOUND);
      await expect(store.listRunEvents(b.pod, run.id, 0)).rejects.toMatchObject(NOT_FOUND);
      await expect(store.putRunInbox(b.pod, inbox(run.id, "Hello"))).rejects.toMatchObject(
        NOT_FOUND,
      );
      await expect(store.takeRunInbox(b.pod, run.id)).rejects.toMatchObject(NOT_FOUND);
      // A conversation in pod a can't hold a run in pod b.
      const conversation = await store.createConversation(a.pod, {
        id: conversationId(),
        created_by: a.account,
        title: null,
      });
      await expect(
        store.createRun(b.pod, newRun(b.account, conversation.id)),
      ).rejects.toMatchObject(NOT_FOUND);

      expect((await store.getRun(a.pod, run.id)).status).toBe("queued");
      expect(await store.listRunEvents(a.pod, run.id, 0)).toHaveLength(1);
    });

    frozen(
      "updates a run only while its attempt matches, and says stale when it doesn't",
      async () => {
        const store = await make();
        const a = await scope(store);
        const run = await store.createRun(a.pod, newRun(a.account, null));

        const claimed = await store.updateRun(a.pod, run.id, 1, {
          attempt: 2,
          status: "in_progress",
        });
        expect(claimed.stale).toBe(false);
        expect(claimed.value).toMatchObject({ attempt: 2, status: "in_progress" });

        const late = await store.updateRun(a.pod, run.id, 1, { status: "completed", spent_usd: 5 });
        expect(late.stale).toBe(true);
        expect(late.value).toEqual(claimed.value);
        expect(await store.getRun(a.pod, run.id)).toEqual(claimed.value);
      },
    );

    frozen("numbers events from 1 with no gap, and lists them after a cursor", async () => {
      const store = await make();
      const a = await scope(store);
      const run = await store.createRun(a.pod, newRun(a.account, null));
      const first = await store.appendRunEvents(a.pod, run.id, 1, [
        message(run.id, "Halves, grade 2."),
        status(run.id, "in_progress"),
      ]);
      const second = await store.appendRunEvents(a.pod, run.id, 1, [status(run.id, "completed")]);
      expect(first.stale).toBe(false);
      expect(first.value.map((e) => e.seq)).toEqual([1, 2]);
      expect(second.value.map((e) => e.seq)).toEqual([3]);

      const all = await store.listRunEvents(a.pod, run.id, 0);
      expect(all.map((e) => e.seq)).toEqual([1, 2, 3]);
      expect(all[0]).toMatchObject({ run_id: run.id, type: "message" });
      expect((await store.listRunEvents(a.pod, run.id, 2)).map((e) => e.seq)).toEqual([3]);
      expect(await store.listRunEvents(a.pod, run.id, 3)).toEqual([]);
    });

    frozen(
      "stores an event_id once: a replayed write is a no-op that answers the stored row",
      async () => {
        const store = await make();
        const a = await scope(store);
        const run = await store.createRun(a.pod, newRun(a.account, null));
        const hello = message(run.id, "Halves, grade 2.");
        const [stored] = (await store.appendRunEvents(a.pod, run.id, 1, [hello])).value;

        const replay = await store.appendRunEvents(a.pod, run.id, 1, [
          { ...message(run.id, "Something else"), event_id: hello.event_id },
          status(run.id, "in_progress"),
        ]);
        expect(replay.value[0]).toEqual(stored);
        expect(replay.value[1]?.seq).toBe(2);
        expect((await store.listRunEvents(a.pod, run.id, 0)).map((e) => e.event_id)).toEqual([
          hello.event_id,
          replay.value[1]?.event_id,
        ]);
      },
    );

    frozen("appends nothing for a stale attempt", async () => {
      const store = await make();
      const a = await scope(store);
      const run = await store.createRun(a.pod, newRun(a.account, null));
      await store.updateRun(a.pod, run.id, 1, { attempt: 2 });

      const late = await store.appendRunEvents(a.pod, run.id, 1, [message(run.id, "late")]);
      expect(late).toEqual({ stale: true, value: [] });
      expect(await store.listRunEvents(a.pod, run.id, 0)).toEqual([]);
    });

    frozen("refuses an event for another run with BadRequest", async () => {
      const store = await make();
      const a = await scope(store);
      const run = await store.createRun(a.pod, newRun(a.account, null));
      const other = await store.createRun(a.pod, newRun(a.account, null));
      await expect(
        store.appendRunEvents(a.pod, run.id, 1, [message(other.id, "Wrong run")]),
      ).rejects.toMatchObject({ type: "BadRequest" });
      expect(await store.listRunEvents(a.pod, run.id, 0)).toEqual([]);
    });

    frozen(
      "keeps an inbox row once by event_id, and hands each pending row over once, oldest first",
      async () => {
        const store = await make();
        const a = await scope(store);
        const run = await store.createRun(a.pod, newRun(a.account, null));
        const first = inbox(run.id, "Make it 5 questions.");
        const stored = await store.putRunInbox(a.pod, first);
        expect(RunInbox.parse(stored)).toMatchObject({
          ...first,
          pod_id: a.pod,
          status: "pending",
        });
        expect(await store.putRunInbox(a.pod, { ...first, payload: { text: "Changed" } })).toEqual(
          stored,
        );
        const second = await store.putRunInbox(a.pod, inbox(run.id, "And add a picture."));

        const taken = await store.takeRunInbox(a.pod, run.id);
        expect(taken.map((r) => r.event_id)).toEqual([stored.event_id, second.event_id]);
        expect(taken.every((r) => r.status === "delivered")).toBe(true);
        expect(await store.takeRunInbox(a.pod, run.id)).toEqual([]);

        const third = await store.putRunInbox(a.pod, inbox(run.id, "Thanks."));
        expect((await store.takeRunInbox(a.pod, run.id)).map((r) => r.event_id)).toEqual([
          third.event_id,
        ]);
      },
    );

    frozen(
      "refuses an inbox event_id another run of its pod holds, and keeps each pod's ids its own (dl-z5ja.36, dl-z5ja.86)",
      async () => {
        const store = await make();
        const a = await scope(store);
        const b = await scope(store);
        const run = await store.createRun(a.pod, newRun(a.account, null));
        const other = await store.createRun(a.pod, newRun(a.account, null));
        const elsewhere = await store.createRun(b.pod, newRun(b.account, null));
        const first = inbox(run.id, "Make it 5 questions.");
        const stored = await store.putRunInbox(a.pod, first);

        await expect(
          store.putRunInbox(a.pod, { ...first, run_id: other.id }),
        ).rejects.toMatchObject(WRITE_ONCE);
        // The same id in another pod is that pod's own row: nothing says the id exists in pod a.
        const theirs = await store.putRunInbox(b.pod, {
          ...first,
          run_id: elsewhere.id,
          payload: { text: "Adding within 20." },
        });
        expect([theirs.pod_id, theirs.run_id, theirs.payload]).toEqual([
          b.pod,
          elsewhere.id,
          { text: "Adding within 20." },
        ]);
        expect(await store.takeRunInbox(a.pod, other.id)).toEqual([]);
        expect((await store.takeRunInbox(b.pod, elsewhere.id)).map((r) => r.event_id)).toEqual([
          first.event_id,
        ]);
        expect((await store.takeRunInbox(a.pod, run.id)).map((r) => r.event_id)).toEqual([
          stored.event_id,
        ]);
      },
    );

    frozen(
      "counts a parent's messages and steers since a minute and sums the pod's caps since a day (dl-z5ja.72, dl-z5ja.97)",
      async () => {
        const store = await make();
        const a = await scope(store);
        const b = await scope(store);
        const before = new Date(Date.now() - 60_000).toISOString();
        const later = new Date(Date.now() + 60_000).toISOString();
        const mine = await store.createRun(a.pod, { ...newRun(a.account, null), cap_usd: 1 });
        const theirs = await store.createRun(a.pod, { ...newRun(b.account, null), cap_usd: 2 });
        const elsewhere = await store.createRun(b.pod, { ...newRun(b.account, null), cap_usd: 4 });
        await store.putRunInbox(a.pod, inbox(mine.id, "Shapes for grade 1."));
        await store.putRunInbox(a.pod, inbox(mine.id, "Make it 5 questions."));
        await store.putRunInbox(a.pod, {
          run_id: mine.id,
          event_id: eventId(),
          kind: "steer",
          payload: { text: "Easier, please." },
        });
        await store.putRunInbox(a.pod, {
          run_id: mine.id,
          event_id: eventId(),
          kind: "cancel",
          payload: {},
        });
        await store.putRunInbox(a.pod, inbox(theirs.id, "Telling the time."));
        await store.putRunInbox(b.pod, inbox(elsewhere.id, "Adding within 20."));

        const since = { minuteSince: before, daySince: before };
        // a's run: 2 messages and 1 steer count, the cancel does not (dl-z5ja.97).
        expect(await store.messageUsage(a.pod, a.account, since)).toEqual({
          messages: 3,
          cap_usd: 3,
        });
        expect(await store.messageUsage(a.pod, b.account, since)).toEqual({
          messages: 1,
          cap_usd: 3,
        });
        expect(await store.messageUsage(b.pod, a.account, since)).toEqual({
          messages: 0,
          cap_usd: 4,
        });
        expect(
          await store.messageUsage(a.pod, a.account, { minuteSince: later, daySince: later }),
        ).toEqual({ messages: 0, cap_usd: 0 });
        await expect(
          store.messageUsage(
            PodId.parse(idOf(ID_PREFIXES.pod, crypto.randomUUID())),
            a.account,
            since,
          ),
        ).rejects.toMatchObject(NOT_FOUND);
      },
    );

    frozen("lands one conversation when 3 writes of one id race (dl-z5ja.99)", async () => {
      const store = await make();
      const a = await scope(store);
      const id = conversationId();
      const racers = await Promise.all(
        [1, 2, 3].map(() =>
          store.createConversation(a.pod, { id, created_by: a.account, title: "Equal groups" }),
        ),
      );
      expect(racers[1]).toEqual(racers[0]);
      expect(racers[2]).toEqual(racers[0]);
      expect(await store.listRuns(a.pod, id)).toEqual([]);
    });

    // dl-z5ja.104, decision dl-84wo: a parent's delete archives; nothing is deleted.
    frozen(
      "lists a pod's live conversations newest first, the archived left out unless asked for",
      async () => {
        const store = await make();
        const a = await scope(store);
        const b = await scope(store);
        const made: Conversation[] = [];
        for (const title of ["First", "Second", "Third"])
          made.push(
            await store.createConversation(a.pod, {
              id: conversationId(),
              created_by: a.account,
              title,
            }),
          );
        await store.createConversation(b.pod, {
          id: conversationId(),
          created_by: b.account,
          title: "Another family's",
        });
        expect(made.every((c) => c.archived_at === null)).toBe(true);

        const live = await store.listConversations(a.pod);
        expect(new Set(live.map((c) => c.id))).toEqual(new Set(made.map((c) => c.id)));
        const times = live.map((c) => c.created_at);
        expect(times).toEqual([...times].sort().reverse());

        const second = made[1] as Conversation;
        const at = "2026-09-01T08:00:00.000Z";
        const archived = await store.archiveConversation(a.pod, second.id, at);
        expect(archived).toEqual({ ...second, archived_at: at });
        expect((await store.listConversations(a.pod)).map((c) => c.id)).not.toContain(second.id);
        const all = await store.listConversations(a.pod, { includeArchived: true });
        expect(all.map((c) => c.id)).toContain(second.id);
        expect(await store.getConversation(a.pod, second.id)).toEqual(archived);
        // Kept for the pod: its runs still read.
        expect(await store.listRuns(a.pod, second.id)).toEqual([]);
        expect((await store.listConversations(b.pod)).map((c) => c.title)).toEqual([
          "Another family's",
        ]);
      },
    );

    frozen("archives once: a 2nd archive keeps the first time", async () => {
      const store = await make();
      const a = await scope(store);
      const conversation = await store.createConversation(a.pod, {
        id: conversationId(),
        created_by: a.account,
        title: null,
      });
      const first = await store.archiveConversation(a.pod, conversation.id, "2026-09-01T08:00:00Z");
      const again = await store.archiveConversation(a.pod, conversation.id, "2026-09-02T08:00:00Z");
      expect(again).toEqual(first);
      expect(again.archived_at).toBe("2026-09-01T08:00:00.000Z");
    });

    frozen(
      "reads and archives another pod's conversation as NotFound, changing nothing",
      async () => {
        const store = await make();
        const a = await scope(store);
        const b = await scope(store);
        const conversation = await store.createConversation(a.pod, {
          id: conversationId(),
          created_by: a.account,
          title: null,
        });
        const at = "2026-09-01T08:00:00.000Z";
        await expect(store.getConversation(b.pod, conversation.id)).rejects.toMatchObject(
          NOT_FOUND,
        );
        await expect(store.archiveConversation(b.pod, conversation.id, at)).rejects.toMatchObject(
          NOT_FOUND,
        );
        await expect(store.archiveConversation(a.pod, conversationId(), at)).rejects.toMatchObject(
          NOT_FOUND,
        );
        expect((await store.getConversation(a.pod, conversation.id)).archived_at).toBeNull();
      },
    );

    // dl-z5ja.110, wave 4 lead decision 37: a rating in its own table, one per run and account.
    frozen(
      "rates a run once per account: a re-rate replaces the verdict and the note",
      async () => {
        const store = await make();
        const a = await scope(store);
        const run = await store.createRun(a.pod, newRun(a.account, null));
        expect(await store.listRunRatings(a.pod, run.id)).toEqual([]);

        const bad = await store.rateRun(a.pod, run.id, a.account, {
          verdict: "bad",
          note: "Too many questions.",
        });
        expect(bad).toMatchObject({
          pod_id: a.pod,
          run_id: run.id,
          account_id: a.account,
          verdict: "bad",
          note: "Too many questions.",
        });
        expect(bad.id).toMatch(/^rtg_/);

        const good = await store.rateRun(a.pod, run.id, a.account, { verdict: "good", note: null });
        expect(good).toEqual({ ...bad, verdict: "good", note: null });
        expect(await store.listRunRatings(a.pod, run.id)).toEqual([good]);
      },
    );

    frozen(
      "refuses a note with good as BadRequest, and another pod's run as NotFound",
      async () => {
        const store = await make();
        const a = await scope(store);
        const b = await scope(store);
        const run = await store.createRun(a.pod, newRun(a.account, null));
        await expect(
          store.rateRun(a.pod, run.id, a.account, { verdict: "good", note: "Nice." }),
        ).rejects.toMatchObject({ type: "BadRequest" });
        await expect(
          store.rateRun(b.pod, run.id, b.account, { verdict: "good", note: null }),
        ).rejects.toMatchObject(NOT_FOUND);
        await expect(store.listRunRatings(b.pod, run.id)).rejects.toMatchObject(NOT_FOUND);
        expect(await store.listRunRatings(a.pod, run.id)).toEqual([]);
      },
    );
  });
}

const NOT_FOUND = { type: "NotFound" };
const WRITE_ONCE = { type: "WriteOnce" };

/** A fresh signed-in account: its own pod, so no test sees another's rows. */
async function scope(store: Store) {
  const member = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  return { pod: member.pod, account: member.account };
}

function runId(): RunId {
  return RunId.parse(idOf(ID_PREFIXES.run, crypto.randomUUID()));
}

function conversationId(): ConversationId {
  return ConversationId.parse(idOf(ID_PREFIXES.conversation, crypto.randomUUID()));
}

function newRun(account: NewRun["created_by"], conversation: NewRun["conversation_id"]): NewRun {
  return {
    id: runId(),
    created_by: account,
    conversation_id: conversation,
    workflow: "jadwigo-lesson-compose",
    resumes: null,
    cap_usd: 1,
    idle_deadline_at: "2026-09-01T08:10:00.000Z",
    max_deadline_at: "2026-09-01T09:00:00.000Z",
  };
}

const eventId = () => EventId.parse(crypto.randomUUID());

function message(run: RunId, text: string): NewRunEvent {
  return { run_id: run, event_id: eventId(), type: "message", payload: { from: "parent", text } };
}

function status(run: RunId, value: "in_progress" | "completed"): NewRunEvent {
  return { run_id: run, event_id: eventId(), type: "status", payload: { status: value } };
}

function inbox(run: RunId, text: string) {
  return { run_id: run, event_id: eventId(), kind: "message" as const, payload: { text } };
}
