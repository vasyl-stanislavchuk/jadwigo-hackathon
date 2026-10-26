import net from "node:net";
import { describe, expect, it } from "vitest";
import { FIXED_NOW } from "./index.ts";

describe("the unit setup", () => {
  it("refuses the network, real AWS and the wall clock", async () => {
    await expect(async () => fetch("https://example.com")).rejects.toThrow(
      /may not use the network/,
    );
    expect(() => net.connect(443, "example.com")).toThrow(/may not use the network/);
    expect(process.env["AWS_ACCESS_KEY_ID"]).toBeUndefined();
    expect(process.env["AWS_ENDPOINT_URL"]).toBe("http://aws.invalid");
    expect(new Date().toISOString()).toBe(FIXED_NOW.toISOString());
  });
});
