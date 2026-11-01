import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import type { Converted, Converter, ConvertRefusal } from "@jadwigo/jadwigo-ai";
import { uploadsBucketOf } from "./attachments.ts";
import { converterFunction, type ReadParameter, readSsm, uploadsBucket } from "./config.ts";

/** The client the converter is invoked through: `LambdaClient` in the Lambda, a fake in tests. */
export interface InvokeClient {
  send(command: InvokeCommand): Promise<{
    StatusCode?: number | undefined;
    FunctionError?: string | undefined;
    Payload?: Uint8Array | undefined;
  }>;
}

/**
 * The codes a file is refused with (dl-z5ja.11.8, #600). `bad_event` is ours, not the parent's
 * file (the event named the wrong key, id, type or bucket), so it is `unavailable`, and logged.
 */
const REFUSALS: ReadonlySet<string> = new Set(["too_many_pages", "encrypted", "unreadable"]);

/**
 * The runner's converter (dl-z5ja.11.7, wave 6 decision 59): a synchronous invoke of the Lambda
 * `CONVERTER_FUNCTION` names, over IAM, with S3 keys and never bytes:
 * `{bucket, key, media_type, pod, attachment_id}`, the pod as the key names it. It answers
 * `{pages: [{key, width, height, bytes}]}`, the JPEGs it wrote under
 * `pods/<pod>/attachments/<id>/p<n>.jpg`; the engine checks every key before it reads one.
 *
 * A refusal is a FunctionError with `errorType: "Refused"` and the code, exactly, as its
 * `errorMessage`. With no function named, `bad_event`, any other error (S3, a missing binary, a
 * timeout) or an answer of another shape, the file is `unavailable`: the parent is told, and the
 * turn goes on. A failure to reach Lambda at all throws, and the step is retried. `warn` gets the
 * code of a `bad_event` or of another error type, and nothing else.
 */
export function lambdaConverter(
  name = converterFunction(),
  bucketName = uploadsBucket(),
  read: ReadParameter = readSsm,
  client: InvokeClient = new LambdaClient({}),
  warn: (line: string) => void = (line) => console.warn(line),
): Converter {
  const bucket = uploadsBucketOf(bucketName, read);
  return {
    pages: async (attachment) => {
      if (name === undefined) return { refused: "unavailable" };
      const Bucket = await bucket();
      if (Bucket === undefined) throw new Error("no uploads bucket: set UPLOADS_BUCKET");
      const event = {
        bucket: Bucket,
        key: attachment.storage_path,
        media_type: attachment.media_type,
        // The pod as the key names it: the engine has checked the key is under the run's pod.
        pod: attachment.storage_path.split("/")[1] ?? "",
        attachment_id: attachment.attachment_id,
      };
      const out = await client.send(
        new InvokeCommand({
          FunctionName: name,
          InvocationType: "RequestResponse",
          Payload: new TextEncoder().encode(JSON.stringify(event)),
        }),
      );
      const answer = parsed(out.Payload);
      if (out.FunctionError !== undefined) return { refused: refusalIn(answer, warn) };
      return pagesIn(answer);
    },
  };
}

function parsed(payload: Uint8Array | undefined): unknown {
  if (payload === undefined || payload.length === 0) return null;
  try {
    return JSON.parse(new TextDecoder().decode(payload));
  } catch {
    return null;
  }
}

/** A raised refusal's code, read from `errorMessage` only when `errorType` is `Refused`. */
function refusalIn(answer: unknown, warn: (line: string) => void): ConvertRefusal {
  const e = (answer ?? {}) as { errorType?: unknown; errorMessage?: unknown };
  if (e.errorType === "Refused" && typeof e.errorMessage === "string") {
    if (REFUSALS.has(e.errorMessage)) return e.errorMessage as ConvertRefusal;
    // The code only: a message is never logged, since it could name a file.
    warn(`converter refused: ${e.errorMessage === "bad_event" ? "bad_event" : "unknown code"}`);
    return "unavailable";
  }
  warn(
    `converter failed: ${typeof e.errorType === "string" ? e.errorType.slice(0, 64) : "no error type"}`,
  );
  return "unavailable";
}

const count = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n > 0;

/** The pages of a successful answer; any other shape is unavailable. */
function pagesIn(answer: unknown): Converted {
  const a = (answer ?? {}) as { pages?: unknown };
  if (!Array.isArray(a.pages)) return { refused: "unavailable" };
  const pages = [];
  for (const page of a.pages as unknown[]) {
    const p = (page ?? {}) as { key?: unknown; width?: unknown; height?: unknown; bytes?: unknown };
    if (typeof p.key !== "string" || !count(p.width) || !count(p.height) || !count(p.bytes)) {
      return { refused: "unavailable" };
    }
    pages.push({ storage_path: p.key, width: p.width, height: p.height, bytes: p.bytes });
  }
  return { pages };
}
