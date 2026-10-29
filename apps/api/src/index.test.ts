import { InMemoryStore, type Store } from "@jadwigo/store";
import { afterEach, describe, expect, it, vi } from "vitest";

const { createPostgresStore } = vi.hoisted(() => ({ createPostgresStore: vi.fn() }));
vi.mock("@jadwigo/store", async (original) => ({
  ...(await original<typeof import("@jadwigo/store")>()),
  createPostgresStore,
}));

const { createHandler, handler, RETRY_FIRST_MS, RETRY_MAX_MS } = await import("./index.ts");

type Context = Parameters<typeof handler>[1];
const context = {} as Context;

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

async function status(call: Promise<unknown>): Promise<number | "threw"> {
  try {
    return ((await call) as { statusCode: number }).statusCode;
  } catch {
    return "threw";
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the Lambda entry", () => {
  it("opens PostgresStore with a pool of 1 connection and a 5 s connect timeout", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5433/jadwigo");
    createPostgresStore.mockReturnValue(new InMemoryStore());
    expect(await status(handler(get("/api/v1/featured-lessons"), context))).toBe(200);
    expect(createPostgresStore).toHaveBeenCalledTimes(1);
    expect(createPostgresStore).toHaveBeenCalledWith("postgresql://localhost:5433/jadwigo", {
      max: 1,
      connectionTimeoutMillis: 5000,
    });
  });
});

describe("createHandler", () => {
  function setup(readUrl: () => Promise<string>) {
    let now = 0;
    const deps = {
      readUrl: vi.fn(readUrl),
      connect: vi.fn((): Store => new InMemoryStore()),
      now: () => now,
    };
    const call = createHandler(deps);
    return {
      deps,
      featured: () => status(call(get("/api/v1/featured-lessons"), context)),
      health: () => status(call(get("/api/health"), context)),
      wait: (ms: number) => {
        now += ms;
      },
    };
  }

  it("answers health without waiting for the database URL, and while its read fails", async () => {
    const never = setup(() => new Promise<string>(() => {}));
    expect(await never.health()).toBe(200);

    const broken = setup(async () => {
      throw new Error("ssm is down");
    });
    expect(await broken.featured()).not.toBe(200);
    expect(await broken.health()).toBe(200);
  });

  it("reads the URL once while it works", async () => {
    const ok = setup(async () => "postgresql://h/db");
    expect(await ok.featured()).toBe(200);
    expect(await ok.featured()).toBe(200);
    expect(await ok.health()).toBe(200);
    expect(ok.deps.readUrl).toHaveBeenCalledTimes(1);
    expect(ok.deps.connect).toHaveBeenCalledTimes(1);
  });

  it("retries a failed read on the first request after the wait, and then keeps the store", async () => {
    let fail = true;
    const flaky = setup(async () => {
      if (fail) throw new Error("ssm is down");
      return "postgresql://h/db";
    });
    expect(await flaky.featured()).not.toBe(200);
    expect(flaky.deps.readUrl).toHaveBeenCalledTimes(1);

    // Inside the wait: the same failure, no new read.
    flaky.wait(RETRY_FIRST_MS - 1);
    expect(await flaky.featured()).not.toBe(200);
    expect(flaky.deps.readUrl).toHaveBeenCalledTimes(1);

    fail = false;
    flaky.wait(1);
    expect(await flaky.featured()).toBe(200);
    expect(flaky.deps.readUrl).toHaveBeenCalledTimes(2);
    expect(await flaky.featured()).toBe(200);
    expect(flaky.deps.readUrl).toHaveBeenCalledTimes(2);
  });

  it("doubles the wait after each failure, up to the cap", async () => {
    const broken = setup(async () => {
      throw new Error("ssm is down");
    });
    const waits: number[] = [];
    for (let read = 1; read <= 9; read += 1) {
      expect(await broken.featured()).not.toBe(200);
      expect(broken.deps.readUrl).toHaveBeenCalledTimes(read);
      let waited = 0;
      while (broken.deps.readUrl.mock.calls.length === read) {
        broken.wait(500);
        waited += 500;
        await broken.featured();
      }
      waits.push(waited);
    }
    expect(waits).toEqual([1000, 2000, 4000, 8000, 16_000, 32_000, 60_000, 60_000, 60_000]);
    expect(RETRY_MAX_MS).toBe(60_000);
  });
});
