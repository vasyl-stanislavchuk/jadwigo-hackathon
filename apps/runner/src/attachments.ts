import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { AttachmentReader } from "@jadwigo/jadwigo-ai";
import { type ReadParameter, readSsm, UPLOADS_BUCKET_PARAM, uploadsBucket } from "./config.ts";

/** The client a photo is read through: `S3Client` in the Lambda, a fake in tests. */
export interface GetObjectClient {
  send(
    command: GetObjectCommand,
  ): Promise<{ Body?: { transformToByteArray(): Promise<Uint8Array> } | undefined }>;
}

/**
 * The runner's photo reader (dl-z5ja.11.4): GetObject on the uploads bucket, named by
 * `UPLOADS_BUCKET`, else by the SSM parameter `/jadwigo/uploads/bucket`, read once per cold start
 * (again after a failed read). The engine has already checked the key is under the run's pod's
 * `attachments/`; the runner's role may Get only `pods/*\/attachments/*` (dl-z5ja.11.2). A missing
 * object is undefined, so the model is told the photo could not be read; any other failure throws,
 * and the step is retried.
 */
export function s3Attachments(
  name = uploadsBucket(),
  read: ReadParameter = readSsm,
  client: GetObjectClient = new S3Client({}),
): AttachmentReader {
  let bucket: Promise<string | undefined> | undefined;
  const resolve = (): Promise<string | undefined> => {
    if (name !== undefined) return Promise.resolve(name);
    bucket ??= read(UPLOADS_BUCKET_PARAM).then((value) => value?.trim() || undefined);
    bucket.catch(() => {
      bucket = undefined;
    });
    return bucket;
  };
  return {
    read: async (storage_path) => {
      const Bucket = await resolve();
      if (Bucket === undefined) throw new Error("no uploads bucket: set UPLOADS_BUCKET");
      try {
        const out = await client.send(new GetObjectCommand({ Bucket, Key: storage_path }));
        if (!out.Body) return undefined;
        return await out.Body.transformToByteArray();
      } catch (error) {
        if (missing(error)) return undefined;
        throw error;
      }
    },
  };
}

/**
 * A missing key. With `s3:GetObject` and no `s3:ListBucket`, S3 answers a missing key 403
 * `AccessDenied`, not 404 `NoSuchKey`: both mean no such photo here.
 */
function missing(error: unknown): boolean {
  const e = error as { name?: unknown; $metadata?: { httpStatusCode?: unknown } } | null;
  const status = e?.$metadata?.httpStatusCode;
  return e?.name === "NoSuchKey" || e?.name === "AccessDenied" || status === 404 || status === 403;
}
