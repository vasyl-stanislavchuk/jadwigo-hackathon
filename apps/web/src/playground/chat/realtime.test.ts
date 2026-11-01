import { describe, expect, it } from "vitest";
import { supabaseLive } from "./realtime.ts";

type Status = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

/** A stand-in Supabase client: each join's status is the next in `answers`. */
function fakeClient(answers: Status[]) {
  const log: string[] = [];
  const pokes: (() => void)[] = [];
  const client = {
    realtime: {
      setAuth: async (jwt: string) => {
        log.push(`setAuth ${jwt}`);
      },
    },
    channel: (topic: string, opts: { config: { private: boolean } }) => {
      log.push(`channel ${topic} private=${opts.config.private}`);
      const channel = {
        on: (_type: string, filter: { event: string }, cb: () => void) => {
          log.push(`on ${filter.event}`);
          pokes.push(cb);
          return channel;
        },
        subscribe: (cb: (status: Status) => void) => {
          const status = answers.shift() ?? "SUBSCRIBED";
          log.push(`subscribe → ${status}`);
          queueMicrotask(() => cb(status));
          return channel;
        },
      };
      return channel;
    },
    removeChannel: async () => {
      log.push("removeChannel");
      return "ok";
    },
  };
  return { client: client as never, raw: client, log, pokes };
}

const flush = async () => {
  for (let i = 0; i < 10; i += 1) await new Promise((r) => setTimeout(r, 0));
};

describe("supabaseLive (dl-z5ja.65, dl-z5ja.92)", () => {
  it("refreshes the session once before the first join, then joins with the new token", async () => {
    const f = fakeClient(["SUBSCRIBED", "SUBSCRIBED"]);
    let jwt = "first-token-without-pod";
    let refreshes = 0;
    const live = supabaseLive(
      f.client,
      async () => jwt,
      async () => {
        refreshes += 1;
        jwt = "token-with-pod";
      },
    );
    live.subscribe("run:run_a", () => {});
    live.subscribe("run:run_b", () => {});
    await flush();
    expect(refreshes).toBe(1);
    expect(f.log).not.toContain("setAuth first-token-without-pod");
    expect(f.log.filter((l) => l.startsWith("setAuth"))).toEqual([
      "setAuth token-with-pod",
      "setAuth token-with-pod",
    ]);
    expect(f.log).toContain("channel run:run_a private=true");
  });

  it("a refused join refreshes and joins again, once", async () => {
    const f = fakeClient(["CHANNEL_ERROR", "CHANNEL_ERROR"]);
    let refreshes = 0;
    const ups: boolean[] = [];
    const live = supabaseLive(
      f.client,
      async () => "jwt",
      async () => {
        refreshes += 1;
      },
    );
    live.onConnection((up) => ups.push(up));
    live.subscribe("run:run_a", () => {});
    await flush();
    expect(refreshes).toBe(2);
    expect(f.log.filter((l) => l.startsWith("subscribe"))).toEqual([
      "subscribe → CHANNEL_ERROR",
      "subscribe → CHANNEL_ERROR",
    ]);
    expect(f.log.filter((l) => l === "removeChannel")).toHaveLength(1);
    // The second refusal is the connection down, not a third try.
    expect(ups).toEqual([false]);
  });

  it("a broadcast is a poke, and unsubscribing leaves the channel", async () => {
    const f = fakeClient(["SUBSCRIBED"]);
    let poked = 0;
    const live = supabaseLive(f.client, async () => "jwt");
    const off = live.subscribe("run:run_a", () => {
      poked += 1;
    });
    await flush();
    expect(f.log).toContain("on run_event");
    f.pokes[0]?.();
    expect(poked).toBe(1);
    off();
    expect(f.log.at(-1)).toBe("removeChannel");
  });

  it("an off() during the join makes no channel, so nothing keeps pulling", async () => {
    const f = fakeClient(["SUBSCRIBED"]);
    let releaseAuth: () => void = () => {};
    f.raw.realtime.setAuth = (jwt: string) =>
      new Promise<void>((resolve) => {
        f.log.push(`setAuth ${jwt}`);
        releaseAuth = resolve;
      });
    let poked = 0;
    const live = supabaseLive(f.client, async () => "jwt");
    const off = live.subscribe("run:run_a", () => {
      poked += 1;
    });
    await flush();
    expect(f.log).toEqual(["setAuth jwt"]);
    off();
    releaseAuth();
    await flush();
    expect(f.log.filter((l) => l.startsWith("channel") || l.startsWith("subscribe"))).toEqual([]);
    expect(poked).toBe(0);
  });
});
