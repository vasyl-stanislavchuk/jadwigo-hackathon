import { EventId } from "@jadwigo/contracts";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "./uuid.ts";

describe("uuid: the attempt's event id", () => {
  it("builds a v4 uuid from getRandomValues where randomUUID is missing (plain http, old Safari)", () => {
    const fill = (a: Uint8Array) => a.fill(0xff);
    const id = uuid({ getRandomValues: fill as Crypto["getRandomValues"] });
    expect(id).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
    expect(EventId.safeParse(id).success).toBe(true);
  });

  it("uses randomUUID where the browser has it", () => {
    const randomUUID = vi.fn(() => "0b9e0f43-6c1e-4a57-9b7e-2f3a4c5d6e7f" as const);
    const getRandomValues = vi.fn();
    expect(uuid({ randomUUID, getRandomValues } as unknown as Crypto)).toBe(
      "0b9e0f43-6c1e-4a57-9b7e-2f3a4c5d6e7f",
    );
    expect(getRandomValues).not.toHaveBeenCalled();
  });
});
