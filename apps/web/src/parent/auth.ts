/**
 * The parent's sign-in (dl-e8ov.2.38): Supabase Auth with a 6-digit email code, typed into this
 * tab, so the attempt id the tab holds in sessionStorage is still there afterwards. A magic link
 * would open a new tab without it (docs/research/parent-login.md, "Email code").
 *
 * The project is the build's (`__JW_AUTH__`, from src/config.ts); with none, `browserAuth()` is null
 * and the app stays login-free.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare const __JW_AUTH__: { url: string; key: string } | null | undefined;

export interface Auth {
  /** The signed-in adult's access token, or null. */
  token(): Promise<string | null>;
  /** Mails a 6-digit code, making the user on first use. */
  sendCode(email: string): Promise<void>;
  /** Turns the code into a session; false when the code does not match. */
  verifyCode(email: string, code: string): Promise<boolean>;
  signOut(): Promise<void>;
}

/** Where supabase-js keeps the session: one fixed key, whatever the project's URL. */
const SESSION_KEY = "jw.auth";

function supabaseAuth(supabase: SupabaseClient): Auth {
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
              auth: { storageKey: SESSION_KEY, persistSession: true, detectSessionInUrl: false },
            }),
          );
  }
  return shared;
}
