// The print routes (dl-1eieq.8.4) on InMemoryStore, with a bucket in memory and a fake print Lambda.
import { randomUUID } from "node:crypto";
import type { InvokeCommand } from "@aws-sdk/client-lambda";
import {
  type ErrorEnvelope,
  EventId,
  type Me,
  type PodId,
  PrintSheet,
  type PrintStatus,
  type RunAccepted,
  toolView,
} from "@jadwigo/contracts";
import { InMemoryRunQueue } from "@jadwigo/jadwigo-ai";
import { InMemoryStore } from "@jadwigo/store";
import { LESSON_FILES } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { lambdaPrint, type PrintBucket, printMediaSrc } from "./print.ts";
import { pathOf, seeded } from "./testing/client.ts";
import { bearerOf, signToken } from "./testing/token.ts";

const event = () => EventId.parse(randomUUID());
const LESSON = LESSON_FILES[1]; // multiplication-times-four: 11 questions (one explain), passes check()

function memoryBucket(): PrintBucket & { objects: Map<string, string> } {
  const objects = new Map<string, string>();
  return {
    objects,
    name: async () => "uploads.test",
    has: async (key) => objects.has(key),
    text: async (key) => objects.get(key),
    put: async (key, body) => {
      objects.set(key, body);
    },
    presignGet: async (key, s) => `https://bucket.test/${key}?expires=${s}`,
  };
}

function setUp({ wired = true }: { readonly wired?: boolean } = {}) {
  const bucket = memoryBucket();
  const started: string[] = [];
  let failing = 0;
  const failStarts = (n: number) => {
    failing = n;
  };
  const s = seeded(new InMemoryStore(), {
    queue: new InMemoryRunQueue(() => new Date()),
    print: wired
      ? {
          bucket,
          start: async (bucketName, key) => {
            if (failing > 0) {
              failing -= 1;
              throw new Error("throttled");
            }
            started.push(`${bucketName}/${key}`);
          },
          media: "https://media.test",
        }
      : { media: "" },
  });

  /** A parent with a pod and a conversation whose log holds a revision and, if asked, a pass. */
  async function parent({ checked = true }: { readonly checked?: boolean } = {}) {
    const headers = bearerOf(signToken({ sub: randomUUID() }));
    const call = <T>(method: string, path: string, body?: unknown) =>
      s.call<T>(method, path, body, headers);
    const me = await call<Me>("POST", pathOf("createAccount", {}), { language: "pl" });
    const pod = me.body.pod?.id as PodId;
    await call("PATCH", pathOf("patchPod", { id: pod }), { ai_consented: true });
    const conversation = (
      await call<{ id: string }>("POST", pathOf("createConversation", {}), { event_id: event() })
    ).body;
    const { run } = (
      await call<RunAccepted>("POST", pathOf("postMessage", { id: conversation.id }), {
        event_id: event(),
        text: "A lesson, please",
      })
    ).body;
    await s.store.appendLessonRevision(pod, run.id, run.attempt, 0, {
      run_id: run.id,
      event_id: event(),
      type: "lesson_revision",
      payload: { revision: 1, call_id: randomUUID(), lesson_file: LESSON as never },
    });
    if (checked)
      await s.store.appendRunEvents(pod, run.id, run.attempt, [
        {
          run_id: run.id,
          event_id: event(),
          type: "tool_result",
          payload: {
            call_id: randomUUID(),
            verb: "lesson_check",
            output: { ok: true },
            error: null,
            view: toolView("lesson_check", { publishable: true, findings: [] }),
          },
        },
      ]);
    const print = (body: object = {}) =>
      call<PrintStatus & ErrorEnvelope>(
        "POST",
        pathOf("startPrint", { id: conversation.id }),
        body,
      );
    const status = (id: string) =>
      call<PrintStatus & ErrorEnvelope>("GET", pathOf("getPrint", { id }));
    return { pod, print, status };
  }
  return { s, bucket, started, parent, failStarts };
}

describe("the print routes", () => {
  it("writes the sheet, starts the print Lambda once and answers pending", async () => {
    const { bucket, started, parent } = setUp();
    const a = await parent();
    const first = await a.print({ revision: 1 });
    expect(first.status).toBe(200);
    expect(first.body.status).toBe("pending");
    const key = `pods/${a.pod}/prints/${first.body.print_id}.json`;
    expect(started).toEqual([`uploads.test/${key}`]);
    const sheet = PrintSheet.parse(JSON.parse(bucket.objects.get(key) ?? "{}"));
    // 11 planned questions, one an explain the player never asks: 10 on paper.
    expect(sheet.questions).toHaveLength(10);

    const again = await a.print();
    expect(again.body).toEqual(first.body);
    // Still pending: the Lambda is started again, in case the first start or render was lost.
    expect(started).toEqual([`uploads.test/${key}`, `uploads.test/${key}`]);
    expect((await a.status(first.body.print_id)).body).toEqual(first.body);
  });

  it("answers ready with a 5-minute link once the PDF is there, and failed with its reason", async () => {
    const { bucket, parent } = setUp();
    const a = await parent();
    const { print_id } = (await a.print()).body;
    bucket.objects.set(`pods/${a.pod}/prints/${print_id}.pdf`, "%PDF");
    const ready = await a.status(print_id);
    expect(ready.body).toMatchObject({
      status: "ready",
      print_id,
      url: `https://bucket.test/pods/${a.pod}/prints/${print_id}.pdf?expires=300`,
    });
    expect((await a.print()).body.status).toBe("ready");

    const b = await parent();
    const other = (await b.print()).body.print_id;
    bucket.objects.set(
      `pods/${b.pod}/prints/${other}.error.json`,
      JSON.stringify({ code: "invalid_sheet" }),
    );
    expect((await b.status(other)).body).toEqual({
      status: "failed",
      print_id: other,
      reason: "invalid_sheet",
    });
  });

  it("starts the Lambda again on the next print when the first start failed", async () => {
    const { bucket, started, parent, failStarts } = setUp();
    const a = await parent();
    failStarts(1);
    const failed = await a.print();
    expect(failed.status).toBe(500);
    const retried = await a.print();
    expect(retried.body.status).toBe("pending");
    const key = `pods/${a.pod}/prints/${retried.body.print_id}.json`;
    expect(bucket.objects.has(key)).toBe(true);
    expect(started).toEqual([`uploads.test/${key}`]);
  });

  it("never shows one pod's print to another, and 404s an id no route made", async () => {
    const { parent } = setUp();
    const a = await parent();
    const b = await parent();
    const { print_id } = (await a.print()).body;
    const theirs = await b.status(print_id);
    expect(theirs.status).toBe(404);
    expect(theirs.body.error.type).toBe("NotFound");
    expect((await a.status("0".repeat(64))).status).toBe(404);
  });

  it("refuses an unchecked lesson as giving does, and answers 502 where printing is not set up", async () => {
    const unchecked = await setUp().parent({ checked: false });
    const refused = await unchecked.print();
    expect(refused.status).toBe(409);
    expect(refused.body.error.type).toBe("LessonNotPublishable");

    const bare = await setUp({ wired: false }).parent();
    const off = await bare.print();
    expect(off.status).toBe(502);
    expect(off.body.error.type).toBe("PrintUnavailable");
  });
});

describe("a picture's address on paper", () => {
  const ref = `${"a".repeat(64)}.png`;
  it("follows apps/web's media rule", () => {
    expect(printMediaSrc(ref, "https://m.test/")).toBe(`https://m.test/${ref}`);
    expect(printMediaSrc(`/media/khan/${ref}`, "https://m.test")).toBe(`https://m.test/${ref}`);
    expect(printMediaSrc(`/media/alfik/${ref}`, "https://m.test")).toBe(
      `https://m.test/alfik/media/${ref}`,
    );
    expect(printMediaSrc("https://x.test/p.png", "")).toBe("https://x.test/p.png");
  });

  it("refuses an address the print Lambda may not fetch", () => {
    expect(() => printMediaSrc("data:image/png;base64,AA", "https://m.test")).toThrow(/address/);
    expect(() => printMediaSrc(ref, "")).toThrow(/address/);
  });
});

describe("starting the print Lambda", () => {
  it("sends the converter's event shape, {bucket, key}, as an async invoke", async () => {
    const sent: InvokeCommand[] = [];
    const start = lambdaPrint("arn:aws:lambda:eu-central-1:1:function:print", {
      send: async (command) => {
        sent.push(command);
      },
    });
    await start?.("uploads.test", "pods/p/prints/x.json");
    const [command] = sent;
    expect(command?.input.InvocationType).toBe("Event");
    expect(JSON.parse(new TextDecoder().decode(command?.input.Payload as Uint8Array))).toEqual({
      bucket: "uploads.test",
      key: "pods/p/prints/x.json",
    });
  });

  it("is not set up without PRINT_FUNCTION", () => {
    expect(lambdaPrint(undefined)).toBeUndefined();
  });
});
