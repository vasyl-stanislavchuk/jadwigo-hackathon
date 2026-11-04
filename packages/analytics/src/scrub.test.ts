import { describe, expect, it } from "vitest";
import { scrubExceptionList, scrubMessage, scrubType, THROWN_VALUE } from "./scrub.ts";

describe("scrubMessage", () => {
  it.each([
    ['no learner "Ala"', 'no learner "…"'],
    ["no learner 'Ala'", 'no learner "…"'],
    ["no learner `Ala`", 'no learner "…"'],
    ['cut off "Ala ma ko', 'cut off "…"'],
    ["no row for lrn_01HXABCDEFGH", "no row for :id"],
    ["no row for 0b0e6f6e-7f3a-4a57-9d2a-1f2e3d4c5b6a", "no row for :id"],
    ["mail to ala@example.com failed", "mail to :email failed"],
    [
      "fetch https://app.jadwigo.pl/parent?for=Ala failed",
      "fetch https://app.jadwigo.pl/parent failed",
    ],
    ["phone 500600700 refused", "phone :n refused"],
    ["this doesn't parse", "this doesn't parse"],
    ["Network request failed", "Network request failed"],
  ])("%s becomes %s", (from, to) => {
    expect(scrubMessage(from)).toBe(to);
  });

  it("takes every value out of a ZodError's JSON message", () => {
    const zod = JSON.stringify(
      [{ code: "invalid_type", path: ["name"], message: "Ala", received: "Ola" }],
      null,
      2,
    );
    const scrubbed = scrubMessage(zod);
    expect(scrubbed).not.toContain("Ala");
    expect(scrubbed).not.toContain("Ola");
  });

  it("takes values out of a Postgres error's message", () => {
    expect(scrubMessage('Key (email)=(ala@example.com) violates "learner_email_key"')).toBe(
      'Key (email)=(:email) violates "…"',
    );
  });

  it.each([
    ["a JSON body's escaped quote", 'Muse: {"error":"Content flagged: \\"Zosia: lubi koty\\""}'],
    ["an escaped quote alone", 'Content flagged: \\"Zosia: lubi koty\\"'],
    ["Polish quotes", "Nie ma ucznia „Zosia”"],
    ["English curly quotes", "answer “Zosia” is off"],
    ["single curly quotes", "answer ‘Zosia’ is off"],
    ["guillemets", "answer «Zosia» is off"],
    ["an unclosed Polish quote", "Nie ma ucznia „Zosia"],
    ["a rejected string", "Non-Error promise rejection captured with value: Zosia lubi koty"],
    ["a thrown string", "Non-Error exception captured with value: Zosia"],
    ["a thrown object's keys", "Object captured as exception with keys: Zosia, koty"],
  ])("takes the text out of %s", (_name, message) => {
    expect(scrubMessage(message)).not.toMatch(/Zosia|koty/);
  });

  it("keeps the words a rejection is known by", () => {
    expect(scrubMessage("Non-Error promise rejection captured with value: Zosia")).toBe(
      'Non-Error promise rejection captured: "…"',
    );
    expect(scrubMessage("Primitive value captured as exception: Zosia")).toBe(
      'Primitive value captured: "…"',
    );
  });

  it("stays quick on a very long unbroken message", () => {
    const started = performance.now();
    scrubMessage("a".repeat(5_000_000));
    scrubMessage(`"${"\\".repeat(5_000_000)}`);
    expect(performance.now() - started).toBeLessThan(500);
  });

  it("stops at 200 characters", () => {
    expect(scrubMessage("x".repeat(500))).toHaveLength(200);
  });
});

describe("scrubType", () => {
  it.each([
    ["Error", "Error"],
    ["TypeError", "TypeError"],
    ["ZodError", "ZodError"],
    ["DOMException", "DOMException"],
    ["MuseFailed", "MuseFailed"],
    ["UnhandledRejection", "UnhandledRejection"],
    ["Zosia", "Error"],
    ["Zosia Kowalska", "Error"],
    ["Zosia Error", "Error"],
  ])("%s stays as %s", (from, to) => {
    expect(scrubType(from)).toBe(to);
  });
});

describe("scrubExceptionList", () => {
  it("sends none of a thrown value's text, which the SDKs mark synthetic", () => {
    const list = scrubExceptionList([
      { type: "Error", value: "Zosia lubi koty", mechanism: { synthetic: true, handled: false } },
    ]);
    expect(list).toEqual([
      {
        type: "Error",
        value: THROWN_VALUE,
        mechanism: { synthetic: true, handled: false },
      },
    ]);
  });

  it("empties a data: URL frame", () => {
    const list = scrubExceptionList([
      { stacktrace: { type: "raw", frames: [{ filename: "data:text/javascript,Zosia" }] } },
    ]);
    expect(JSON.stringify(list)).not.toContain("Zosia");
  });

  it("is null for anything but a list", () => {
    expect(scrubExceptionList(undefined)).toBeNull();
    expect(scrubExceptionList("Ala")).toBeNull();
  });

  it("keeps only what the allowlists name", () => {
    const [scrubbed] =
      scrubExceptionList([
        {
          type: "TypeError",
          value: 'bad "Ala"',
          extra: "Ala",
          mechanism: { handled: false, type: "onerror", synthetic: false, source: "Ala" },
          stacktrace: {
            type: "raw",
            frames: [
              {
                platform: "web:javascript",
                filename: "https://app.jadwigo.pl/parent/assets/a.js?for=lrn_2#Ala",
                abs_path: "https://app.jadwigo.pl/play/les_9/a.js",
                function: "render",
                module: "a",
                lineno: 3,
                colno: 7,
                in_app: true,
                chunk_id: "c1",
                context_line: "const name = 'Ala'",
                pre_context: ["Ala"],
                post_context: ["Ala"],
                vars: { name: "Ala" },
              },
            ],
          },
        },
      ]) ?? [];
    expect(scrubbed).toEqual({
      type: "TypeError",
      value: 'bad "…"',
      mechanism: { handled: false, type: "onerror", synthetic: false },
      stacktrace: {
        type: "raw",
        frames: [
          {
            platform: "web:javascript",
            filename: "https://app.jadwigo.pl/parent/assets/a.js",
            abs_path: "https://app.jadwigo.pl/play/:id/a.js",
            function: "render",
            module: "a",
            lineno: 3,
            colno: 7,
            in_app: true,
            chunk_id: "c1",
          },
        ],
      },
    });
    expect(JSON.stringify(scrubbed)).not.toContain("Ala");
  });

  it("scrubs every entry of a cause chain, and keeps a server's file path", () => {
    const list = scrubExceptionList([
      { type: "Error", value: 'outer "Ala"' },
      {
        type: "Error",
        value: 'inner "Ola"',
        stacktrace: { type: "raw", frames: [{ filename: "file:///var/task/index.mjs?x=Ala" }] },
      },
      "Ala",
    ]);
    expect(list).toEqual([
      { type: "Error", value: 'outer "…"' },
      {
        type: "Error",
        value: 'inner "…"',
        stacktrace: { type: "raw", frames: [{ filename: "file:///var/task/index.mjs" }] },
      },
    ]);
  });
});
