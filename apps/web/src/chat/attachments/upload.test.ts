import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ApiError } from "@jadwigo/api-client";
import { LIMITS } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { fileOf, harness, picture, settle } from "./fakes.test-helpers.ts";
import {
  admit,
  bucketReason,
  fitEdge,
  isHeif,
  PhotoUpload,
  qualities,
  RefusedError,
  reencode,
} from "./upload.ts";

const MB = 1024 * 1024;

describe("reencode", () => {
  it("yields image/jpeg with the long edge capped and the first quality that fits", async () => {
    const { deps, canvas } = harness({ decoded: picture(4032, 3024) });
    const out = await reencode(fileOf("IMG_0001.png", "image/png"), deps);
    expect(out.blob.type).toBe("image/jpeg");
    expect(Math.max(out.width, out.height)).toBe(LIMITS.attachmentEdgePx);
    expect(out).toMatchObject({ width: 2000, height: 1500 });
    expect(canvas.drawn).toEqual([{ width: 2000, height: 1500 }]);
    expect(canvas.tried).toEqual([0.85]);
    expect(out.blob.size).toBeLessThanOrEqual(LIMITS.attachmentBytes);
  });

  it("lowers the quality until the JPEG is within the byte limit", async () => {
    const { deps, canvas } = harness({ sizeAt: (q) => (q > 0.6 ? 5 * MB : 3 * MB) });
    const out = await reencode(fileOf("scan.jpg", "image/jpeg"), deps);
    expect(canvas.tried).toEqual([0.85, 0.75, 0.65, 0.55]);
    expect(out.blob.size).toBe(3 * MB);
    expect(out.blob.size).toBeLessThanOrEqual(LIMITS.attachmentBytes);
  });

  it("never scales a small picture up", async () => {
    const { deps } = harness({ decoded: picture(800, 1200) });
    expect(await reencode(fileOf("a.jpg", "image/jpeg"), deps)).toMatchObject({
      width: 800,
      height: 1200,
    });
  });

  it("refuses a photo that stays over the limit at the lowest quality", async () => {
    const { deps, canvas } = harness({ sizeAt: () => 5 * MB });
    await expect(reencode(fileOf("huge.jpg", "image/jpeg"), deps)).rejects.toEqual(
      new RefusedError("attach_too_large"),
    );
    expect(canvas.tried).toEqual(qualities());
  });

  it("re-encodes a HEIC the browser decodes (Safari) to a JPEG", async () => {
    const { deps } = harness({ decoded: picture(3024, 4032) });
    const out = await reencode(fileOf("IMG_0002.HEIC", ""), deps);
    expect(out.blob.type).toBe("image/jpeg");
    expect(out).toMatchObject({ width: 1500, height: 2000 });
  });

  it("refuses a HEIC the browser cannot read with the HEIC sentence", async () => {
    const { deps } = harness({ decoded: null });
    await expect(reencode(fileOf("broken.heic", "image/heic"), deps)).rejects.toEqual(
      new RefusedError("attach_heic"),
    );
  });

  it("refuses any other file the browser cannot decode with its own sentence", async () => {
    const { deps } = harness({ decoded: null });
    await expect(reencode(fileOf("notes.txt", "text/plain"), deps)).rejects.toEqual(
      new RefusedError("attach_unreadable"),
    );
  });
});

describe("the synthetic HEIC fixture", () => {
  // A 48 x 32 gradient made in code and saved as HEIC with sips; never a photo.
  const bytes = readFileSync(join(import.meta.dirname, "fixtures/gradient-48x32.heic"));
  const heic = (name: string, type: string) => new File([bytes], name, { type });

  it("on a decoder that cannot read it (Chrome, Firefox, Android) is refused, with no Retry", async () => {
    const h = harness({ decoded: null });
    const upload = new PhotoUpload(heic("IMG_0007.heic", "image/heic"), h.deps);
    await upload.start();
    expect(upload.get()).toMatchObject({ state: "refused", reason: "attach_heic" });
    await upload.retry();
    expect(upload.get().state).toBe("refused");
    expect(h.api.bodies).toEqual([]);
  });

  it("on a decoder that reads it (Safari, through the port) re-encodes to JPEG and uploads", async () => {
    const h = harness();
    const read: Blob[] = [];
    h.deps.decode = async (file) => {
      read.push(file);
      return picture(48, 32);
    };
    const upload = new PhotoUpload(heic("IMG_0008.HEIC", ""), h.deps);
    const done = upload.start();
    await settle();
    expect(read[0]?.size).toBe(bytes.length);
    h.xhrs[0]?.answer(204);
    expect(await done).toMatch(/^atch_/);
    expect(h.api.bodies[0]).toMatchObject({ media_type: "image/jpeg", width: 48, height: 32 });
    expect((h.xhrs[0]?.body?.get("file") as File | undefined)?.type).toBe("image/jpeg");
  });
});

describe("PhotoUpload", () => {
  it("creates a slot for the JPEG, posts the fields then the file, and reports progress", async () => {
    const h = harness();
    const upload = new PhotoUpload(fileOf("IMG_0004.jpg", "image/jpeg"), h.deps);
    const seen: number[] = [];
    upload.subscribe(() => seen.push(upload.get().progress));
    const done = upload.start();
    await settle();

    expect(h.api.bodies).toEqual([
      {
        event_id: expect.any(String),
        media_type: "image/jpeg",
        bytes: 1000,
        width: 2000,
        height: 1500,
      },
    ]);
    const xhr = h.xhrs[0];
    if (!xhr?.body) throw new Error("nothing was posted");
    expect(xhr.url).toBe("https://uploads.invalid/");
    const names = [...xhr.body.keys()];
    expect(names).toEqual(["key", "Content-Type", "policy", "file"]);
    expect((xhr.body.get("file") as File).type).toBe("image/jpeg");

    xhr.progress(250, 1000);
    xhr.progress(1000, 1000);
    xhr.answer(204);
    const id = await done;
    expect(id).toMatch(/^atch_/);
    expect(seen).toContain(0.25);
    expect(upload.get()).toMatchObject({
      state: "ready",
      progress: 1,
      attachmentId: id,
      preview: "blob:photo-1",
    });
  });

  it("a failed POST is failed with Retry, and the retry takes a new slot under a new event id", async () => {
    const h = harness();
    const upload = new PhotoUpload(fileOf("IMG_0005.jpg", "image/jpeg"), h.deps);
    const first = upload.start();
    await settle();
    h.xhrs[0]?.answer(
      403,
      "<Error><Code>AccessDenied</Code><Message>Invalid according to Policy: Policy expired.</Message></Error>",
    );
    expect(await first).toBeNull();
    expect(upload.get()).toMatchObject({ state: "failed", reason: "attach_expired" });

    const second = upload.retry();
    await settle();
    h.xhrs[1]?.answer(204);
    const id = await second;
    expect(h.api.bodies).toHaveLength(2);
    expect(h.api.bodies[1]?.event_id).not.toBe(h.api.bodies[0]?.event_id);
    expect(h.xhrs[1]?.body?.get("policy")).toBe("p2");
    expect(upload.get()).toMatchObject({ state: "ready", attachmentId: id });
    expect(h.canvas.drawn).toHaveLength(1);
  });

  it("a dropped connection is failed with the offline sentence", async () => {
    const h = harness();
    const upload = new PhotoUpload(fileOf("a.jpg", "image/jpeg"), h.deps);
    const done = upload.start();
    await settle();
    h.xhrs[0]?.drop();
    await done;
    expect(upload.get()).toMatchObject({ state: "failed", reason: "attach_offline" });
  });

  it("a truncated HEIC the browser cannot read is refused, and Retry does nothing", async () => {
    const h = harness({ decoded: null });
    const upload = new PhotoUpload(fileOf("IMG_0006.heic", "image/heic"), h.deps);
    await upload.start();
    expect(upload.get()).toMatchObject({ state: "refused", reason: "attach_heic" });
    await upload.retry();
    expect(h.api.bodies).toEqual([]);
  });

  it("the pod's daily limit is refused, not failed", async () => {
    const h = harness();
    h.api.refuse = new ApiError("limit", 429, "AttachmentLimitDay");
    const upload = new PhotoUpload(fileOf("a.jpg", "image/jpeg"), h.deps);
    await upload.start();
    expect(upload.get()).toMatchObject({ state: "refused", reason: "attach_limit_day" });
  });

  it("dispose stops the post and revokes the preview", async () => {
    const h = harness();
    const upload = new PhotoUpload(fileOf("a.jpg", "image/jpeg"), h.deps);
    const done = upload.start();
    await settle();
    upload.dispose();
    expect(await done).toBeNull();
    expect(h.xhrs[0]?.aborted).toBe(true);
    expect(h.revoked).toEqual(["blob:photo-1"]);
  });
});

describe("the small rules", () => {
  it("knows a HEIC by its type or its name", () => {
    expect(isHeif({ name: "x.jpg", type: "image/heic" })).toBe(true);
    expect(isHeif({ name: "x.jpg", type: "image/heif-sequence" })).toBe(true);
    expect(isHeif({ name: "IMG.HEIF", type: "" })).toBe(true);
    expect(isHeif({ name: "x.jpg", type: "image/jpeg" })).toBe(false);
  });

  it("fits the long edge", () => {
    expect(fitEdge(6000, 1000)).toEqual({ width: 2000, height: 333 });
    expect(fitEdge(10, 9000)).toEqual({ width: 2, height: 2000 });
  });

  it("maps S3's XML errors to sentences", () => {
    const xml = (code: string, message = "") =>
      `<Error><Code>${code}</Code><Message>${message}</Message></Error>`;
    expect(bucketReason(400, xml("EntityTooLarge"))).toBe("attach_changed");
    expect(bucketReason(400, xml("EntityTooSmall"))).toBe("attach_changed");
    expect(bucketReason(400, xml("ExpiredToken"))).toBe("attach_expired");
    expect(
      bucketReason(403, xml("AccessDenied", "Invalid according to Policy: Policy expired.")),
    ).toBe("attach_expired");
    expect(bucketReason(403, xml("AccessDenied", "Invalid according to Policy"))).toBe(
      "attach_not_taken",
    );
    expect(bucketReason(503, "")).toBe("attach_not_taken");
    expect(bucketReason(0, "")).toBe("attach_offline");
  });

  it("admits up to the per-message limit and counts the rest", () => {
    const files = Array.from({ length: 4 }, (_, i) => fileOf(`${i}.jpg`, "image/jpeg"));
    expect(admit(8, files)).toMatchObject({ leftOff: 2 });
    expect(admit(8, files).admitted).toHaveLength(2);
    expect(admit(10, files)).toMatchObject({ admitted: [], leftOff: 4 });
    expect(admit(0, files)).toMatchObject({ leftOff: 0 });
  });
});
