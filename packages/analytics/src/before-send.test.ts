import type { CaptureResult } from "posthog-js";
import { describe, expect, it } from "vitest";
import { beforeSend, beforeSendFor, cutPath } from "./before-send.ts";

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

  it("drops exceptions and identity events", () => {
    expect(beforeSend(event("$exception", { $exception_message: "Ala" }))).toBeNull();
    expect(beforeSend(event("$identify", {}))).toBeNull();
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
