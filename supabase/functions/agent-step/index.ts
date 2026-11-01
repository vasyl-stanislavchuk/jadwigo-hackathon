// The step host as a Supabase Edge Function (dl-z5ja.5 probe; dl-z5ja.20 picks the host). Deno
// serves the bundle `make runner-bundle` writes beside this file from apps/runner/src/probe-edge.ts:
// our bun workspace packages are bundled by bun into one ES module, and Deno runs it through its
// Node layer (node:net for pg, node:module for createRequire). The bundle is built, never committed.
// @ts-nocheck: Deno's globals; no tsconfig in the repo covers this file.
import { probeFetch } from "./probe.bundle.mjs";

Deno.serve(probeFetch);
