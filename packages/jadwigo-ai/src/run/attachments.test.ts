import { ID_PREFIXES, idOf, PodId, uuidOf } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { dataUrl, ownPath } from "./attachments.ts";

const POD = PodId.parse(idOf(ID_PREFIXES.pod, crypto.randomUUID()));
const OTHER = PodId.parse(idOf(ID_PREFIXES.pod, crypto.randomUUID()));

describe("ownPath (dl-z5ja.11.4)", () => {
  it("trusts a key under the run's pod's attachments, the pod by its id or its uuid", () => {
    expect(ownPath(POD, `pods/${POD}/attachments/atch_1.jpg`)).toBe(true);
    expect(ownPath(POD, `pods/${uuidOf(ID_PREFIXES.pod, POD)}/attachments/atch_1.jpg`)).toBe(true);
  });

  it("trusts nothing else: another pod, the pending prefix, a climb, a sub-folder or no name", () => {
    for (const path of [
      `pods/${OTHER}/attachments/atch_1.jpg`,
      `pending/${POD}/atch_1.jpg`,
      `pods/${POD}/attachments/../../${OTHER}/attachments/atch_1.jpg`,
      `pods/${POD}/attachments/sub/atch_1.jpg`,
      `pods/${POD}/attachments/`,
      `pods/${POD}/notes/atch_1.jpg`,
    ]) {
      expect(ownPath(POD, path), path).toBe(false);
    }
  });
});

describe("dataUrl", () => {
  it("encodes the bytes as base64, past the chunk size", () => {
    const bytes = new Uint8Array(0x8000 * 2 + 3).map((_, i) => i % 251);
    const url = dataUrl("image/jpeg", bytes);
    expect(url.startsWith("data:image/jpeg;base64,")).toBe(true);
    const back = Uint8Array.from(atob(url.slice("data:image/jpeg;base64,".length)), (c) =>
      c.charCodeAt(0),
    );
    expect(back).toEqual(bytes);
  });
});
