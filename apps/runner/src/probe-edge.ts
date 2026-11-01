import { runnerDatabaseUrl } from "./config.ts";
import { postgresEngineHost } from "./engine.ts";
import { createHost } from "./host.ts";
import { ProbeMuse } from "./probe.ts";

/**
 * The probe's Edge Function body (dl-z5ja.5): `supabase/functions/agent-step/index.ts` serves it
 * from the bundle `make runner-bundle` writes beside it. A POST drains `agent_step` once with the
 * scripted model and answers the host's report as JSON. The database URL is the
 * `RUNNER_DATABASE_URL` secret, a login in `jadwigo_runner`.
 */
const host = createHost(async () =>
  postgresEngineHost(await runnerDatabaseUrl(), new ProbeMuse(), (line) => console.warn(line)),
);

export async function probeFetch(request: Request): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  try {
    return Response.json({ host: "edge", ...(await host()) });
  } catch (error) {
    // The message only: a stack or a cause could carry the URL.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`agent-step: ${message}`);
    return Response.json({ host: "edge", error: message }, { status: 500 });
  }
}
