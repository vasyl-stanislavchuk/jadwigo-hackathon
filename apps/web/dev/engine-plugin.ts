/**
 * The AI engine's dev-server side (epic dl-z5ja, wave 1): one Vite plugin, loaded only while `vite`
 * serves, that runs the engine in-process for `/playground/chat` on an InMemoryStore with
 * ScriptedMuse, and pushes each run's events to the page as a `run:<id>` custom event, shaped like
 * the Realtime broadcast wave 2 brings (dl-z5ja.21). Step 0 (dl-z5ja.12) loads it empty; the web
 * lane (dl-z5ja.17) fills it. The wave plan is docs/worklog/dl-z5ja/2026-10-31-wave-1.md.
 */
import type { Plugin } from "vite";

const ENGINE_PLUGIN = "jadwigo-engine";

/** The plugin: on `serve` only, so a build never carries it. */
export function enginePlugin(): Plugin {
  return {
    name: ENGINE_PLUGIN,
    apply: "serve",
  };
}
