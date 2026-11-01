/**
 * The run channel over Supabase Realtime (dl-z5ja.65): a private channel per run on
 * `run:<run id>`, joined with the signed-in parent's token, whose JWT carries `pod_id` for the join
 * policy (dl-z5ja.61). Each `run_event` broadcast is a poke; its payload is never read as an event.
 */

import { type Client, createClient } from "@jadwigo/api-client";
import { createClient as createSupabase, type SupabaseClient } from "@supabase/supabase-js";
import { type Auth, browserAuth } from "../../parent/auth.ts";
import { type RunLive, routesTransport } from "./routesTransport.ts";
import type { EngineTransport } from "./useConversation.ts";

/** What the run channel needs of a Supabase client, so a test can stand in for it. */
type LiveClient = Pick<SupabaseClient, "channel" | "removeChannel"> & {
  realtime: Pick<SupabaseClient["realtime"], "setAuth">;
};

/**
 * Joins `run:<run id>` as the signed-in parent. A parent's first token is issued before their
 * account row exists, so it carries no `pod_id` and the join policy refuses it (dl-z5ja.92): the
 * first join therefore refreshes the session once, which the page does only after an API call has
 * answered, since it subscribes to a run the routes returned. A refused join refreshes and joins
 * again, once per run.
 */
export function supabaseLive(
  client: LiveClient,
  token: () => Promise<string | null>,
  refresh: () => Promise<unknown> = () => Promise.resolve(),
): RunLive {
  const listeners = new Set<(up: boolean) => void>();
  let down = false;
  const say = (up: boolean) => {
    if (up === !down) return;
    down = !up;
    for (const on of listeners) on(up);
  };
  let refreshed: Promise<void> | null = null;
  const firstRefresh = () =>
    (refreshed ??= refresh().then(
      () => {},
      () => {},
    ));
  return {
    subscribe(topic, onPoke) {
      let channel: ReturnType<LiveClient["channel"]> | null = null;
      let closed = false;
      const join = async (retried: boolean): Promise<void> => {
        if (retried) await refresh().catch(() => {});
        else await firstRefresh();
        const jwt = await token();
        if (closed) return;
        if (jwt !== null) await client.realtime.setAuth(jwt);
        // off() may have run during either await: then no channel is made at all.
        if (closed) return;
        const joined = client.channel(topic, { config: { private: true } });
        channel = joined;
        joined.on("broadcast", { event: "run_event" }, () => {
          if (!closed) onPoke();
        });
        joined.subscribe((status) => {
          if (status === "SUBSCRIBED") say(true);
          else if (status === "CHANNEL_ERROR" && !retried && !closed) {
            void client.removeChannel(joined);
            void join(true);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") say(false);
        });
      };
      void join(false);
      return () => {
        closed = true;
        if (channel !== null) void client.removeChannel(channel);
      };
    },
    onConnection(on) {
      listeners.add(on);
      return () => listeners.delete(on);
    },
  };
}

declare const __JW_AUTH__: { url: string; key: string } | null | undefined;

/**
 * The routes transport for the build's Supabase project: the API on the page's own origin with the
 * parent's token, and a Realtime client that keeps no session of its own (the sign-in's is the one
 * `browserAuth` holds). Null when the build has no Supabase project.
 */
export function apiTransport(): {
  transport: EngineTransport;
  auth: Auth;
  /** The same client, for the consent fallback (dl-z5ja.32). */
  client: Client;
} | null {
  const config = typeof __JW_AUTH__ === "undefined" ? null : __JW_AUTH__;
  const auth = browserAuth();
  if (config === null || auth === null) return null;
  const realtime = createSupabase(config.url, config.key, {
    auth: {
      storageKey: "jw.chat.realtime",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const token = () => auth.token();
  const client = createClient({ base: "", token });
  return {
    transport: routesTransport(
      client,
      supabaseLive(realtime, token, () => auth.refresh()),
    ),
    auth,
    client,
  };
}
