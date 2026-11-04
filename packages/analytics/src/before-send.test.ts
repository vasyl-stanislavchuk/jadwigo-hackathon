import type { CaptureResult } from "posthog-js";
import { describe, expect, it } from "vitest";
import { beforeSend, beforeSendFor, maskAttribute } from "./before-send.ts";
import { posthogOptions } from "./options.ts";
import { cutPath } from "./scrub.ts";

const event = (name: string, properties: Record<string, unknown>): CaptureResult => ({
  uuid: "u1",
  event: name,
  properties,
});

describe("cutPath", () => {
  it.each([
    ["/parent/children/lrn_01HX", "/parent/children/:id"],
    ["/play/les_9", "/play/:id"],
    ["/parent/attempts/att_1?learner=lrn_2", "/parent/attempts/:id"],
    ["/parent/lessons", "/parent/lessons"],
    ["/parent?for=lrn_2&lang=pl", "/parent"],
    ["https://app.jadwigo.pl/parent/lessons/cnv_7#x", "https://app.jadwigo.pl/parent/lessons/:id"],
    ["/en/jak-to-dziala", "/en/jak-to-dziala"],
    ["$direct", "$direct"],
    ["", ""],
  ])("%s becomes %s", (from, to) => {
    expect(cutPath(from)).toBe(to);
  });
});

describe("beforeSend", () => {
  it("drops an event the catalogue does not know", () => {
    expect(beforeSend(event("lesson_finished", {}))).toBeNull();
  });

  it("drops a catalogued event whose value is not allowed", () => {
    expect(beforeSend(event("chat_response_rated", { verdict: "meh" }))).toBeNull();
  });

  it("drops a key the catalogue does not know, and keeps PostHog's own", () => {
    const sent = beforeSend(
      event("chat_response_rated", { verdict: "good", note: "Ala", $session_id: "s" }),
    );
    expect(sent?.properties).toEqual({ verdict: "good", $session_id: "s" });
  });

  it("drops identity events", () => {
    expect(beforeSend(event("$identify", {}))).toBeNull();
  });

  it("drops an exception with no list", () => {
    expect(beforeSend(event("$exception", { $exception_message: "Ala" }))).toBeNull();
  });

  it.each([
    ["a ResizeObserver notice", { type: "Error", value: "ResizeObserver loop limit exceeded" }],
    ["an opaque error of another origin", { type: "Error", value: "Script error." }],
    [
      "a visitor's extension",
      {
        type: "TypeError",
        value: "boom",
        stacktrace: { type: "raw", frames: [{ filename: "chrome-extension://abc/inject.js" }] },
      },
    ],
  ])("drops %s", (_name, exception) => {
    expect(beforeSend(event("$exception", { $exception_list: [exception] }))).toBeNull();
  });

  it("keeps a known source and drops any other", () => {
    const send = (source: string) =>
      beforeSend(
        event("$exception", { $exception_list: [{ type: "Error", value: "boom" }], source }),
      )?.properties;
    expect(send("error_boundary")).toMatchObject({ source: "error_boundary" });
    expect(send("Ala")).not.toHaveProperty("source");
  });

  it("keeps a real error that only mentions a script", () => {
    const list = [
      {
        type: "Error",
        value: "Script error while loading a lesson",
        stacktrace: { type: "raw", frames: [{ filename: "https://app.jadwigo.pl/assets/a.js" }] },
      },
    ];
    expect(beforeSend(event("$exception", { $exception_list: list }))).not.toBeNull();
  });

  it("sends an exception scrubbed, with its other keys gone and its URLs cut", () => {
    const sent = beforeSend(
      event("$exception", {
        $exception_list: [{ type: "Error", value: 'no learner "Ala"' }],
        $exception_level: "error",
        $exception_message: "Ala",
        $exception_personURL: "https://eu.posthog.com/person/Ala",
        $current_url: "https://app.jadwigo.pl/play/les_9?for=lrn_2",
        $session_id: "s",
        note: "Ala",
      }),
    );
    expect(sent?.properties).toEqual({
      $exception_list: [{ type: "Error", value: 'no learner "…"' }],
      $exception_level: "error",
      $current_url: "https://app.jadwigo.pl/play/:id",
      $session_id: "s",
    });
  });

  it("passes a pageview with its URLs cut, its title gone and no person properties", () => {
    const sent = beforeSend({
      ...event("$pageview", {
        $current_url: "https://app.jadwigo.pl/parent/children/lrn_1?lang=pl",
        $pathname: "/parent/children/lrn_1",
        title: "Ala",
      }),
      $set: { email: "a@b.c" },
    });
    expect(sent).toEqual({
      uuid: "u1",
      event: "$pageview",
      properties: {
        $current_url: "https://app.jadwigo.pl/parent/children/:id",
        $pathname: "/parent/children/:id",
      },
    });
  });

  it("passes a replay snapshot with the hrefs inside it cut", () => {
    const sent = beforeSend(
      event("$snapshot", {
        $snapshot_data: [
          {
            type: 4,
            data: { href: "https://app.jadwigo.pl/parent?for=lrn_2&claim=asg_3", width: 1 },
          },
          {
            type: 5,
            data: {
              tag: "$url_changed",
              payload: { href: "https://app.jadwigo.pl/parent/children/lrn_2" },
            },
          },
          { type: 3, data: { source: 0 } },
        ],
      }),
    );
    expect(sent?.properties["$snapshot_data"]).toEqual([
      { type: 4, data: { href: "https://app.jadwigo.pl/parent", width: 1 } },
      {
        type: 5,
        data: {
          tag: "$url_changed",
          payload: { href: "https://app.jadwigo.pl/parent/children/:id" },
        },
      },
      { type: 3, data: { source: 0 } },
    ]);
  });

  it("keeps PostHog's $direct referrer", () => {
    const sent = beforeSend(
      event("$pageview", { $referrer: "$direct", $initial_referrer: "$direct" }),
    );
    expect(sent?.properties).toEqual({ $referrer: "$direct", $initial_referrer: "$direct" });
  });

  it("stamps the surface and turns GeoIP off", () => {
    const sent = beforeSendFor("site")(event("email_sign_in_submitted", { locale: "pl" }));
    expect(sent?.properties).toEqual({ locale: "pl", surface: "site", $geoip_disable: true });
  });
});

describe("maskAttribute, the replay's attributes (dl-w0b4.13's review)", () => {
  const LEARNER = "lrn_7qre3atahx8cpak6xbjtz73var";

  it("cuts a link's ids and query, as an event's URLs are cut", () => {
    expect(maskAttribute("href", `/parent?for=${LEARNER}`)).toBe("/parent");
    expect(maskAttribute("href", `/parent/children/${LEARNER}`)).toBe("/parent/children/:id");
    expect(maskAttribute("src", `https://app.jadwigo.pl/parent/children/${LEARNER}?x=1`)).toBe(
      "https://app.jadwigo.pl/parent/children/:id",
    );
  });

  it("turns an id in any other attribute into :id, and leaves the rest", () => {
    expect(maskAttribute("data-learner-card", LEARNER)).toBe(":id");
    expect(maskAttribute("data-attempt", "att_43007b83dp9w2tnfjxhha74cyq")).toBe(":id");
    expect(maskAttribute("data-run", "0b6f3c1e-8f7a-4c1d-9e2b-1a2b3c4d5e6f")).toBe(":id");
    expect(maskAttribute("class", "flex gap-2")).toBe("flex gap-2");
    expect(maskAttribute("aria-label", "Ola, klasa 2")).toBe("Ola, klasa 2");
  });

  it("is the replay's maskAttributeFn", () => {
    const fn = posthogOptions("app").session_recording?.maskAttributeFn;
    expect(fn?.("data-learner-card", LEARNER)).toBe(":id");
  });
});
