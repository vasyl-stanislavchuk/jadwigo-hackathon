import type { APIRoute } from "astro";
import { robotsTxt } from "../lib/seo.ts";

export const GET: APIRoute = () =>
  new Response(robotsTxt(), { headers: { "content-type": "text/plain; charset=utf-8" } });
