import type { PostHogOptions } from "posthog-node";
import { describe, expect, it } from "vitest";
import { serverErrorReporter } from "./server.ts";

type Fetch = NonNullable<PostHogOptions["fetch"]>;

/** The real client over a fake network: what it would have sent, as sent. */
function capturing(): { fetch: Fetch; sent: () => Record<string, unknown>[] } {
  const bodies: string[] = [];
  const fetch: Fetch = (_url, options) => {
    bodies.push(String(options.body));
    return Promise.resolve({
      status: 200,
      text: () => Promise.resolve("{}"),
      json: () => Promise.resolve({}),
    } as Awaited<ReturnType<Fetch>>);
  };
  return {
    fetch,
    sent: () => bodies.flatMap((body) => JSON.parse(body).batch as Record<string, unknown>[]),
  };
}

const planted = () =>
  new Error('no learner "Ala" lrn_01HXABCDEFGH at ala@example.com for https://x.pl/a?for=Ola');

describe("serverErrorReporter", () => {
  it("does nothing without a key", async () => {
    const network = capturing();
    await serverErrorReporter({ key: undefined, surface: "api", fetch: network.fetch })(planted());
    expect(network.sent()).toEqual([]);
  });

  it("sends one exception scrubbed, with no person, no GeoIP and its surface and route", async () => {
    const network = capturing();
    const report = serverErrorReporter({ key: "phc_test", surface: "api", fetch: network.fetch });
    await report(planted(), { route: "featuredLessons" });

    const [event, ...rest] = network.sent();
    expect(rest).toEqual([]);
    expect(event).toMatchObject({ event: "$exception", distinct_id: "server:api" });
    const properties = event?.["properties"] as Record<string, unknown>;
    expect(properties).toMatchObject({
      surface: "api",
      route: "featuredLessons",
      $geoip_disable: true,
      $process_person_profile: false,
    });
    const [exception] = properties["$exception_list"] as {
      type: string;
      value: string;
      stacktrace: { frames: Record<string, unknown>[] };
    }[];
    expect(exception?.type).toBe("Error");
    expect(exception?.value).toBe('no learner "…" :id at :email for https://x.pl/a');
    expect(exception?.stacktrace.frames.length).toBeGreaterThan(0);

    const wire = JSON.stringify(event);
    for (const secret of ["Ala", "Ola", "lrn_01HXABCDEFGH", "ala@example.com"]) {
      expect(wire).not.toContain(secret);
    }
    expect(wire).not.toContain("context_line");
    expect(wire).not.toContain("pre_context");
  });

  it("sends the context that finds a cause, and only values shaped like a name or an id", async () => {
    const network = capturing();
    const report = serverErrorReporter({ key: "phc_test", surface: "api", fetch: network.fetch });
    await report(planted(), {
      operation: "mastery_rebuild",
      level: "warning",
      request_id: "0b0e6f6e-7f3a-4a57",
      run_id: "Ala ma kota",
    });
    const properties = network.sent()[0]?.["properties"] as Record<string, unknown>;
    expect(properties).toMatchObject({
      operation: "mastery_rebuild",
      request_id: "0b0e6f6e-7f3a-4a57",
      $exception_level: "warning",
    });
    expect(properties).not.toHaveProperty("run_id");
    expect(JSON.stringify(properties)).not.toContain("Ala");
  });

  // Through the real SDK, whose coercers decide what a value that is no Error becomes.
  it.each([
    ["a thrown string", "Zosia lubi koty"],
    ["a thrown number", 500600700],
    ["a thrown object with a name", { name: "Zosia", message: "lubi koty" }],
    ["a thrown object with a message", { message: "Zosia lubi koty" }],
    ["a thrown object's keys", { Zosia: "koty" }],
    ["an error named after a person", Object.assign(new Error("boom"), { name: "Zosia Kowalska" })],
    ["an escaped JSON body", new Error('flagged: {"text":"\\"Zosia lubi koty\\""}')],
    ["a Polish quote", new Error("Nie ma ucznia „Zosia lubi koty”")],
    ["a cause", new Error("outer", { cause: new Error('inner "Zosia lubi koty"') })],
  ])("sends none of %s", async (_name, thrown) => {
    const network = capturing();
    const report = serverErrorReporter({ key: "phc_test", surface: "api", fetch: network.fetch });
    await report(thrown);
    const [event] = network.sent();
    expect(event).toBeDefined();
    const list = ((event?.["properties"] ?? {}) as Record<string, unknown>)["$exception_list"] as {
      type: string;
      value: string;
    }[];
    const said = JSON.stringify(list.map(({ type, value }) => ({ type, value })));
    expect(said).not.toMatch(/Zosia|koty|500600700/);
  });

  it("gives up on a network that hangs, at its timeout", async () => {
    const hang: Fetch = () => new Promise(() => {});
    const report = serverErrorReporter({
      key: "phc_test",
      surface: "runner",
      fetch: hang,
      timeout_ms: 5,
    });
    await expect(report(planted())).resolves.toBeUndefined();
  });

  it("never throws when the network fails", async () => {
    const broken: Fetch = () => Promise.reject(new Error("down"));
    const report = serverErrorReporter({ key: "phc_test", surface: "runner", fetch: broken });
    await expect(report(planted())).resolves.toBeUndefined();
  });
});
