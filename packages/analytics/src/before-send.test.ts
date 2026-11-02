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

  it("passes a replay snapshot", () => {
    expect(beforeSend(event("$snapshot", { $snapshot_data: [1] }))?.event).toBe("$snapshot");
  });

  it("stamps the surface and turns GeoIP off", () => {
    const sent = beforeSendFor("site")(event("email_sign_in_submitted", { locale: "pl" }));
    expect(sent?.properties).toEqual({ locale: "pl", surface: "site", $geoip_disable: true });
  });
});
