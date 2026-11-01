/**
 * The run channel over Supabase Realtime (dl-z5ja.65): a private channel per run on
 * `run:<run id>`, joined with the signed-in parent's token, whose JWT carries `pod_id` for the join
 * policy (dl-z5ja.61). Each `run_event` broadcast is a poke; its payload is never read as an event.
 */

import { createClient } from "@jadwigo/api-client";
import { createClient as createSupabase, type SupabaseClient } from "@supabase/supabase-js";
import { type Auth, browserAuth } from "../../parent/auth.ts";
import { type RunLive, routesTransport } from "./routesTransport.ts";
import type { EngineTransport } from "./useConversation.ts";

function supabaseLive(client: SupabaseClient, token: () => Promise<string | null>): RunLive {
  const listeners = new Set<(up: boolean) => void>();
  let down = false;
  const say = (up: boolean) => {
    if (up === !down) return;
    down = !up;
    for (const on of listeners) on(up);
  };
  return {
    subscribe(topic, onPoke) {
      const channel = client.channel(topic, { config: { private: true } });
      channel.on("broadcast", { event: "run_event" }, () => onPoke());
      void token().then(async (jwt) => {
        if (jwt !== null) await client.realtime.setAuth(jwt);
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") say(true);
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") say(false);
        });
      });
      return () => void client.removeChannel(channel);
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
export function apiTransport(): { transport: EngineTransport; auth: Auth } | null {
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
  return {
    transport: routesTransport(createClient({ base: "", token }), supabaseLive(realtime, token)),
    auth,
  };
}
