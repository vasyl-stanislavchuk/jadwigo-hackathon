// @vitest-environment happy-dom
/**
 * One Realtime client per page (dl-uukj.47.33): however many times a screen asks for the routes
 * transport, the page makes the sign-in's client and one Realtime client, each under its own storage
 * key, so supabase-js never warns "Multiple GoTrueClient instances".
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const made: { url: string; storageKey: string | undefined }[] = [];

vi.mock("@supabase/supabase-js", () => ({
  createClient: (url: string, _key: string, options?: { auth?: { storageKey?: string } }) => {
    made.push({ url, storageKey: options?.auth?.storageKey });
    return {
      auth: {},
      realtime: { setAuth: async () => {} },
      channel: () => ({}),
      removeChannel: async () => "ok",
    };
  },
}));

beforeEach(() => {
  made.length = 0;
  vi.resetModules();
  vi.stubGlobal("__JW_AUTH__", { url: "https://made-up.supabase.co", key: "anon" });
});
afterEach(() => vi.unstubAllGlobals());

describe("the page's Supabase clients", () => {
  it("makes one Realtime client beside the sign-in's, each on its own key, however often asked", async () => {
    const { apiTransport } = await import("./realtime.ts");
    expect(apiTransport()).not.toBeNull();
    expect(apiTransport()).not.toBeNull();
    expect(apiTransport()).not.toBeNull();
    expect(made).toHaveLength(2);
    const keys = made.map((m) => m.storageKey);
    expect(new Set(keys).size).toBe(2);
    expect(keys).toContain("jw.chat.realtime");
  });
});
