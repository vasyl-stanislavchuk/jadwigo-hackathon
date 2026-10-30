/**
 * The parent's sign-in (dl-e8ov.2.38): Supabase Auth with a 6-digit email code, typed into this
 * tab, so the attempt id the tab holds in sessionStorage is still there afterwards. A magic link
 * would open a new tab without it (docs/research/parent-login.md, "Email code").
 *
 * Google and Facebook (dl-e8ov.2.51, docs/research/social-sign-in.md) leave the tab and come back
 * to it, which keeps sessionStorage too: supabase-js keeps a PKCE verifier before it leaves,
 * Supabase sends the tab back to the /parent URL it left with `?code=`, and `completeRedirect`
 * swaps the code for a session. `detectSessionInUrl` stays false, so only /parent reads the code,
 * on purpose.
 *
 * The project is the build's (`__JW_AUTH__`, from src/config.ts); with none, `browserAuth()` is null
 * and the app stays login-free.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Provider } from "../config.ts";

export type { Provider } from "../config.ts";

declare const __JW_AUTH__:
  | { url: string; key: string; providers?: readonly Provider[] }
  | null
  | undefined;

/** How a return from a provider ended: a session, Supabase's refusal of an account with no email,
 * any other failure, or no return at all (the page was opened, not returned to). */
export type RedirectOutcome = "signed-in" | "no-email" | "failed" | "none";

export interface Auth {
  /** The signed-in adult's access token, or null. */
  token(): Promise<string | null>;
  /** Mails a 6-digit code, making the user on first use. */
  sendCode(email: string): Promise<void>;
  /** Turns the code into a session; false when the code does not match. */
  verifyCode(email: string, code: string): Promise<boolean>;
  /** The providers whose buttons show, in the screen's order (src/config.ts PROVIDERS). */
  providers(): readonly Provider[];
  /** Sends the tab to the provider, to come back to `returnTo`. */
  signInWith(provider: Provider, returnTo: string): Promise<void>;
  /** Reads a provider's return off `url` (`?code=`, or `error` in the query or the hash), takes it
   * out of the address bar, and makes the session from a code. */
  completeRedirect(url: URL): Promise<RedirectOutcome>;
  signOut(): Promise<void>;
}

/** Where supabase-js keeps the session: one fixed key, whatever the project's URL. */
const SESSION_KEY = "jw.auth";

/** What Supabase says when the provider gives it no email (docs/research/social-sign-in.md, "No
 * email"). */
const NO_EMAIL = "Error getting user email";

/** The parameters a return adds to the URL, which the page drops once it has read them. */
const RETURN_PARAMS = ["code", "error", "error_code", "error_description"];

/** A provider's return, read off the URL: a code, an error, or nothing. */
export type Return =
  | { kind: "code"; code: string }
  | { kind: "error"; description: string }
  | { kind: "none" };

/** The return `url` carries. Supabase puts a code in the query and an error in the query or the
 * hash. */
export function returnOf(url: URL): Return {
  const query = url.searchParams;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const code = query.get("code");
  if (code) return { kind: "code", code };
  for (const params of [query, hash]) {
    if (params.has("error") || params.has("error_description"))
      return { kind: "error", description: params.get("error_description") ?? "" };
  }
  return { kind: "none" };
}

/** `url` as a path, query and hash with the return's parameters gone and every other one kept
 * (claim, lang). */
export function withoutReturn(url: URL): string {
  const query = new URLSearchParams(url.search);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  for (const name of RETURN_PARAMS) {
    query.delete(name);
    hash.delete(name);
  }
  const search = query.size > 0 ? `?${query}` : "";
  return `${url.pathname}${search}${hash.size > 0 ? `#${hash}` : ""}`;
}

/** The sign-in over a Supabase client, with the providers the build turns on. */
export function supabaseAuth(supabase: SupabaseClient, providers: readonly Provider[]): Auth {
  // Each code is spent once: a remount that reads the same code again gets the first exchange's
  // outcome, never a second exchange that would fail.
  const exchanges = new Map<string, Promise<RedirectOutcome>>();
  return {
    async token() {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    },
    async sendCode(email) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
    },
    async verifyCode(email, code) {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
      return error === null && data.session !== null;
    },
    providers: () => providers,
    async signInWith(provider, returnTo) {
      // The providers' default scopes: Google's email and profile, Facebook's email.
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: returnTo },
      });
      if (error) throw error;
    },
    completeRedirect(url) {
      // With no provider turned on, a ?code= is not a return: the page stays as it was.
      const back = providers.length === 0 ? ({ kind: "none" } as const) : returnOf(url);
      if (back.kind === "none") return Promise.resolve("none");
      window.history.replaceState(window.history.state, "", withoutReturn(url));
      if (back.kind === "error")
        return Promise.resolve(back.description.includes(NO_EMAIL) ? "no-email" : "failed");
      let exchange = exchanges.get(back.code);
      if (exchange === undefined) {
        exchange = supabase.auth
          .exchangeCodeForSession(back.code)
          .then<RedirectOutcome, RedirectOutcome>(
            ({ error }) => (error === null ? "signed-in" : "failed"),
            () => "failed",
          );
        exchanges.set(back.code, exchange);
      }
      return exchange;
    },
    async signOut() {
      await supabase.auth.signOut();
    },
  };
}

let shared: Auth | null | undefined;

/** The page's sign-in, made once, or null when the build has no Supabase project. */
export function browserAuth(): Auth | null {
  if (shared === undefined) {
    const config = typeof __JW_AUTH__ === "undefined" ? null : __JW_AUTH__;
    shared =
      config === null
        ? null
        : supabaseAuth(
            createClient(config.url, config.key, {
              auth: {
                storageKey: SESSION_KEY,
                persistSession: true,
                detectSessionInUrl: false,
                flowType: "pkce",
              },
            }),
            config.providers ?? [],
          );
  }
  return shared;
}
