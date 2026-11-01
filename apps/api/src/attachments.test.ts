// A message's photos (dl-z5ja.11.3): the route suite on InMemoryStore, the JPEG check on synthetic
// bytes, and the S3 adapter with its client stubbed, so no call leaves the machine.
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { RunStepInput } from "@jadwigo/contracts";
import { InMemoryRunQueue } from "@jadwigo/jadwigo-ai";
import { InMemoryStore } from "@jadwigo/store";
import { describe, expect, it, vi } from "vitest";
import { HEAD_BYTES, jpegHasNoExif, s3Uploads } from "./attachments.ts";
import { attachmentSuite } from "./testing/attachments.suite.ts";
import { syntheticJpeg, syntheticPng } from "./testing/uploads.ts";

attachmentSuite(
  "InMemoryStore",
  () => new InMemoryStore(),
  () => {
    const queue = new InMemoryRunQueue(() => new Date());
    const sent: RunStepInput[] = [];
    return {
      queue: {
        send: (message, delay_s) => {
          sent.push(message);
          return queue.send(message, delay_s);
        },
        read: (vt_s, qty) => queue.read(vt_s, qty),
        archive: (msg_id) => queue.archive(msg_id),
        deadLetters: () => queue.deadLetters(),
      },
      stepsFor: async (run) => sent.filter((m) => m.run_id === run).length,
    };
  },
);

const bytes = (...values: number[]) => Uint8Array.from(values);
const SOI = [0xff, 0xd8];
const SOS = [0xff, 0xda, 0x00, 0x02];
const APP0 = [0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46];

describe("jpegHasNoExif", () => {
  it("takes a JPEG whose headers reach the pixels with no APP1 segment", () => {
    expect(jpegHasNoExif(syntheticJpeg(512))).toBe(true);
    expect(jpegHasNoExif(bytes(...SOI, ...APP0, ...SOS))).toBe(true);
    // A quantization table and fill bytes before a marker are headers like any other.
    expect(jpegHasNoExif(bytes(...SOI, 0xff, 0xdb, 0x00, 0x03, 0x00, 0xff, 0xff, ...SOS))).toBe(
      true,
    );
  });

  it("refuses an Exif APP1, and an XMP one, wherever it sits before the pixels", () => {
    expect(jpegHasNoExif(syntheticJpeg(512, { exif: true }))).toBe(false);
    const exif = [0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
    expect(jpegHasNoExif(bytes(...SOI, ...exif, ...SOS))).toBe(false);
    expect(jpegHasNoExif(bytes(...SOI, ...APP0, ...exif, ...SOS))).toBe(false);
    const xmp = [0xff, 0xe1, 0x00, 0x05, 0x68, 0x74, 0x74];
    expect(jpegHasNoExif(bytes(...SOI, ...xmp, ...SOS))).toBe(false);
  });

  it("refuses what is not a JPEG: a PNG, nothing, a bare SOI, text", () => {
    expect(jpegHasNoExif(syntheticPng(512))).toBe(false);
    expect(jpegHasNoExif(new Uint8Array())).toBe(false);
    expect(jpegHasNoExif(bytes(...SOI))).toBe(false);
    expect(jpegHasNoExif(new TextEncoder().encode("<svg></svg>"))).toBe(false);
  });

  it("refuses headers that do not reach the pixels, or that break", () => {
    // An APP0 longer than the bytes read: its end, and so the start of the pixels, is past them.
    expect(jpegHasNoExif(bytes(...SOI, 0xff, 0xe0, 0xff, 0xff, 0x00))).toBe(false);
    // A length cut off, a length under 2, a byte where a marker belongs, an end before the pixels.
    expect(jpegHasNoExif(bytes(...SOI, 0xff, 0xe0, 0x00))).toBe(false);
    expect(jpegHasNoExif(bytes(...SOI, 0xff, 0xe0, 0x00, 0x01, ...SOS))).toBe(false);
    expect(jpegHasNoExif(bytes(...SOI, 0x00, ...SOS))).toBe(false);
    expect(jpegHasNoExif(bytes(...SOI, 0xff, 0xd9))).toBe(false);
  });

  it("reads within the first 64 KB", () => {
    expect(HEAD_BYTES).toBe(65_536);
  });
});

describe("s3Uploads", () => {
  /** A real client with made-up credentials: presigning signs locally and sends nothing. */
  function client() {
    return new S3Client({
      region: "eu-central-1",
      credentials: { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "secret" },
    });
  }

  it("signs a form bound to the key, the type and the exact size, in the named bucket", async () => {
    vi.stubEnv("UPLOADS_BUCKET", "jadwigo-uploads-test");
    try {
      const form = await s3Uploads(client(), vi.fn()).presignPost(
        "pending/pod_x/atch_y",
        "image/jpeg",
        4096,
        600,
      );
      expect(form.url).toContain("jadwigo-uploads-test");
      expect(form.fields).toMatchObject({
        key: "pending/pod_x/atch_y",
        "Content-Type": "image/jpeg",
      });
      const policy = JSON.parse(Buffer.from(form.fields["Policy"] ?? "", "base64").toString());
      expect(policy.conditions).toEqual(
        expect.arrayContaining([
          ["eq", "$Content-Type", "image/jpeg"],
          ["content-length-range", 4096, 4096],
          { key: "pending/pod_x/atch_y" },
          { bucket: "jadwigo-uploads-test" },
        ]),
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("signs a link that reads the key, and answers a missing object's size as undefined", async () => {
    const s3 = client();
    const send = vi.spyOn(s3, "send").mockImplementation(async (command: unknown) => {
      if (command instanceof HeadObjectCommand)
        throw Object.assign(new Error("Forbidden"), { $metadata: { httpStatusCode: 403 } });
      throw new Error("unexpected");
    });
    const uploads = s3Uploads(s3, async () => "jadwigo-uploads-from-ssm");
    const url = await uploads.presignGet("pods/pod_x/attachments/atch_y.jpg", 300);
    expect(url).toContain("jadwigo-uploads-from-ssm");
    expect(url).toContain("pods/pod_x/attachments/atch_y.jpg");
    expect(url).toContain("X-Amz-Expires=300");
    expect(await uploads.size("pending/pod_x/atch_y")).toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("fails a call when no bucket is named, and reads the name again next time", async () => {
    const read = vi.fn<(name: string) => Promise<string | undefined>>();
    read.mockResolvedValueOnce(undefined).mockResolvedValueOnce("jadwigo-uploads-late");
    const uploads = s3Uploads(client(), read);
    await expect(uploads.presignGet("k", 300)).rejects.toThrow(/UPLOADS_BUCKET/);
    expect(await uploads.presignGet("k", 300)).toContain("jadwigo-uploads-late");
  });
});
