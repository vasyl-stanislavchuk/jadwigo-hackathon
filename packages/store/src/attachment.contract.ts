import { AttachmentId, EventId, ID_PREFIXES, idOf, type PodId, Uuid } from "@jadwigo/contracts";
import { ConversationId } from "@jadwigo/contracts/run";
import { describe, expect, it } from "vitest";
import type { NewAttachment } from "./attachment.ts";
import type { Store } from "./store.ts";

/**
 * A parent's photos, as every `Store` keeps them (dl-e8ov.2.22; wave 5 decision 43): pending, then
 * attached once to a message of the pod's own conversation, all of a message's photos or none.
 * Wired into `store.test.ts` for `InMemoryStore` and `postgres.run.int.test.ts` for
 * `PostgresStore`. Each test signs in its own fresh accounts, so it never assumes an empty database.
 */
export function attachmentContract(name: string, make: () => Promise<Store> | Store): void {
  describe(`${name} keeps a parent's photos`, () => {
    it("creates a pending photo once by id, and reads it back", async () => {
      const store = await make();
      const a = await scope(store);
      const given = photo(a.account);
      const created = await store.createAttachment(a.pod, given);
      expect(created).toEqual({
        ...given,
        pod_id: a.pod,
        state: "pending",
        conversation_id: null,
        storage_path: null,
        created_at: expect.any(String),
        attached_at: null,
      });
      expect(created.id).toMatch(/^atch_/);
      expect(await store.createAttachment(a.pod, { ...given, bytes: 9 })).toEqual(created);
      expect(await store.getAttachment(a.pod, created.id)).toEqual(created);
    });

    it("hides a photo from another pod, and refuses another pod's account and id", async () => {
      const store = await make();
      const a = await scope(store);
      const b = await scope(store);
      const created = await store.createAttachment(a.pod, photo(a.account));
      await expect(store.getAttachment(b.pod, created.id)).rejects.toMatchObject(NOT_FOUND);
      await expect(store.createAttachment(b.pod, photo(a.account))).rejects.toMatchObject(
        NOT_FOUND,
      );
      await expect(
        store.createAttachment(b.pod, { ...photo(b.account), id: created.id }),
      ).rejects.toMatchObject({ type: "WriteOnce" });
      expect(await store.getAttachment(a.pod, created.id)).toEqual(created);
    });

    it("counts the pod's photos created since a time, and no other pod's", async () => {
      const store = await make();
      const a = await scope(store);
      const b = await scope(store);
      const before = new Date(Date.now() - 60_000).toISOString();
      await store.createAttachment(a.pod, photo(a.account));
      await store.createAttachment(a.pod, photo(a.account));
      await store.createAttachment(b.pod, photo(b.account));
      expect(await store.countAttachments(a.pod, before)).toBe(2);
      expect(await store.countAttachments(b.pod, before)).toBe(1);
      const later = new Date(Date.now() + 60_000).toISOString();
      expect(await store.countAttachments(a.pod, later)).toBe(0);
    });

    it("attaches a message's photos in order, once", async () => {
      const store = await make();
      const a = await scope(store);
      const conversation = await chat(store, a);
      const first = await store.createAttachment(a.pod, photo(a.account));
      const second = await store.createAttachment(a.pod, photo(a.account));
      const at = new Date().toISOString();
      const photos = [second, first].map((p) => ({ id: p.id, storage_path: path(a.pod, p.id) }));

      const attached = await store.attachToMessage(a.pod, conversation, photos, at);
      expect(attached).toEqual(
        [second, first].map((p) => ({
          ...p,
          state: "attached",
          conversation_id: conversation,
          storage_path: path(a.pod, p.id),
          expires_at: null,
          attached_at: at,
        })),
      );
      expect(await store.getAttachment(a.pod, first.id)).toEqual(attached[1]);

      await expect(
        store.attachToMessage(a.pod, conversation, photos.slice(0, 1), at),
      ).rejects.toMatchObject({ type: "AttachmentAttached" });
      expect(await store.getAttachment(a.pod, second.id)).toEqual(attached[0]);
    });

    it("attaches none when one photo is expired, another pod's, or the conversation is", async () => {
      const store = await make();
      const a = await scope(store);
      const b = await scope(store);
      const conversation = await chat(store, a);
      const theirs = await chat(store, b);
      const fresh = await store.createAttachment(a.pod, photo(a.account));
      const stale = await store.createAttachment(a.pod, {
        ...photo(a.account),
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      });
      const foreign = await store.createAttachment(b.pod, photo(b.account));
      const at = new Date().toISOString();
      const ref = (p: { id: AttachmentId }, pod: PodId) => ({
        id: p.id,
        storage_path: path(pod, p.id),
      });

      await expect(
        store.attachToMessage(a.pod, conversation, [ref(fresh, a.pod), ref(stale, a.pod)], at),
      ).rejects.toMatchObject({ type: "AttachmentExpired" });
      await expect(
        store.attachToMessage(a.pod, conversation, [ref(fresh, a.pod), ref(foreign, a.pod)], at),
      ).rejects.toMatchObject(NOT_FOUND);
      await expect(
        store.attachToMessage(a.pod, theirs, [ref(fresh, a.pod)], at),
      ).rejects.toMatchObject(NOT_FOUND);
      expect(await store.getAttachment(a.pod, fresh.id)).toEqual(fresh);
      expect(await store.getAttachment(b.pod, foreign.id)).toEqual(foreign);
    });

    it("refuses an empty list and a photo named twice as BadRequest", async () => {
      const store = await make();
      const a = await scope(store);
      const conversation = await chat(store, a);
      const one = await store.createAttachment(a.pod, photo(a.account));
      const at = new Date().toISOString();
      await expect(store.attachToMessage(a.pod, conversation, [], at)).rejects.toMatchObject({
        type: "BadRequest",
      });
      const twice = [one, one].map((p) => ({ id: p.id, storage_path: path(a.pod, p.id) }));
      await expect(store.attachToMessage(a.pod, conversation, twice, at)).rejects.toMatchObject({
        type: "BadRequest",
      });
      expect(await store.getAttachment(a.pod, one.id)).toEqual(one);
    });
  });
}

const NOT_FOUND = { type: "NotFound" };

/** A fresh signed-in account: its own pod, so no test sees another's rows. */
async function scope(store: Store) {
  const member = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  return { pod: member.pod, account: member.account };
}

async function chat(store: Store, member: Awaited<ReturnType<typeof scope>>) {
  const conversation = await store.createConversation(member.pod, {
    id: ConversationId.parse(idOf(ID_PREFIXES.conversation, crypto.randomUUID())),
    created_by: member.account,
    title: null,
  });
  return conversation.id;
}

/** A synthetic photo's declaration: no bytes, no learner, nothing real. */
function photo(account: NewAttachment["account_id"]): NewAttachment {
  return {
    id: AttachmentId.parse(idOf(ID_PREFIXES.attachment, crypto.randomUUID())),
    account_id: account,
    event_id: EventId.parse(crypto.randomUUID()),
    media_type: "image/jpeg",
    bytes: 482_113,
    width: 1500,
    height: 2000,
    name: null,
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function path(pod: PodId, id: AttachmentId): string {
  return `pods/${pod}/attachments/${id}.jpg`;
}
