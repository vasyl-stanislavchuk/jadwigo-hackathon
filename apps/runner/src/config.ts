/** The runner's one read of the environment. */
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

/** Reads one SecureString, decrypted. The runner's role may read only the parameter it names. */
type ReadParameter = (name: string) => Promise<string | undefined>;

const readSsm: ReadParameter = async (name) => {
  const reply = await new SSMClient({}).send(
    new GetParameterCommand({ Name: name, WithDecryption: true }),
  );
  return reply.Parameter?.Value;
};

/** A setting, trimmed; blank counts as unset. */
function setting(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

/**
 * The URL once `new URL()` parses it with a postgres scheme and a host. The error never carries
 * the value: it holds the password.
 */
function checked(value: string, source: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(
      `${source} is not a URL: percent-encode any reserved character in the password`,
    );
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:")
    throw new Error(`${source} is not a postgres:// or postgresql:// URL`);
  if (!url.hostname) throw new Error(`${source} names no host`);
  return value.trim();
}

/**
 * The step host's database: the login that is a member of `jadwigo_runner` (it owns no table and
 * never bypasses row-level security). The Edge Function's `RUNNER_DATABASE_URL` secret, else
 * `DATABASE_URL` (a local run), else the SSM SecureString that
 * `JADWIGO_RUNNER_DB_URL_PARAM` names. Read once per cold start, so the secret is never in
 * Terraform's state or the function's environment.
 */
export async function runnerDatabaseUrl(read: ReadParameter = readSsm): Promise<string> {
  const direct = setting("RUNNER_DATABASE_URL") ?? setting("DATABASE_URL");
  if (direct !== undefined) return checked(direct, "RUNNER_DATABASE_URL or DATABASE_URL");
  const name = setting("JADWIGO_RUNNER_DB_URL_PARAM");
  if (!name) throw new Error("set DATABASE_URL or JADWIGO_RUNNER_DB_URL_PARAM");
  const value = (await read(name))?.trim();
  if (!value) throw new Error(`the SSM parameter ${name} holds no value`);
  return checked(value, `the SSM parameter ${name}`);
}

/** The database the probe's seed and report scripts reach as jadwigo_api: the owner's session URL. */
export function apiDatabaseUrl(): string {
  const url = setting("DATABASE_URL");
  if (!url) throw new Error("DATABASE_URL is unset: make step-probe sets it to jadwigo_api's URL");
  return checked(url, "DATABASE_URL");
}

/** What the probe report names the host it measured: `lambda`, `edge` or `local`. */
export function probeHost(): string {
  return setting("PROBE_HOST") ?? "local";
}
