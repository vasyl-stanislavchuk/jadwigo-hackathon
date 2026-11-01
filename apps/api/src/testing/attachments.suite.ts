// A message's photos (dl-z5ja.11.3): run on InMemoryStore by src/attachments.test.ts and on
// PostgresStore with pgmq by src/attachments.int.test.ts, against MemoryUploads, never AWS. Every
// photo is synthetic bytes built in code: markers only, no picture and no person.
import { randomUUID } from "node:crypto";
import {
  type AccountId,
  AttachmentId,
  type AttachmentRead,
  type AttachmentUpload,
  type Conversation,
  type ConversationId,
  type ErrorEnvelope,
  EventId,
  ID_PREFIXES,
  idOf,
  LIMITS,
  type Me,
  type PodId,
  type RunAccepted,
} from "@jadwigo/contracts";
import type { Store } from "@jadwigo/store";
import { beforeEach, describe, expect, it } from "vitest";
import { pendingKey, previewKey, storedKey } from "../attachments.ts";
import { pathOf, type Seeded, seeded } from "./client.ts";
import type { Queued } from "./conversations.suite.ts";
import { bearerOf, signToken } from "./token.ts";
import {
  DOCX_NAMES,
  MemoryUploads,
  syntheticHeic,
  syntheticJpeg,
  syntheticPdf,
  syntheticPng,
  syntheticZip,
} from "./uploads.ts";

const event = () => EventId.parse(randomUUID());
const BYTES = 4096;
const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const HEIC = "image/heic";

export function attachmentSuite(
  name: string,
  makeStore: () => Store,
  makeQueue: () => Queued,
): void {
  describe(`a message's photos on ${name}`, () => {
    let s: Seeded;
    let uploads: MemoryUploads;
    beforeEach(() => {
      uploads = new MemoryUploads();
      s = seeded(makeStore(), { queue: makeQueue().queue, uploads });
    });

    /** A signed-in parent whose pod gave its consent, with one conversation. */
    async function parent() {
      const headers = bearerOf(signToken({ sub: randomUUID() }));
      const call = <T>(method: string, path: string, body?: unknown) =>
        s.call<T>(method, path, body, headers);
      const me = await call<Me>("POST", pathOf("createAccount", {}), { language: "pl" });
      expect(me.status).toBe(201);
      const pod = me.body.pod?.id as PodId;
      const account = me.body.account?.id as AccountId;
      await call("PATCH", pathOf("patchPod", { id: pod }), { ai_consented: true });
      const conversation = (
        await call<Conversation>("POST", pathOf("createConversation", {}), { event_id: event() })
      ).body.id;
      return {
        call,
        pod,
        account,
        conversation,
        /** A pending photo of `bytes` bytes, and its form. */
        create(bytes = BYTES, event_id = event()) {
          return call<AttachmentUpload>("POST", pathOf("createAttachment", {}), {
            event_id,
            media_type: "image/jpeg",
            bytes,
            width: 1500,
            height: 2000,
          });
        },
        /** A pending photo with `body` uploaded to its form, as the browser posts it. */
        async upload(body: Uint8Array = syntheticJpeg(BYTES), declared = body.length) {
          const created = await this.create(declared);
          expect(created.status).toBe(201);
          uploads.put(pendingKey(pod, created.body.attachment.id), body);
          return created.body.attachment.id;
        },
        /** A HEIC, a PDF or a DOCX as it is, with `body` uploaded to its form. */
        async uploadFile(media_type: string, body: Uint8Array, declared = body.length) {
          const created = await call<AttachmentUpload>("POST", pathOf("createAttachment", {}), {
            event_id: event(),
            media_type,
            bytes: declared,
            name: "zeszyt",
          });
          expect(created.status).toBe(201);
          uploads.put(pendingKey(pod, created.body.attachment.id), body, media_type);
          return created.body.attachment.id;
        },
        send(ids: readonly string[], text = "", event_id = event(), to = conversation) {
          return call<RunAccepted & ErrorEnvelope>("POST", pathOf("postMessage", { id: to }), {
            event_id,
            text,
            attachment_ids: ids,
          });
        },
      };
    }
    type Parent = Awaited<ReturnType<typeof parent>>;

    /** Nothing of the message was kept: no run, the photos pending, no stored copy left. */
    async function keptNothing(a: Parent, ids: readonly AttachmentId[]) {
      expect(await s.store.listRuns(a.pod, a.conversation as ConversationId)).toHaveLength(0);
      for (const id of ids) {
        expect((await s.store.getAttachment(a.pod, id)).state).toBe("pending");
        const prefix = `pods/${a.pod}/attachments/${id}`;
        expect([...uploads.objects.keys()].filter((k) => k.startsWith(prefix))).toEqual([]);
      }
    }

    it("creates a pending photo and a form bound to its key, its type and its exact size", async () => {
      const a = await parent();
      const created = await a.create();
      expect(created.status).toBe(201);
      const { attachment, upload } = created.body;
      expect(attachment).toMatchObject({
        pod_id: a.pod,
        account_id: a.account,
        state: "pending",
        media_type: "image/jpeg",
        bytes: BYTES,
        storage_path: null,
      });
      expect(attachment.id).toMatch(/^atch_/);
      expect(uploads.forms).toEqual([
        { key: pendingKey(a.pod, attachment.id), contentType: "image/jpeg", bytes: BYTES },
      ]);
      expect(upload.url).toBe("https://uploads.test/");
      expect(Date.parse(upload.expires_at)).toBeGreaterThan(Date.now());
    });

    it("answers a resent create with the same photo and a fresh form, and another body with 409", async () => {
      const a = await parent();
      const id = event();
      const first = await a.create(BYTES, id);
      const again = await a.create(BYTES, id);
      expect(again.status).toBe(201);
      expect(again.body.attachment).toEqual(first.body.attachment);
      expect(uploads.forms).toHaveLength(2);
      const other = await a.create(BYTES + 1, id);
      expect(other.status).toBe(409);
      expect((other.body as unknown as ErrorEnvelope).error.type).toBe("EventIdMismatch");
    });

    it("sends a photo-only message whose inbox row carries the stored copy, readable by its link", async () => {
      const a = await parent();
      const id = await a.upload();
      const event_id = event();
      const sent = await a.send([id], "", event_id);
      expect(sent.status).toBe(201);

      const inbox = await s.store.findRunInbox(a.pod, event_id);
      expect(inbox?.kind === "message" && inbox.payload).toEqual({
        text: "",
        attachments: [
          {
            attachment_id: id,
            storage_path: storedKey(a.pod, id),
            media_type: "image/jpeg",
            bytes: BYTES,
            width: 1500,
            height: 2000,
          },
        ],
      });
      const row = await s.store.getAttachment(a.pod, id);
      expect(row).toMatchObject({
        state: "attached",
        conversation_id: a.conversation,
        storage_path: storedKey(a.pod, id),
        expires_at: null,
      });
      expect(uploads.objects.get(storedKey(a.pod, id))?.contentType).toBe("image/jpeg");
      expect(uploads.objects.has(pendingKey(a.pod, id))).toBe(false);

      const read = await a.call<AttachmentRead>("GET", pathOf("getAttachment", { id }));
      expect(read.status).toBe(200);
      expect(read.body.attachment).toEqual(row);
      expect(read.body.url).toBe(`https://uploads.test/${storedKey(a.pod, id)}?expires-in=300`);
    });

    it("keeps a message's photos in the order sent, with its words", async () => {
      const a = await parent();
      const first = await a.upload();
      const second = await a.upload();
      const event_id = event();
      expect((await a.send([second, first], "Zadanie 3", event_id)).status).toBe(201);
      const inbox = await s.store.findRunInbox(a.pod, event_id);
      expect(
        inbox?.kind === "message" && inbox.payload.attachments?.map((p) => p.attachment_id),
      ).toEqual([second, first]);
      expect(inbox?.kind === "message" && inbox.payload.text).toBe("Zadanie 3");
    });

    it("answers a resend with its run and copies nothing again; other photos on the same id are 409", async () => {
      const a = await parent();
      const id = await a.upload();
      const other = await a.upload();
      const event_id = event();
      const sent = await a.send([id], "", event_id);
      expect(uploads.copies).toHaveLength(1);
      const again = await a.send([id], "", event_id);
      expect(again.status).toBe(201);
      expect(again.body.run.id).toBe(sent.body.run.id);
      expect(uploads.copies).toHaveLength(1);

      const swapped = await a.send([other], "", event_id);
      expect(swapped.status).toBe(409);
      expect(swapped.body.error.type).toBe("EventIdMismatch");
      expect((await s.store.getAttachment(a.pod, other)).state).toBe("pending");
    });

    it.each([
      ["a file larger than declared", () => syntheticJpeg(BYTES + 1), BYTES],
      ["a PNG declared as a JPEG", () => syntheticPng(BYTES), BYTES],
      ["a JPEG with Exif data", () => syntheticJpeg(BYTES, { exif: true }), BYTES],
    ])("refuses %s as 409 AttachmentMismatch, keeping nothing", async (_what, body, declared) => {
      const a = await parent();
      const good = await a.upload();
      const bad = await a.upload(body(), declared);
      const sent = await a.send([good, bad], "Zadanie 3");
      expect(sent.status).toBe(409);
      expect(sent.body.error.type).toBe("AttachmentMismatch");
      await keptNothing(a, [good, bad]);
      expect(uploads.objects.has(pendingKey(a.pod, good))).toBe(true);
    });

    it("refuses a photo never uploaded as 409 AttachmentMismatch", async () => {
      const a = await parent();
      const created = await a.create();
      const sent = await a.send([created.body.attachment.id]);
      expect(sent.status).toBe(409);
      expect(sent.body.error.type).toBe("AttachmentMismatch");
      await keptNothing(a, [created.body.attachment.id]);
    });

    it("refuses another pod's photo as 409 AttachmentMismatch, and never shows it", async () => {
      const a = await parent();
      const b = await parent();
      const theirs = await b.upload();
      const sent = await a.send([theirs]);
      expect(sent.status).toBe(409);
      expect(sent.body.error.type).toBe("AttachmentMismatch");
      await keptNothing(a, []);
      await keptNothing(b, [theirs]);
      expect((await a.call("GET", pathOf("getAttachment", { id: theirs }))).status).toBe(404);
    });

    it("refuses a photo another message carries as 409 AttachmentAttached", async () => {
      const a = await parent();
      const id = await a.upload();
      expect((await a.send([id])).status).toBe(201);
      const runs = await s.store.listRuns(a.pod, a.conversation as ConversationId);
      const before = await s.store.getAttachment(a.pod, id);
      const again = await a.send([id], "once more");
      expect(again.status).toBe(409);
      expect(again.body.error.type).toBe("AttachmentAttached");
      expect(await s.store.listRuns(a.pod, a.conversation as ConversationId)).toEqual(runs);
      expect(await s.store.getAttachment(a.pod, id)).toEqual(before);
      expect(uploads.copies).toHaveLength(1);
      const create = await a.create(BYTES, before.event_id);
      expect(create.status).toBe(409);
    });

    it("refuses a photo past its expires_at as 409 AttachmentExpired", async () => {
      const a = await parent();
      const id = AttachmentId.parse(idOf(ID_PREFIXES.attachment, randomUUID()));
      await s.store.createAttachment(a.pod, {
        id,
        account_id: a.account,
        event_id: event(),
        media_type: "image/jpeg",
        bytes: BYTES,
        width: 10,
        height: 10,
        name: null,
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      });
      uploads.put(pendingKey(a.pod, id), syntheticJpeg(BYTES));
      const sent = await a.send([id]);
      expect(sent.status).toBe(409);
      expect(sent.body.error.type).toBe("AttachmentExpired");
      await keptNothing(a, [id]);
    });

    it("deletes the copies when the message is refused after they were made", async () => {
      const a = await parent();
      for (let i = 0; i < LIMITS.messagesPerMinute; i++)
        expect(
          (
            await a.call("POST", pathOf("postMessage", { id: a.conversation }), {
              event_id: event(),
              text: `${i}`,
            })
          ).status,
        ).toBe(201);
      const id = await a.upload();
      const sent = await a.send([id], "one too many");
      expect(sent.status).toBe(429);
      expect(sent.body.error.type).toBe("MessageLimitMinute");
      expect(uploads.copies).toHaveLength(1);
      expect(uploads.objects.has(storedKey(a.pod, id))).toBe(false);
      expect(uploads.objects.has(pendingKey(a.pod, id))).toBe(true);
      expect((await s.store.getAttachment(a.pod, id)).state).toBe("pending");
    });

    it("deletes the first photo's copy when the second's copy fails", async () => {
      const a = await parent();
      const first = await a.upload();
      const second = await a.upload();
      const copy = uploads.copy.bind(uploads);
      uploads.copy = async (from, to, type, disposition) => {
        if (from === pendingKey(a.pod, second)) throw new Error("the copy failed");
        return copy(from, to, type, disposition);
      };
      const sent = await a.send([first, second]);
      expect(sent.status).toBe(500);
      await keptNothing(a, [first, second]);
    });

    // Wave 6 (dl-z5ja.11.10, decision 60): a HEIC, a PDF and a DOCX go up as they are.
    it.each([
      ["a PDF", PDF, () => syntheticPdf(BYTES), "pdf", "attachment"],
      ["a DOCX", DOCX, () => syntheticZip(DOCX_NAMES), "docx", "attachment"],
      ["a HEIC", HEIC, () => syntheticHeic(BYTES), "heic", "inline"],
      ["a HEIC of brand mif1", HEIC, () => syntheticHeic(BYTES, "mif1"), "heic", "inline"],
    ] as const)(
      "attaches %s, copied by its kind with no size",
      async (_what, kind, body, ext, disposition) => {
        const a = await parent();
        const bytes = body();
        const id = await a.uploadFile(kind, bytes);
        expect(uploads.forms.at(-1)).toEqual({
          key: pendingKey(a.pod, id),
          contentType: kind,
          bytes: bytes.length,
        });
        const event_id = event();
        expect((await a.send([id], "", event_id)).status).toBe(201);
        const to = `pods/${a.pod}/attachments/${id}.${ext}`;
        const inbox = await s.store.findRunInbox(a.pod, event_id);
        expect(inbox?.kind === "message" && inbox.payload.attachments).toEqual([
          {
            attachment_id: id,
            storage_path: to,
            media_type: kind,
            bytes: bytes.length,
            width: null,
            height: null,
          },
        ]);
        expect(uploads.objects.get(to)).toMatchObject({ contentType: kind, disposition });
        expect(uploads.objects.has(pendingKey(a.pod, id))).toBe(false);
        expect(await s.store.getAttachment(a.pod, id)).toMatchObject({
          state: "attached",
          storage_path: to,
          name: "zeszyt",
        });
      },
    );

    it.each([
      ["a JPEG renamed to .pdf", PDF, () => syntheticJpeg(BYTES)],
      [
        "a ZIP without word/document.xml",
        DOCX,
        () => syntheticZip(["[Content_Types].xml", "xl/workbook.xml"]),
      ],
      ["a PDF declared as a DOCX", DOCX, () => syntheticPdf(BYTES)],
      ["a HEIF of another brand", HEIC, () => syntheticHeic(BYTES, "avif")],
      ["a JPEG declared as a HEIC", HEIC, () => syntheticJpeg(BYTES)],
    ] as const)(
      "refuses %s as 409 AttachmentMismatch, keeping nothing",
      async (_what, kind, body) => {
        const a = await parent();
        const good = await a.upload();
        const bad = await a.uploadFile(kind, body());
        const sent = await a.send([good, bad], "Zadanie 3");
        expect(sent.status).toBe(409);
        expect(sent.body.error.type).toBe("AttachmentMismatch");
        await keptNothing(a, [good, bad]);
      },
    );

    it("reads a DOCX's central directory with ranged GETs from its end, past the first 64 KB", async () => {
      const a = await parent();
      const bytes = syntheticZip(DOCX_NAMES, { pad: 100_000 });
      const id = await a.uploadFile(DOCX, bytes);
      expect((await a.send([id])).status).toBe(201);
      const key = pendingKey(a.pod, id);
      const read = uploads.ranges.filter((r) => r.key === key);
      // The last read is the directory itself, after the 100 KB of padding; the file is never read whole.
      expect(read.at(-1)?.start).toBeGreaterThan(100_000);
      expect(read.reduce((n, r) => n + r.end - r.start + 1, 0)).toBeLessThan(bytes.length);
    });

    it("refuses a document past documentBytes, and a JPEG past attachmentBytes, as 400", async () => {
      const a = await parent();
      const big = await a.call<ErrorEnvelope>("POST", pathOf("createAttachment", {}), {
        event_id: event(),
        media_type: PDF,
        bytes: LIMITS.documentBytes + 1,
      });
      expect(big.status).toBe(400);
      expect((await a.create(LIMITS.attachmentBytes + 1)).status).toBe(400);
      expect(uploads.forms).toHaveLength(0);
    });

    it("links a document's first page once the converter wrote p1.jpg, and none before", async () => {
      const a = await parent();
      const id = await a.uploadFile(PDF, syntheticPdf(BYTES));
      expect((await a.send([id])).status).toBe(201);
      const before = await a.call<AttachmentRead>("GET", pathOf("getAttachment", { id }));
      expect(before.status).toBe(200);
      expect(before.body.url).toBe(
        `https://uploads.test/pods/${a.pod}/attachments/${id}.pdf?expires-in=300`,
      );
      expect(before.body.preview_url).toBeNull();
      uploads.put(previewKey(a.pod, id), syntheticJpeg(BYTES));
      const after = await a.call<AttachmentRead>("GET", pathOf("getAttachment", { id }));
      expect(after.body.preview_url).toBe(
        `https://uploads.test/${previewKey(a.pod, id)}?expires-in=300`,
      );
      // A JPEG is its own preview.
      const photo = await a.upload();
      expect((await a.send([photo])).status).toBe(201);
      const read = await a.call<AttachmentRead>("GET", pathOf("getAttachment", { id: photo }));
      expect(read.body.preview_url).toBeNull();
    });

    it("refuses another pod's document on a message, and never shows it or its preview", async () => {
      const a = await parent();
      const b = await parent();
      const theirs = await b.uploadFile(PDF, syntheticPdf(BYTES));
      const sent = await a.send([theirs]);
      expect(sent.status).toBe(409);
      expect(sent.body.error.type).toBe("AttachmentMismatch");
      await keptNothing(b, [theirs]);
      expect((await b.send([theirs])).status).toBe(201);
      uploads.put(previewKey(b.pod, theirs), syntheticJpeg(BYTES));
      expect((await a.call("GET", pathOf("getAttachment", { id: theirs }))).status).toBe(404);
      const own = await b.call<AttachmentRead>("GET", pathOf("getAttachment", { id: theirs }));
      expect(own.body.preview_url).toContain(previewKey(b.pod, theirs));
    });

    it("answers a pending photo's link as 404", async () => {
      const a = await parent();
      const id = await a.upload();
      expect((await a.call("GET", pathOf("getAttachment", { id }))).status).toBe(404);
    });

    it("refuses the pod's photo past its daily count as 429 AttachmentLimitDay", async () => {
      const a = await parent();
      const expires_at = new Date(Date.now() + 60_000).toISOString();
      for (let i = 0; i < LIMITS.attachmentsPerPodPerDay; i++)
        await s.store.createAttachment(a.pod, {
          id: AttachmentId.parse(idOf(ID_PREFIXES.attachment, randomUUID())),
          account_id: a.account,
          event_id: event(),
          media_type: "image/jpeg",
          bytes: BYTES,
          width: 10,
          height: 10,
          name: null,
          expires_at,
        });
      const created = await a.create();
      expect(created.status).toBe(429);
      expect((created.body as unknown as ErrorEnvelope).error.type).toBe("AttachmentLimitDay");
      expect(uploads.forms).toHaveLength(0);
    });
  });
}
