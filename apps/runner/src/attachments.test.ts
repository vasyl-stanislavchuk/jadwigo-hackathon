import type { GetObjectCommand } from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";
import { type GetObjectClient, s3Attachments } from "./attachments.ts";

const PATH = "pods/pod_made_up/attachments/atch_1.jpg";
const BYTES = new TextEncoder().encode("synthetic worksheet");

/** A fake S3 that answers one key and records every request. */
function fake(answer: (key: string) => Promise<Uint8Array | undefined>) {
  const asked: { Bucket?: string | undefined; Key?: string | undefined }[] = [];
  const client: GetObjectClient = {
    send: async (command: GetObjectCommand) => {
      asked.push(command.input);
      const bytes = await answer(command.input.Key ?? "");
      return { Body: bytes && { transformToByteArray: () => Promise.resolve(bytes) } };
    },
  };
  return { asked, client };
}

describe("the runner's photo reader (dl-z5ja.11.4)", () => {
  it("reads the key from the bucket UPLOADS_BUCKET names", async () => {
    const s3 = fake(async (key) => (key === PATH ? BYTES : undefined));
    const reader = s3Attachments("made-up-uploads", () => Promise.reject(), s3.client);
    expect(await reader.read(PATH)).toEqual(BYTES);
    expect(s3.asked).toEqual([{ Bucket: "made-up-uploads", Key: PATH }]);
  });

  it("names the bucket from SSM once when UPLOADS_BUCKET is unset", async () => {
    const s3 = fake(async () => BYTES);
    const params: string[] = [];
    const reader = s3Attachments(
      undefined,
      async (name) => {
        params.push(name);
        return " made-up-uploads ";
      },
      s3.client,
    );
    await reader.read(PATH);
    await reader.read(PATH);
    expect(params).toEqual(["/jadwigo/uploads/bucket"]);
    expect(s3.asked.map((a) => a.Bucket)).toEqual(["made-up-uploads", "made-up-uploads"]);
  });

  it("reads a missing key as undefined, and throws on any other failure", async () => {
    const denied = Object.assign(new Error("denied"), { name: "AccessDenied" });
    const missing = s3Attachments(
      "b",
      () => Promise.reject(),
      fake(() => Promise.reject(denied)).client,
    );
    expect(await missing.read(PATH)).toBeUndefined();
    const down = s3Attachments(
      "b",
      () => Promise.reject(),
      fake(() => Promise.reject(new Error("down"))).client,
    );
    await expect(down.read(PATH)).rejects.toThrow("down");
  });
});
