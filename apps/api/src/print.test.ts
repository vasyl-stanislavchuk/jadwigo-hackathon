// The print routes (dl-1eieq.8.4) on InMemoryStore, with a bucket in memory and a fake print Lambda.
import { randomUUID } from "node:crypto";
import type { InvokeCommand } from "@aws-sdk/client-lambda";
import type { S3Client } from "@aws-sdk/client-s3";
import {
  AssignmentId,
  type ErrorEnvelope,
  EventId,
  ID_PREFIXES,
  idOf,
  type LessonGiven,
  type LessonVersionId,
  type Me,
  type PodId,
  PrintSheet,
  type PrintStatus,
  type RunAccepted,
  toolView,
} from "@jadwigo/contracts";
import { InMemoryRunQueue } from "@jadwigo/jadwigo-ai";
import { InMemoryStore, type LessonVersionWithQuestions } from "@jadwigo/store";
import { LESSON_FILES } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { lambdaPrint, type PrintBucket, printMediaSrc, s3Prints } from "./print.ts";
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
    /** Gives the checked lesson: a published version and an assignment, its play link. */
    const give = async () =>
      (await call<LessonGiven>("POST", pathOf("giveLesson", { id: conversation.id }), {})).body;
    return { pod, print, status, give };
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

// Decision dl-3h2e8, dl-1eieq.8.15: anyone holding a play link prints its lesson, with no sign-in.
describe("printing a play link", () => {
  /** The public routes, called with no token at all. */
  const open = (s: ReturnType<typeof setUp>["s"]) => ({
    print: (id: string) =>
      s.call<PrintStatus & ErrorEnvelope>(
        "POST",
        pathOf("startAssignmentPrint", { id }),
        undefined,
      ),
    status: (id: string, printId: string) =>
      s.call<PrintStatus & ErrorEnvelope>(
        "GET",
        pathOf("getAssignmentPrint", { id, print_id: printId }),
      ),
  });

  it("prints the given version with no sign-in: pending, then ready with its 5-minute link", async () => {
    const { s, bucket, started, parent } = setUp();
    const a = await parent();
    const { assignment } = await a.give();
    const link = open(s);
    const first = await link.print(assignment.id);
    expect(first.status).toBe(200);
    expect(first.body.status).toBe("pending");
    const key = `pods/${a.pod}/prints/${first.body.print_id}.json`;
    expect(started).toEqual([`uploads.test/${key}`]);
    const sheet = PrintSheet.parse(JSON.parse(bucket.objects.get(key) ?? "{}"));
    expect(sheet.questions).toHaveLength(10);
    // The same lesson as the parent's own print of that revision: one PDF, made once.
    expect((await a.print({ revision: 1 })).body.print_id).toBe(first.body.print_id);

    bucket.objects.set(`pods/${a.pod}/prints/${first.body.print_id}.pdf`, "%PDF");
    expect((await link.status(assignment.id, first.body.print_id)).body).toMatchObject({
      status: "ready",
      url: `https://bucket.test/pods/${a.pod}/prints/${first.body.print_id}.pdf?expires=300`,
    });
  });

  it("reads a print in the link's pod only, and 404s an unknown link", async () => {
    const { s, parent } = setUp();
    const a = await parent();
    const b = await parent();
    const mine = (await a.give()).assignment.id;
    const theirs = (await b.give()).assignment.id;
    const link = open(s);
    const { print_id } = (await link.print(mine)).body;
    const across = await link.status(theirs, print_id);
    expect(across.status).toBe(404);
    expect(across.body.error.type).toBe("NotFound");
    const unknown = await link.print(idOf(ID_PREFIXES.assignment, randomUUID()));
    expect(unknown.status).toBe(404);
  });

  /** A second version of the given lesson, published after the first, from some of its rows. */
  async function republish(
    s: ReturnType<typeof setUp>["s"],
    pod: PodId,
    given: LessonGiven,
    keep: (row: LessonVersionWithQuestions["questions"][number]) => boolean,
  ) {
    const first = await s.store.getLessonVersion(pod, given.lesson_version.id);
    const later = await s.store.publishLessonVersion(pod, {
      lesson_id: given.assignment.lesson_id,
      questions: first.questions
        .filter(keep)
        .map((row) => ({ lesson_question_id: row.question.id, role: row.role })),
    });
    const link = (lesson_version_id?: LessonVersionId) =>
      s.store.putAssignment(pod, {
        id: AssignmentId.parse(idOf(ID_PREFIXES.assignment, randomUUID())),
        lesson_id: given.assignment.lesson_id,
        audience: "anyone",
        identity: "pick",
        ...(lesson_version_id === undefined ? {} : { lesson_version_id }),
      });
    return { later, link };
  }

  it("prints a pinned link's own version, and an unpinned link's latest", async () => {
    const { s, bucket, parent } = setUp();
    const a = await parent();
    const given = await a.give();
    let printable = 0;
    const { later, link } = await republish(
      s,
      a.pod,
      given,
      (row) => row.role === "planned" && row.question.family !== "explain" && ++printable <= 3,
    );
    expect(later.id).not.toBe(given.lesson_version.id);
    const sheetOf = async (id: string) => {
      const { print_id } = (await open(s).print(id)).body;
      const key = `pods/${a.pod}/prints/${print_id}.json`;
      return PrintSheet.parse(JSON.parse(bucket.objects.get(key) ?? "{}"));
    };
    const pinned = await link(given.lesson_version.id);
    expect((await sheetOf(pinned.id)).questions).toHaveLength(10);
    const unpinned = await link();
    expect((await sheetOf(unpinned.id)).questions).toHaveLength(3);
  });

  it("refuses a lesson with nothing to print on paper: 409 LessonNotPrintable", async () => {
    const { s, parent } = setUp();
    const a = await parent();
    const { link } = await republish(
      s,
      a.pod,
      await a.give(),
      (row) => row.question.family === "explain",
    );
    const refused = await open(s).print((await link()).id);
    expect(refused.status).toBe(409);
    expect(refused.body.error.type).toBe("LessonNotPrintable");
  });

  it("answers 502 where printing is not set up", async () => {
    const { s, parent } = setUp({ wired: false });
    const { assignment } = await (await parent()).give();
    const off = await open(s).print(assignment.id);
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

describe("s3Prints", () => {
  it("reads a 403 as no such key: the api role has no s3:ListBucket (dl-1eieq.8.23)", async () => {
    const denied = Object.assign(new Error("Forbidden"), {
      name: "Forbidden",
      $metadata: { httpStatusCode: 403 },
    });
    const client = { send: () => Promise.reject(denied) } as unknown as S3Client;
    const bucket = s3Prints(client, async () => "jadwigo-uploads-test");
    expect(await bucket.has("pods/p/prints/x.pdf")).toBe(false);
    expect(await bucket.text("pods/p/prints/x.error.json")).toBeUndefined();
  });
});
