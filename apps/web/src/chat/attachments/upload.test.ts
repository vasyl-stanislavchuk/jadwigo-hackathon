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
  prepare,
  qualities,
  RefusedError,
} from "./upload.ts";

const MB = 1024 * 1024;

describe("prepare", () => {
  it("yields image/jpeg with the long edge capped and the first quality that fits", async () => {
    const { deps, canvas } = harness({ decoded: picture(4032, 3024) });
    const out = await prepare(fileOf("IMG_0001.png", "image/png"), deps);
    expect(out.blob.type).toBe("image/jpeg");
    expect(Math.max(out.width ?? 0, out.height ?? 0)).toBe(LIMITS.attachmentEdgePx);
    expect(out).toMatchObject({ width: 2000, height: 1500 });
    expect(canvas.drawn).toEqual([{ width: 2000, height: 1500 }]);
    expect(canvas.tried).toEqual([0.85]);
    expect(out.blob.size).toBeLessThanOrEqual(LIMITS.attachmentBytes);
  });

  it("lowers the quality until the JPEG is within the byte limit", async () => {
    const { deps, canvas } = harness({ sizeAt: (q) => (q > 0.6 ? 5 * MB : 3 * MB) });
    const out = await prepare(fileOf("scan.jpg", "image/jpeg"), deps);
    expect(canvas.tried).toEqual([0.85, 0.75, 0.65, 0.55]);
    expect(out.blob.size).toBe(3 * MB);
    expect(out.blob.size).toBeLessThanOrEqual(LIMITS.attachmentBytes);
  });

  it("never scales a small picture up", async () => {
    const { deps } = harness({ decoded: picture(800, 1200) });
    expect(await prepare(fileOf("a.jpg", "image/jpeg"), deps)).toMatchObject({
      width: 800,
      height: 1200,
    });
  });

  it("refuses a photo that stays over the limit at the lowest quality", async () => {
    const { deps, canvas } = harness({ sizeAt: () => 5 * MB });
    await expect(prepare(fileOf("huge.jpg", "image/jpeg"), deps)).rejects.toEqual(
      new RefusedError("attach_too_large"),
    );
    expect(canvas.tried).toEqual(qualities());
  });

  it("re-encodes a HEIC the browser decodes (Safari) to a JPEG", async () => {
    const { deps } = harness({ decoded: picture(3024, 4032) });
    const out = await prepare(fileOf("IMG_0002.HEIC", ""), deps);
    expect(out.blob.type).toBe("image/jpeg");
    expect(out).toMatchObject({ width: 1500, height: 2000 });
  });

  it("keeps a HEIC the browser cannot read as it is, for the server to convert", async () => {
    const { deps, canvas } = harness({ decoded: null });
    const out = await prepare(fileOf("IMG_0003.heic", "image/heic", 64), deps);
    expect(out).toMatchObject({
      media_type: "image/heic",
      document: { name: "IMG_0003.heic", kind: "heic" },
    });
    expect(out.width).toBeUndefined();
    expect(out.blob.size).toBe(64);
    expect(canvas.drawn).toEqual([]);
  });

  it("refuses any other file the browser cannot decode with its own sentence", async () => {
    const { deps } = harness({ decoded: null });
    await expect(prepare(fileOf("notes.txt", "text/plain"), deps)).rejects.toEqual(
      new RefusedError("attach_unreadable"),
    );
  });
});

describe("the synthetic HEIC fixture", () => {
  // A 48 x 32 gradient made in code and saved as HEIC with sips; never a photo.
  const bytes = readFileSync(join(import.meta.dirname, "fixtures/gradient-48x32.heic"));
  const heic = (name: string, type: string) => new File([bytes], name, { type });

  it("on a decoder that cannot read it (Chrome, Firefox, Android) uploads as image/heic", async () => {
    const h = harness({ decoded: null });
    const upload = new PhotoUpload(heic("IMG_0007.heic", ""), h.deps);
    const done = upload.start();
    await settle();
    h.xhrs[0]?.answer(204);
    expect(await done).toMatch(/^atch_/);
    expect(h.api.bodies).toEqual([
      {
        event_id: expect.any(String),
        media_type: "image/heic",
        bytes: bytes.length,
        name: "IMG_0007.heic",
      },
    ]);
    const posted = h.xhrs[0]?.body?.get("file") as File | undefined;
    expect(posted?.type).toBe("image/heic");
    expect(posted?.size).toBe(bytes.length);
    expect(h.xhrs[0]?.body?.get("Content-Type")).toBe("image/heic");
    expect(upload.get()).toMatchObject({
      state: "ready",
      preview: null,
      document: { name: "IMG_0007.heic", kind: "heic" },
    });
    expect(h.canvas.drawn).toEqual([]);
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

describe("documents", () => {
  const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  for (const [name, type, media, kind] of [
    ["Karta pracy.pdf", "application/pdf", "application/pdf", "pdf"],
    ["Zadanie domowe.docx", DOCX, DOCX, "docx"],
    ["Zadanie bez typu.docx", "", DOCX, "docx"],
  ] as const) {
    it(`${name} (${type || "no type"}) uploads as it is, with its name and no re-encode`, async () => {
      const h = harness();
      const upload = new PhotoUpload(fileOf(name, type, 300), h.deps);
      const done = upload.start();
      await settle();
      h.xhrs[0]?.progress(150, 300);
      expect(upload.get().progress).toBe(0.5);
      h.xhrs[0]?.answer(204);
      expect(await done).toMatch(/^atch_/);
      expect(h.api.bodies).toEqual([
        { event_id: expect.any(String), media_type: media, bytes: 300, name },
      ]);
      const posted = h.xhrs[0]?.body?.get("file") as File | undefined;
      expect(posted?.type).toBe(media);
      expect(posted?.name).toBe(name);
      expect(h.canvas.drawn).toEqual([]);
      expect(upload.get()).toMatchObject({
        state: "ready",
        preview: null,
        document: { name, kind },
      });
    });
  }

  it("a document over LIMITS.documentBytes is refused, with no Retry and no slot", async () => {
    const h = harness();
    const big = fileOf("Skan.pdf", "application/pdf", LIMITS.documentBytes + 1);
    const upload = new PhotoUpload(big, h.deps);
    await upload.start();
    expect(upload.get()).toMatchObject({
      state: "refused",
      reason: "attach_document_too_large",
      document: { name: "Skan.pdf", kind: "pdf" },
    });
    await upload.retry();
    expect(upload.get().state).toBe("refused");
    expect(h.api.bodies).toEqual([]);
  });

  it("a document of exactly LIMITS.documentBytes goes up", async () => {
    const h = harness();
    const upload = new PhotoUpload(
      fileOf("Skan.pdf", "application/pdf", LIMITS.documentBytes),
      h.deps,
    );
    void upload.start();
    await settle();
    expect(h.api.bodies[0]?.bytes).toBe(LIMITS.documentBytes);
  });

  it("a name longer than the api keeps is cut to 120 characters", async () => {
    const h = harness();
    const name = `${"a".repeat(200)}.pdf`;
    void new PhotoUpload(fileOf(name, "application/pdf"), h.deps).start();
    await settle();
    expect(h.api.bodies[0]?.name).toHaveLength(120);
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

  it("a file that is no picture and no document is refused, and Retry does nothing", async () => {
    const h = harness({ decoded: null });
    const upload = new PhotoUpload(fileOf("notes.txt", "text/plain"), h.deps);
    await upload.start();
    expect(upload.get()).toMatchObject({ state: "refused", reason: "attach_unreadable" });
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
