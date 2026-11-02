import type { InvokeCommand } from "@aws-sdk/client-lambda";
import { AttachmentId, ID_PREFIXES, idOf, PodId } from "@jadwigo/contracts";
import type { MessageAttachment } from "@jadwigo/contracts/run";
import { describe, expect, it } from "vitest";
import { type InvokeClient, lambdaConverter } from "./converter.ts";

const POD = PodId.parse(idOf(ID_PREFIXES.pod, crypto.randomUUID()));
const ID = AttachmentId.parse(idOf(ID_PREFIXES.attachment, crypto.randomUUID()));
const PDF: MessageAttachment = {
  attachment_id: ID,
  storage_path: `pods/${POD}/attachments/${ID}.pdf`,
  media_type: "application/pdf",
  bytes: 1000,
  width: null,
  height: null,
};

type Answer = { FunctionError?: string; Payload?: Uint8Array };
const json = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

/** A stubbed Lambda client that answers each invoke and records what it was sent. */
function stub(answer: () => Promise<Answer>) {
  const sent: {
    FunctionName?: string | undefined;
    InvocationType?: string | undefined;
    event: unknown;
  }[] = [];
  const client: InvokeClient = {
    send: async (command: InvokeCommand) => {
      const { FunctionName, InvocationType, Payload } = command.input;
      const event = JSON.parse(new TextDecoder().decode(Payload as Uint8Array));
      sent.push({ FunctionName, InvocationType, event });
      return { StatusCode: 200, ...(await answer()) };
    },
  };
  return { sent, client };
}

const noSsm = () => Promise.reject(new Error("no SSM in a unit test"));

describe("the runner's converter (dl-z5ja.11.7)", () => {
  it("invokes CONVERTER_FUNCTION with S3 keys, never bytes, and answers its pages in order", async () => {
    const pages = [1, 2].map((n) => ({
      key: `pods/${POD}/attachments/${ID}/p${n}.jpg`,
      width: 1414,
      height: 2000,
      bytes: 300_000,
    }));
    const lambda = stub(async () => ({ Payload: json({ pages }) }));
    const converter = lambdaConverter(
      "arn:aws:lambda:eu-central-1:000000000000:function:made-up-converter",
      "made-up-uploads",
      noSsm,
      lambda.client,
    );
    expect(await converter.pages(PDF, POD)).toEqual({
      pages: pages.map(({ key, ...size }) => ({ storage_path: key, ...size })),
    });
    expect(lambda.sent).toEqual([
      {
        FunctionName: "arn:aws:lambda:eu-central-1:000000000000:function:made-up-converter",
        InvocationType: "RequestResponse",
        event: {
          bucket: "made-up-uploads",
          key: PDF.storage_path,
          media_type: "application/pdf",
          pod: POD,
          attachment_id: ID,
        },
      },
    ]);
  });

  const refused = (code: string): Answer => ({
    FunctionError: "Unhandled",
    Payload: json({ errorType: "Refused", errorMessage: code }),
  });

  for (const code of ["too_many_pages", "encrypted", "unreadable"]) {
    it(`reads the refusal ${code} from errorMessage when errorType is Refused`, async () => {
      const lines: string[] = [];
      const converter = lambdaConverter(
        "c",
        "b",
        noSsm,
        stub(async () => refused(code)).client,
        (l) => lines.push(l),
      );
      expect(await converter.pages(PDF, POD)).toEqual({ refused: code });
      expect(lines).toEqual([]);
    });
  }

  it("reads bad_event, our own bug, as unavailable, and logs only its code", async () => {
    const lines: string[] = [];
    const converter = lambdaConverter(
      "c",
      "b",
      noSsm,
      stub(async () => refused("bad_event")).client,
      (l) => lines.push(l),
    );
    expect(await converter.pages(PDF, POD)).toEqual({ refused: "unavailable" });
    expect(lines).toEqual(["converter refused: bad_event"]);
  });

  it("never reads a code from another error type, and logs only that type", async () => {
    const lines: string[] = [];
    const answer = {
      FunctionError: "Unhandled",
      Payload: json({ errorType: "ClientError", errorMessage: "encrypted" }),
    };
    const converter = lambdaConverter("c", "b", noSsm, stub(async () => answer).client, (l) =>
      lines.push(l),
    );
    expect(await converter.pages(PDF, POD)).toEqual({ refused: "unavailable" });
    expect(lines).toEqual(["converter failed: ClientError"]);
  });

  it("is unavailable with no function named, on a timeout or crash, or an answer of another shape", async () => {
    const never = stub(async () => ({}));
    expect(await lambdaConverter(undefined, "b", noSsm, never.client).pages(PDF, POD)).toEqual({
      refused: "unavailable",
    });
    expect(never.sent).toEqual([]);
    for (const answer of [
      {
        FunctionError: "Unhandled",
        Payload: json({ errorType: "Sandbox.Timedout", errorMessage: "timed out" }),
      },
      { Payload: json({ pages: [{ key: "k", width: 0, height: 1, bytes: 1 }] }) },
      { Payload: new TextEncoder().encode("not json") },
      { Payload: json({ error: "encrypted" }) },
      {},
    ]) {
      const converter = lambdaConverter("c", "b", noSsm, stub(async () => answer).client, () => {});
      expect(await converter.pages(PDF, POD)).toEqual({ refused: "unavailable" });
    }
  });

  it("throws when Lambda cannot be reached, so the step is retried", async () => {
    const down = stub(() => Promise.reject(new Error("throttled")));
    await expect(lambdaConverter("c", "b", noSsm, down.client).pages(PDF, POD)).rejects.toThrow(
      "throttled",
    );
  });

  it("names the bucket from SSM once when UPLOADS_BUCKET is unset", async () => {
    const params: string[] = [];
    const lambda = stub(async () => ({ Payload: json({ pages: [] }) }));
    const converter = lambdaConverter(
      "c",
      undefined,
      async (name) => {
        params.push(name);
        return " made-up-uploads ";
      },
      lambda.client,
    );
    await converter.pages(PDF, POD);
    await converter.pages(PDF, POD);
    expect(params).toEqual(["/jadwigo/uploads/bucket"]);
    expect(lambda.sent.map((s) => (s.event as { bucket: string }).bucket)).toEqual([
      "made-up-uploads",
      "made-up-uploads",
    ]);
  });
});
