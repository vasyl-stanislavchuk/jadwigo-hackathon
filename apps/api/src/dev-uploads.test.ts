// make dev-all's uploads stand-in (dl-z5ja.11.19): the folder bucket and the form post and links
// serve.ts answers, on a temp folder and a pinned clock. No network: each request is built in code.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEV_UPLOADS_PATH, devUploads, fsUploads, handleDevUpload, pathOf } from "./dev-uploads.ts";

const NOW = Date.UTC(2026, 10, 3, 12);
const BASE = "http://127.0.0.1:3999";
const ORIGIN = "http://127.0.0.1:8999";
const KEY = "pending/pod_made_up/atch_1";
const BYTES = new TextEncoder().encode("synthetic photo bytes");

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "dev-uploads-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function post(fields: Record<string, string>, file: Blob, origin = ORIGIN): Request {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.append(k, v);
  body.append("file", file, "page.jpg");
  return new Request(`${BASE}${DEV_UPLOADS_PATH}`, { method: "POST", body, headers: { origin } });
}

describe("the uploads stand-in (dl-z5ja.11.19)", () => {
  it("takes a signed form post, then serves a signed link with the copy's type", async () => {
    const dev = devUploads(root, BASE, "made-up-secret");
    const bucket = fsUploads(dev, () => NOW);
    const form = await bucket.presignPost(KEY, "image/jpeg", BYTES.length, 600);
    expect(form.url).toBe(`${BASE}${DEV_UPLOADS_PATH}`);
    const reply = await handleDevUpload(
      dev,
      post(form.fields, new Blob([BYTES], { type: "image/jpeg" })),
      () => NOW,
    );
    expect(reply.status).toBe(204);
    expect(reply.headers["access-control-allow-origin"]).toBe(ORIGIN);
    expect(await bucket.size(KEY)).toBe(BYTES.length);
    expect(await bucket.head(KEY, 9)).toEqual(BYTES.slice(0, 9));
    expect(await bucket.range(KEY, 4, 8)).toEqual(BYTES.slice(4, 9));

    const stored = "pods/pod_made_up/attachments/atch_1.jpg";
    await bucket.copy(KEY, stored, "image/jpeg", "inline");
    expect(new Uint8Array(await readFile(join(root, stored)))).toEqual(BYTES);
    const link = new URL(await bucket.presignGet(stored, 300));
    const got = await handleDevUpload(dev, new Request(link), () => NOW);
    expect(got.status).toBe(200);
    expect(got.headers["content-type"]).toBe("image/jpeg");
    expect(got.headers["content-disposition"]).toBe("inline");
    expect(got.body).toEqual(BYTES);

    await bucket.remove([KEY, stored]);
    expect(await bucket.size(KEY)).toBeUndefined();
    expect(await bucket.head(stored, 4)).toBeUndefined();
  });

  it("refuses a post S3 would refuse, with the Code the web reads", async () => {
    const dev = devUploads(root, BASE, "made-up-secret");
    const bucket = fsUploads(dev, () => NOW);
    const form = await bucket.presignPost(KEY, "image/jpeg", BYTES.length, 600);
    const jpeg = (bytes: Uint8Array) => new Blob([bytes], { type: "image/jpeg" });
    const code = async (request: Request, at = NOW) => {
      const reply = await handleDevUpload(dev, request, () => at);
      return /<Code>([^<]*)<\/Code>/.exec(String(reply.body))?.[1];
    };
    expect(await code(post(form.fields, jpeg(new Uint8Array(BYTES.length + 1))))).toBe(
      "EntityTooLarge",
    );
    expect(await code(post(form.fields, jpeg(BYTES.slice(1))))).toBe("EntityTooSmall");
    expect(await code(post(form.fields, jpeg(BYTES)), NOW + 601_000)).toBe("AccessDenied");
    expect(await code(post({ ...form.fields, "x-bytes": "1" }, jpeg(BYTES)))).toBe("AccessDenied");
    expect(await code(post(form.fields, new Blob([BYTES], { type: "image/png" })))).toBe(
      "AccessDenied",
    );
    expect(await bucket.size(KEY)).toBeUndefined();
  });

  it("refuses a link past its time or with another key, and a key out of the folder", async () => {
    const dev = devUploads(root, BASE, "made-up-secret");
    const bucket = fsUploads(dev, () => NOW);
    const link = new URL(await bucket.presignGet(KEY, 300));
    expect((await handleDevUpload(dev, new Request(link), () => NOW + 301_000)).status).toBe(403);
    link.pathname = `${DEV_UPLOADS_PATH}/pending/pod_made_up/atch_2`;
    expect((await handleDevUpload(dev, new Request(link), () => NOW)).status).toBe(403);
    expect(() => pathOf(root, "../outside")).toThrow(/under the folder/);
    expect(() => pathOf(root, "/etc/hosts")).toThrow(/under the folder/);
    await expect(bucket.presignPost("../x", "image/jpeg", 1, 600)).rejects.toThrow();
  });

  it("gives CORS only to a page on this machine", async () => {
    const dev = devUploads(root, BASE, "made-up-secret");
    const preflight = (origin: string) =>
      handleDevUpload(
        dev,
        new Request(`${BASE}${DEV_UPLOADS_PATH}`, { method: "OPTIONS", headers: { origin } }),
        () => NOW,
      );
    expect((await preflight(ORIGIN)).headers["access-control-allow-origin"]).toBe(ORIGIN);
    expect((await preflight("https://elsewhere.example")).headers).toEqual({});
  });
});
