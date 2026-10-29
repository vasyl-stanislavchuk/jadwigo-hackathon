// What reaches the dl-5ssh.13 alarms when the api fails: a route that throws answers 500, which
// API Gateway counts as 5xx (alarm api-5xx), and logs one JSON line at level ERROR; an event that is
// not an HTTP API event makes the Lambda itself fail, which Lambda counts as Errors (alarm
// api-errors). docs/runbooks/api-alarm-smoke.md forces the second on dev by hand.
import { ErrorType } from "@jadwigo/contracts";
import { InMemoryStore, type Store, StoreError } from "@jadwigo/store";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.ts";

function get(path: string) {
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: path,
    rawQueryString: "",
    headers: {},
    requestContext: { http: { method: "GET", path }, stage: "$default" },
    isBase64Encoded: false,
  };
}

const context = {} as Parameters<ReturnType<typeof createApp>["resolve"]>[1];

/** A store whose featured-lessons read fails as given. */
function failing(error: unknown): Store {
  const store = new InMemoryStore();
  store.listOpenAssignments = async () => {
    throw error;
  };
  return store;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("a failing route", () => {
  it("answers 500 with nothing of the error, and logs one ERROR line naming the route", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createApp(failing(new Error("connection terminated unexpectedly")));
    const reply = (await app.resolve(get("/api/v1/featured-lessons"), context)) as {
      statusCode: number;
      body: string;
    };
    expect(reply.statusCode).toBe(500);
    expect(reply.body).not.toContain("connection terminated");

    expect(log).toHaveBeenCalledTimes(1);
    const line = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(line).toMatchObject({
      level: "ERROR",
      message: "route failed",
      route: "featuredLessons",
      error: { name: "Error", message: "connection terminated unexpectedly" },
    });
    expect(line.error.stack).toContain("connection terminated unexpectedly");
  });

  it("logs nothing for a refusal the API names: a 4xx is no failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createApp(failing(new StoreError(ErrorType.enum.NotFound, "no such pod")));
    const reply = (await app.resolve(get("/api/v1/featured-lessons"), context)) as {
      statusCode: number;
    };
    expect(reply.statusCode).toBe(404);
    expect(log).not.toHaveBeenCalled();
  });

  it("makes the Lambda fail on an event that is not an HTTP API event, as the smoke sends", async () => {
    const app = createApp(new InMemoryStore());
    await expect(app.resolve({ jadwigo_smoke: "force-error" }, context)).rejects.toThrow();
  });
});
