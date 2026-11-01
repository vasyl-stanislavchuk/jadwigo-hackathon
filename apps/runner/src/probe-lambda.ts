import { runnerDatabaseUrl } from "./config.ts";
import { postgresEngineHost } from "./engine.ts";
import { createHost } from "./host.ts";
import { ProbeMuse } from "./probe.ts";

/**
 * The probe's Lambda entry (dl-z5ja.5), `probe-lambda.handler` in the bundle `make runner-bundle`
 * writes: one drain of `agent_step` with the scripted model, answering the host's report. The
 * database URL is read once per cold start from the SSM parameter Terraform names.
 */
const host = createHost(async () =>
  postgresEngineHost(await runnerDatabaseUrl(), new ProbeMuse(), (line) => console.warn(line)),
);

export const handler = async () => ({ host: "lambda", ...(await host()) });
