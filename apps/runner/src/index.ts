import { museConfig, runnerDatabaseUrl } from "./config.ts";
import { postgresEngineHost } from "./engine.ts";
import { createRunnerHandler } from "./handler.ts";
import { createHost } from "./host.ts";
import { liveMuse, realRuntime } from "./muse.ts";

/**
 * The step host's Lambda entry (dl-z5ja.20), `index.handler` in the bundle `make runner-bundle`
 * writes: drain `agent_step` as `jadwigo_runner` with `HttpMuse` inside `GuardedMuse`. The database
 * URL and the Meta key are read once per cold start from the SSM parameters Terraform names.
 */
const warn = (line: string) => console.warn(line);

const host = createHost(async () => {
  const [url, muse] = await Promise.all([runnerDatabaseUrl(), museConfig()]);
  return postgresEngineHost(url, liveMuse(muse, realRuntime), warn);
});

export const handler = createRunnerHandler(host, warn);
