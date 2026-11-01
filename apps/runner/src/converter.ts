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

/** The codes the converter refuses with (dl-z5ja.11.8); anything else it fails with is unavailable. */
const REFUSALS: ReadonlySet<string> = new Set(["too_many_pages", "encrypted", "unreadable"]);

/**
 * The runner's converter (dl-z5ja.11.7, wave 6 decision 59): a synchronous invoke of the Lambda
 * `CONVERTER_FUNCTION` names, over IAM, with S3 keys and never bytes:
 * `{bucket, key, media_type, pod, attachment_id}`, the pod as the key names it. It answers
 * `{pages: [{key, width, height, bytes}]}`, the JPEGs it wrote under
 * `pods/<pod>/attachments/<id>/p<n>.jpg`; the engine checks every key before it reads one.
 *
 * A refusal the converter raises (its code as the error's type or message, or `{error: code}`) is
 * that refusal. With no function named, an error the function did not raise on purpose (a timeout,
 * a crash) or an answer of another shape, the file is `unavailable`: the parent is told, and the
 * turn goes on. A failure to reach Lambda at all throws, and the step is retried.
 */
export function lambdaConverter(
  name = converterFunction(),
  bucketName = uploadsBucket(),
  read: ReadParameter = readSsm,
  client: InvokeClient = new LambdaClient({}),
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
      if (out.FunctionError !== undefined) return { refused: refusalIn(answer) };
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

/** A raised refusal's code: Python's `errorType` or `errorMessage`, when it is one of the codes. */
function refusalIn(answer: unknown): ConvertRefusal {
  const e = (answer ?? {}) as { errorType?: unknown; errorMessage?: unknown };
  for (const said of [e.errorType, e.errorMessage]) {
    if (typeof said === "string" && REFUSALS.has(said)) return said as ConvertRefusal;
  }
  return "unavailable";
}

const count = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n > 0;

/** The pages of a successful answer, or the refusal it returned as `{error: code}`. */
function pagesIn(answer: unknown): Converted {
  const a = (answer ?? {}) as { pages?: unknown; error?: unknown };
  if (typeof a.error === "string") {
    return { refused: REFUSALS.has(a.error) ? (a.error as ConvertRefusal) : "unavailable" };
  }
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
