import { describe, expect, it } from "vitest";
import { admitPost } from "./engine-plugin.ts";

const OWN = {
  headers: {
    host: "localhost:5173",
    origin: "http://localhost:5173",
    "content-type": "application/json",
  },
};

describe("admitPost (dl-z5ja.45)", () => {
  it("lets the dev server's own page start a run", () => {
    expect(admitPost(OWN)).toBeNull();
    expect(
      admitPost({ headers: { ...OWN.headers, "content-type": "application/json; charset=utf-8" } }),
    ).toBeNull();
  });

  it("refuses a POST from another page in the browser", () => {
    for (const origin of ["https://evil.example", "http://localhost:6006", "null"]) {
      expect(admitPost({ headers: { ...OWN.headers, origin } })?.status, origin).toBe(403);
    }
  });

  it("refuses a POST with no Origin", () => {
    const { origin: _origin, ...headers } = OWN.headers;
    expect(admitPost({ headers })?.status).toBe(403);
  });

  it("refuses a body a cross-site form could send without asking", () => {
    for (const type of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data"]) {
      expect(admitPost({ headers: { ...OWN.headers, "content-type": type } })?.status, type).toBe(
        415,
      );
    }
    const { "content-type": _type, ...headers } = OWN.headers;
    expect(admitPost({ headers })?.status).toBe(415);
  });
});
