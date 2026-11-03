// The uploads bucket on this machine (dl-z5ja.11.19): `make dev-all` has no S3, so the photo routes
// keep their files in a folder (LOCAL_UPLOADS_DIR, `.logs/dev/uploads`) and serve.ts answers the
// browser's form post and the link a thread opens at /__uploads, as S3 would. Local only: the
// Lambda keeps `s3Uploads`, and nothing here is imported by index.ts.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, open, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { UploadsBucket } from "./attachments.ts";

/** Where serve.ts answers the form post and the links. */
export const DEV_UPLOADS_PATH = "/__uploads";

/** What a stored copy is served as: the type and disposition `copy` set, as S3 keeps them. */
interface Meta {
  contentType: string;
  disposition?: "inline" | "attachment";
}

/** The folder, the base URL the browser reaches serve.ts on, and the key the forms are signed with. */
export interface DevUploads {
  readonly root: string;
  readonly baseUrl: string;
  readonly secret: string;
}

/** A fresh signing key: per process, so a form or link outlives no restart. */
export function devUploads(
  root: string,
  baseUrl: string,
  secret = randomBytes(32).toString("hex"),
) {
  return { root: resolve(root), baseUrl, secret } satisfies DevUploads;
}

/** The file for `key` under the folder; a key that climbs out of it, or is absolute, is refused. */
export function pathOf(root: string, key: string): string {
  if (key === "" || isAbsolute(key) || key.split("/").includes(".."))
    throw new Error("dev uploads: a key is a relative path under the folder");
  const path = resolve(root, key);
  const rel = relative(root, path);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel))
    throw new Error("dev uploads: a key is a relative path under the folder");
  return path;
}

const metaOf = (path: string) => `${path}.meta.json`;

function sign(secret: string, ...parts: readonly string[]): string {
  return createHmac("sha256", secret).update(parts.join("\n")).digest("hex");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function readOrUndefined(path: string): Promise<Buffer | undefined> {
  try {
    return await readFile(path);
  } catch (error) {
    if ((error as { code?: unknown }).code === "ENOENT") return undefined;
    throw error;
  }
}

/** `UploadsBucket` over the folder: the same calls `s3Uploads` makes, on files. */
export function fsUploads(dev: DevUploads, now: () => number = Date.now): UploadsBucket {
  const { root, baseUrl, secret } = dev;
  const range = async (key: string, start: number, end: number) => {
    let file: Awaited<ReturnType<typeof open>>;
    try {
      file = await open(pathOf(root, key), "r");
    } catch (error) {
      if ((error as { code?: unknown }).code === "ENOENT") return undefined;
      throw error;
    }
    try {
      const out = Buffer.alloc(Math.max(0, end - start + 1));
      const { bytesRead } = await file.read(out, 0, out.length, start);
      return new Uint8Array(out.subarray(0, bytesRead));
    } finally {
      await file.close();
    }
  };
  return {
    async presignPost(key, contentType, bytes, expiresInS) {
      pathOf(root, key);
      const expires = String(Math.floor(now() / 1000) + expiresInS);
      const size = String(bytes);
      return {
        url: `${baseUrl}${DEV_UPLOADS_PATH}`,
        fields: {
          key,
          "Content-Type": contentType,
          "x-bytes": size,
          "x-expires": expires,
          "x-sig": sign(secret, "post", key, contentType, size, expires),
        },
      };
    },
    async size(key) {
      try {
        return (await stat(pathOf(root, key))).size;
      } catch (error) {
        if ((error as { code?: unknown }).code === "ENOENT") return undefined;
        throw error;
      }
    },
    head: (key, bytes) => range(key, 0, bytes - 1),
    range,
    async copy(from, to, contentType, disposition) {
      const bytes = await readOrUndefined(pathOf(root, from));
      if (bytes === undefined) throw new Error("dev uploads: no object to copy");
      const target = pathOf(root, to);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, bytes);
      await writeFile(metaOf(target), JSON.stringify({ contentType, disposition } satisfies Meta));
    },
    async remove(keys) {
      for (const key of keys) {
        const path = pathOf(root, key);
        await rm(path, { force: true });
        await rm(metaOf(path), { force: true });
      }
    },
    async presignGet(key, expiresInS) {
      pathOf(root, key);
      const expires = String(Math.floor(now() / 1000) + expiresInS);
      const sig = sign(secret, "get", key, expires);
      return `${baseUrl}${DEV_UPLOADS_PATH}/${key}?expires=${expires}&sig=${sig}`;
    },
  };
}

/** What serve.ts writes back. */
export interface DevReply {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array | string;
}

/** S3's refusal shape, whose `<Code>` the web's `bucketReason` reads. */
function refused(status: number, code: string, message: string, cors: Record<string, string>) {
  return {
    status,
    headers: { ...cors, "content-type": "application/xml" },
    body: `<?xml version="1.0" encoding="UTF-8"?><Error><Code>${code}</Code><Message>${message}</Message></Error>`,
  } satisfies DevReply;
}

/** CORS for a page on this machine only: the web dev server's origin is on another port. */
function corsFor(origin: string | undefined): Record<string, string> {
  if (origin === undefined || !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST",
    "access-control-allow-headers": "*",
    vary: "Origin",
  };
}

/**
 * The browser's side of the folder: the form post (`POST /__uploads`, multipart, the file last) and
 * a link (`GET /__uploads/<key>?expires=&sig=`). Each is checked as S3 checks its presigned ones:
 * the signature, the expiry, and for the post the exact size and type the form was minted for.
 */
export async function handleDevUpload(
  dev: DevUploads,
  request: Request,
  now: () => number = Date.now,
): Promise<DevReply> {
  const cors = corsFor(request.headers.get("origin") ?? undefined);
  const url = new URL(request.url);
  const nowS = Math.floor(now() / 1000);
  if (request.method === "OPTIONS") return { status: 204, headers: cors, body: "" };

  if (request.method === "POST" && url.pathname === DEV_UPLOADS_PATH) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return refused(400, "MalformedPOSTRequest", "not a multipart form", cors);
    }
    const field = (name: string) => {
      const value = form.get(name);
      return typeof value === "string" ? value : undefined;
    };
    const key = field("key");
    const type = field("Content-Type");
    const bytes = field("x-bytes");
    const expires = field("x-expires");
    const sig = field("x-sig");
    const file = form.get("file");
    if (
      key === undefined ||
      type === undefined ||
      bytes === undefined ||
      expires === undefined ||
      sig === undefined ||
      file === null ||
      typeof file === "string"
    )
      return refused(400, "InvalidArgument", "the form is missing a field", cors);
    if (!same(sig, sign(dev.secret, "post", key, type, bytes, expires)))
      return refused(403, "AccessDenied", "the form's signature does not match", cors);
    if (Number(expires) < nowS)
      return refused(403, "AccessDenied", "Invalid according to Policy: Policy expired", cors);
    if (file.type !== "" && file.type !== type)
      return refused(403, "AccessDenied", "Policy Condition failed: Content-Type", cors);
    if (file.size > Number(bytes))
      return refused(400, "EntityTooLarge", "the file is larger than the form allows", cors);
    if (file.size < Number(bytes))
      return refused(400, "EntityTooSmall", "the file is smaller than the form allows", cors);
    let path: string;
    try {
      path = pathOf(dev.root, key);
    } catch {
      return refused(400, "InvalidArgument", "the key is outside the folder", cors);
    }
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, new Uint8Array(await file.arrayBuffer()));
    await writeFile(metaOf(path), JSON.stringify({ contentType: type } satisfies Meta));
    return { status: 204, headers: cors, body: "" };
  }

  if (request.method === "GET" && url.pathname.startsWith(`${DEV_UPLOADS_PATH}/`)) {
    const key = decodeURIComponent(url.pathname.slice(DEV_UPLOADS_PATH.length + 1));
    const expires = url.searchParams.get("expires") ?? "";
    const sig = url.searchParams.get("sig") ?? "";
    if (!same(sig, sign(dev.secret, "get", key, expires)) || Number(expires) < nowS)
      return refused(
        403,
        "AccessDenied",
        "Request has expired or its signature does not match",
        cors,
      );
    let path: string;
    try {
      path = pathOf(dev.root, key);
    } catch {
      return refused(400, "InvalidArgument", "the key is outside the folder", cors);
    }
    const body = await readOrUndefined(path);
    if (body === undefined)
      return refused(404, "NoSuchKey", "The specified key does not exist.", cors);
    const raw = await readOrUndefined(metaOf(path));
    const meta: Meta =
      raw === undefined
        ? { contentType: "application/octet-stream" }
        : JSON.parse(raw.toString("utf8"));
    return {
      status: 200,
      headers: {
        ...cors,
        "content-type": meta.contentType,
        ...(meta.disposition === undefined ? {} : { "content-disposition": meta.disposition }),
      },
      body: new Uint8Array(body),
    };
  }

  return refused(405, "MethodNotAllowed", "only the form post and a link", cors);
}
