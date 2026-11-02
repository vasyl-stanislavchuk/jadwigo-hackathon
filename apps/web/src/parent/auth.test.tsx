/**
 * A provider's return off the URL (dl-e8ov.2.51): the code or the error is read from the query or
 * the hash, taken out of the address bar with claim and lang kept, and a code is spent once.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enabledIn, returnOf, supabaseAuth, withoutReturn } from "./auth.ts";

const CLAIM = "claim=asg_0ectzj2evqb95a3v1v6wewjzy3&lang=pl";
const at = (path: string): URL => new URL(path, "http://app.local");

function fakeSupabase(error: Error | null = null) {
  const exchangeCodeForSession = vi.fn(async (_code: string) => ({ data: {}, error }));
  const supabase = { auth: { exchangeCodeForSession } } as unknown as SupabaseClient;
  return { supabase, exchangeCodeForSession };
}

beforeEach(() => {
  window.history.replaceState(null, "", "/parent");
});

describe("returnOf", () => {
  it("reads a code from the query", () => {
    expect(returnOf(at(`/parent?${CLAIM}&code=abc`))).toEqual({ kind: "code", code: "abc" });
  });

  it("reads an error from the query or the hash", () => {
    const description = "Error getting user email from external provider";
    expect(
      returnOf(
        at(`/parent?error=server_error&error_description=${encodeURIComponent(description)}`),
      ),
    ).toEqual({ kind: "error", description });
    expect(returnOf(at("/parent#error=access_denied"))).toEqual({ kind: "error", description: "" });
  });

  it("is none on a page opened, not returned to", () => {
    expect(returnOf(at(`/parent?${CLAIM}`))).toEqual({ kind: "none" });
  });
});

describe("withoutReturn", () => {
  it("drops the return's parameters from the query and the hash and keeps claim and lang", () => {
    expect(withoutReturn(at(`/parent?${CLAIM}&code=abc`))).toBe(`/parent?${CLAIM}`);
    expect(
      withoutReturn(at(`/parent?${CLAIM}&error=x&error_code=y&error_description=z#error=x`)),
    ).toBe(`/parent?${CLAIM}`);
    expect(withoutReturn(at("/parent?code=abc"))).toBe("/parent");
  });
});

describe("completeRedirect", () => {
  it("swaps a code for a session once, however often it is read", async () => {
    const { supabase, exchangeCodeForSession } = fakeSupabase();
    const auth = supabaseAuth(supabase, ["google"]);
    const url = at(`/parent?${CLAIM}&code=abc`);
    expect(await Promise.all([auth.completeRedirect(url), auth.completeRedirect(url)])).toEqual([
      "signed-in",
      "signed-in",
    ]);
    expect(await auth.completeRedirect(url)).toBe("signed-in");
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(window.location.pathname + window.location.search).toBe(`/parent?${CLAIM}`);
  });

  it("fails when the exchange is refused", async () => {
    const { supabase } = fakeSupabase(new Error("invalid flow state"));
    expect(await supabaseAuth(supabase, ["google"]).completeRedirect(at("/parent?code=abc"))).toBe(
      "failed",
    );
  });

  it("tells no email from any other error, and clears the hash", async () => {
    const { supabase, exchangeCodeForSession } = fakeSupabase();
    const auth = supabaseAuth(supabase, ["google"]);
    expect(
      await auth.completeRedirect(
        at(`/parent?${CLAIM}#error=server_error&error_description=Error+getting+user+email+from+x`),
      ),
    ).toBe("no-email");
    expect(window.location.hash).toBe("");
    expect(await auth.completeRedirect(at("/parent?error=access_denied"))).toBe("failed");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("does nothing on a page opened, not returned to", async () => {
    const { supabase } = fakeSupabase();
    window.history.replaceState(null, "", `/parent?${CLAIM}`);
    expect(await supabaseAuth(supabase, ["google"]).completeRedirect(at(`/parent?${CLAIM}`))).toBe(
      "none",
    );
  });

  it("leaves a ?code= alone when the build turns no provider on", async () => {
    const { supabase, exchangeCodeForSession } = fakeSupabase();
    window.history.replaceState(null, "", `/parent?${CLAIM}&code=abc`);
    expect(await supabaseAuth(supabase, []).completeRedirect(at(`/parent?${CLAIM}&code=abc`))).toBe(
      "none",
    );
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(window.location.search).toBe(`?${CLAIM}&code=abc`);
  });
});

describe("enabledProviders", () => {
  // The shape jadwigo-dev's GET /auth/v1/settings answers with, trimmed.
  const settings = {
    external: { google: true, facebook: false, email: true },
    disable_signup: false,
  };

  it("keeps the build's providers the project has on, in the build's order", () => {
    expect(enabledIn(settings, ["google", "facebook"])).toEqual(["google"]);
    expect(
      enabledIn({ external: { facebook: true, google: true } }, ["google", "facebook"]),
    ).toEqual(["google", "facebook"]);
    expect(enabledIn({ external: { google: true } }, [])).toEqual([]);
    expect(enabledIn({}, ["google"])).toEqual([]);
    expect(enabledIn(null, ["google"])).toEqual([]);
  });

  it("reads the settings once per page load", async () => {
    const { supabase } = fakeSupabase();
    const readSettings = vi.fn(async () => settings);
    const auth = supabaseAuth(supabase, ["google", "facebook"], readSettings);
    expect(await auth.enabledProviders()).toEqual(["google"]);
    expect(await auth.enabledProviders()).toEqual(["google"]);
    expect(readSettings).toHaveBeenCalledTimes(1);
  });

  it("lets a hand-over start every provider the project has on, its button shown or not (dl-ovva)", async () => {
    const { supabase } = fakeSupabase();
    const readSettings = vi.fn(async () => ({ external: { google: true, facebook: true } }));
    const auth = supabaseAuth(supabase, ["google"], readSettings);
    expect(await auth.enabledProviders()).toEqual(["google"]);
    expect(await auth.handoffProviders()).toEqual(["google", "facebook"]);
    expect(readSettings).toHaveBeenCalledTimes(1);
    const off = supabaseAuth(supabase, ["google"], async () => settings);
    expect(await off.handoffProviders()).toEqual(["google"]);
  });

  it("is none when the read fails, and reads nothing when the build turns no provider on", async () => {
    const { supabase } = fakeSupabase();
    const failing = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await supabaseAuth(supabase, ["google"], failing).enabledProviders()).toEqual([]);
    expect(await supabaseAuth(supabase, ["google"], failing).handoffProviders()).toEqual([]);
    const unused = vi.fn(async () => settings);
    expect(await supabaseAuth(supabase, [], unused).enabledProviders()).toEqual([]);
    expect(await supabaseAuth(supabase, [], unused).handoffProviders()).toEqual([]);
    expect(unused).not.toHaveBeenCalled();
  });
});

describe("refresh (dl-z5ja.65)", () => {
  it("answers the refreshed session's access token, and null when the refresh fails", async () => {
    const refreshSession = vi
      .fn()
      .mockResolvedValueOnce({ data: { session: { access_token: "token-with-pod" } }, error: null })
      .mockResolvedValueOnce({ data: { session: null }, error: new Error("no session") });
    const supabase = { auth: { refreshSession } } as unknown as SupabaseClient;
    const auth = supabaseAuth(supabase, []);
    expect(await auth.refresh()).toBe("token-with-pod");
    expect(await auth.refresh()).toBeNull();
    expect(refreshSession).toHaveBeenCalledTimes(2);
  });
});
