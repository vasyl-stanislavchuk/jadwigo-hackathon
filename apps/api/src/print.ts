import { createHash } from "node:crypto";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  type ConversationId,
  ErrorType,
  type PodId,
  PrintFailure,
  type PrintId,
  type PrintSheet,
  PrintStart,
  type PrintStatus,
} from "@jadwigo/contracts";
import { buildPrintSheet, LessonNotPrintable } from "@jadwigo/lesson-kit/paper";
import type { Store } from "@jadwigo/store";
import type { Claims } from "./auth.ts";
import { authorizeMember } from "./authorize.ts";
import { printFunction, type ReadParameter, readSsm, uploadsBucket } from "./config.ts";
import { ApiError, badRequest } from "./errors.ts";
import { checkedLesson } from "./give.ts";

/**
 * The print routes (dl-1eieq.8.4, decision dl-o05aa). `POST /api/v1/conversations/{id}/prints`
 * builds the checked lesson's print sheet in memory (nothing is published or assigned), names the
 * print by the sha256 of its sheet, and either answers the PDF already made or writes the sheet to
 * the uploads bucket and starts the print Lambda (apps/print) with an async invoke, so the route
 * stays inside the API's 10 s. `GET /api/v1/prints/{id}` reads where it stands. Everything lives
 * under the caller's pod:
 *
 *   pods/<pod>/prints/<id>.json         the sheet, written by this route
 *   pods/<pod>/prints/<id>.pdf          the PDF, written by the print Lambda
 *   pods/<pod>/prints/<id>.error.json   {"code": PrintFailure}, written by the print Lambda
 *
 * The Lambda is started with `{"bucket", "key"}`, the converter's event shape, and every object
 * carries the tag `kind=print`, which the uploads bucket's lifecycle expires (apps/print/AGENTS.md).
 */

/** How long the link to a PDF reads it. */
const LINK_S = 5 * 60;

/** The bucket calls the print routes make: the uploads bucket, under `pods/<pod>/prints/`. */
export interface PrintBucket {
  /** The bucket's name, which the print Lambda's event names. */
  name(): Promise<string>;
  has(key: string): Promise<boolean>;
  text(key: string): Promise<string | undefined>;
  put(key: string, body: string, contentType: string): Promise<void>;
  presignGet(key: string, expiresInS: number): Promise<string>;
}

/** Starts the print Lambda on one stored sheet; it returns before the PDF is made. */
export type StartPrint = (bucket: string, sheetKey: string) => Promise<void>;

export interface PrintDeps {
  readonly bucket?: PrintBucket | undefined;
  readonly start?: StartPrint | undefined;
  /** Where pictures are served from (`MEDIA_URL`), as apps/web's `VITE_MEDIA_URL`. */
  readonly media: string;
  readonly now: () => Date;
}

const base = (pod: PodId, id: PrintId) => `pods/${pod}/prints/${id}`;

/** A bare picture ref, `<sha256>.<ext>`, as apps/web/src/media.ts reads one. */
const REF = /^[0-9a-f]{40,64}\.[a-z0-9]{2,5}$/;

/**
 * A picture's absolute address: the same rule as apps/web/src/media.ts `mediaSrc` (a bare ref, a
 * `media:` ref or a `/media/khan/` path is `<media url>/<ref>`, an Alfik `/media/alfik/<ref>` is
 * `<media url>/alfik/media/<ref>`), and an absolute https address as it is. Anything else has no
 * address the print Lambda may fetch, so the lesson cannot print.
 */
export function printMediaSrc(src: string, media: string): string {
  const root = media.replace(/\/+$/, "");
  let out = src;
  if (src.startsWith("/media/alfik/")) {
    const ref = src.slice("/media/alfik/".length);
    if (REF.test(ref)) out = `${root}/alfik/media/${ref}`;
  } else {
    const ref = src.startsWith("media:")
      ? src.slice("media:".length)
      : src.startsWith("/media/khan/")
        ? src.slice("/media/khan/".length)
        : src;
    if (REF.test(ref)) out = `${root}/${ref}`;
  }
  if (!/^https:\/\//.test(out))
    throw new ApiError(
      ErrorType.enum.LessonNotPrintable,
      "a picture in the lesson has no address the print can fetch",
    );
  return out;
}

/** The sheet's id: the sha256 of its JSON, which the builder writes in one fixed key order. */
function printIdOf(sheet: PrintSheet): PrintId {
  return createHash("sha256").update(JSON.stringify(sheet)).digest("hex");
}

/** Where a print stands, from the objects in the bucket; undefined when no route made it. */
async function statusOf(
  bucket: PrintBucket,
  pod: PodId,
  id: PrintId,
  now: Date,
): Promise<PrintStatus | undefined> {
  const at = base(pod, id);
  if (await bucket.has(`${at}.pdf`))
    return {
      status: "ready",
      print_id: id,
      url: await bucket.presignGet(`${at}.pdf`, LINK_S),
      expires_at: new Date(now.getTime() + LINK_S * 1000).toISOString(),
    };
  const error = await bucket.text(`${at}.error.json`);
  if (error !== undefined) {
    const parsed = PrintFailure.safeParse((JSON.parse(error) as { code?: unknown }).code);
    return {
      status: "failed",
      print_id: id,
      reason: parsed.success ? parsed.data : "render_failed",
    };
  }
  if (await bucket.has(`${at}.json`)) return { status: "pending", print_id: id };
  return undefined;
}

function ready(deps: PrintDeps): { bucket: PrintBucket; start: StartPrint } {
  if (deps.bucket === undefined || deps.start === undefined)
    throw new ApiError(ErrorType.enum.PrintUnavailable, "printing is not set up here");
  return { bucket: deps.bucket, start: deps.start };
}

/** `POST /api/v1/conversations/{id}/prints`. */
export async function startPrint(
  store: Store,
  deps: PrintDeps,
  claims: Claims,
  conversationId: ConversationId,
  body: unknown,
): Promise<PrintStatus> {
  const parsed = PrintStart.safeParse(body ?? {});
  if (!parsed.success) throw badRequest(parsed.error.issues);
  const { pod } = await authorizeMember(store, claims);
  const { compiled } = await checkedLesson(store, pod, conversationId, parsed.data.revision);
  let sheet: PrintSheet;
  try {
    sheet = buildPrintSheet({
      title: compiled.lesson.title,
      language: compiled.lesson.language,
      questions: compiled.questions,
      media: (src) => printMediaSrc(src, deps.media),
    });
  } catch (e) {
    if (e instanceof LessonNotPrintable)
      throw new ApiError(
        ErrorType.enum.LessonNotPrintable,
        `the lesson has no question that prints on paper: ${e.questionTypes.join(", ")}`,
      );
    throw e;
  }
  const { bucket, start } = ready(deps);
  const id = printIdOf(sheet);
  const now = deps.now();
  const known = await statusOf(bucket, pod, id, now);
  if (known?.status === "ready" || known?.status === "failed") return known;
  // Pending starts the Lambda again: a start that failed (a throttle, a missing grant) or a render
  // that timed out before writing anything would otherwise stay pending for good. The Lambda
  // returns at once when the PDF is already there, so a second start costs nothing.
  const key = `${base(pod, id)}.json`;
  if (known === undefined) await bucket.put(key, JSON.stringify(sheet), "application/json");
  await start(await bucket.name(), key);
  return { status: "pending", print_id: id };
}

/** `GET /api/v1/prints/{id}`: another pod's print, or one never started, is 404. */
export async function getPrint(
  store: Store,
  deps: PrintDeps,
  claims: Claims,
  id: PrintId,
): Promise<PrintStatus> {
  const { pod } = await authorizeMember(store, claims);
  const { bucket } = ready(deps);
  const status = await statusOf(bucket, pod, id, deps.now());
  if (status === undefined) throw new ApiError(ErrorType.enum.NotFound, "no such print");
  return status;
}

/** The print routes' bucket in the Lambda: the uploads bucket, by the same name lookup. */
export function s3Prints(
  client: S3Client = new S3Client({}),
  read: ReadParameter = readSsm,
): PrintBucket {
  let name: Promise<string> | undefined;
  const bucket = (): Promise<string> => {
    name ??= uploadsBucket(read).then((value) => {
      if (value === undefined)
        throw new ApiError(ErrorType.enum.PrintUnavailable, "printing is not set up here");
      return value;
    });
    name.catch(() => {
      name = undefined;
    });
    return name;
  };
  const missing = (e: unknown) =>
    e instanceof Error && (e.name === "NotFound" || e.name === "NoSuchKey");
  return {
    name: bucket,
    async has(key) {
      try {
        await client.send(new HeadObjectCommand({ Bucket: await bucket(), Key: key }));
        return true;
      } catch (e) {
        if (missing(e)) return false;
        throw e;
      }
    },
    async text(key) {
      try {
        const got = await client.send(new GetObjectCommand({ Bucket: await bucket(), Key: key }));
        return await got.Body?.transformToString();
      } catch (e) {
        if (missing(e)) return undefined;
        throw e;
      }
    },
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: await bucket(),
          Key: key,
          Body: body,
          ContentType: contentType,
          Tagging: "kind=print",
        }),
      );
    },
    async presignGet(key, expiresInS) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: await bucket(), Key: key }), {
        expiresIn: expiresInS,
      });
    },
  };
}

/** The client the print Lambda is invoked through: `LambdaClient` in the Lambda, a fake in tests. */
export interface PrintClient {
  send(command: InvokeCommand): Promise<unknown>;
}

/**
 * The start in the Lambda: an async invoke (`InvocationType: "Event"`) of `PRINT_FUNCTION` with
 * `{"bucket", "key"}`, nothing else. Undefined when the variable is unset: no printing here.
 */
export function lambdaPrint(
  arn = printFunction(),
  client: PrintClient = new LambdaClient({}),
): StartPrint | undefined {
  if (arn === undefined) return undefined;
  return async (bucket, key) => {
    await client.send(
      new InvokeCommand({
        FunctionName: arn,
        InvocationType: "Event",
        Payload: new TextEncoder().encode(JSON.stringify({ bucket, key })),
      }),
    );
  };
}
