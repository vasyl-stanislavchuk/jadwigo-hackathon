/** The runner's one read of the environment. */
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

/** Reads one SecureString, decrypted. The runner's role may read only the parameter it names. */
export type ReadParameter = (name: string) => Promise<string | undefined>;

export const readSsm: ReadParameter = async (name) => {
  const reply = await new SSMClient({}).send(
    new GetParameterCommand({ Name: name, WithDecryption: true }),
  );
  return reply.Parameter?.Value;
};

/** A setting, trimmed; blank counts as unset. */
function setting(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

/** PostHog's public project key, where errors are reported (dl-5ssh.158). Unset, none are. */
export function posthogKey(): string | undefined {
  return setting("JW_POSTHOG_KEY");
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

/** Where the verbs read the bank: the API's origin and the bank's read token. */
export interface BankConfig {
  base: string;
  token: string;
}

/**
 * The bank the verbs draw from (dl-1u6fn.4): `JADWIGO_API_URL` and the read token, from
 * `JADWIGO_BANK_READ_TOKEN` (a local run) or the SSM SecureString `BANK_READ_TOKEN_PARAM` names,
 * read once per cold start. Undefined when the URL is unset, and the host draws from the fixture.
 */
export async function bankConfig(read: ReadParameter = readSsm): Promise<BankConfig | undefined> {
  const base = setting("JADWIGO_API_URL");
  if (base === undefined) return undefined;
  let token = setting("JADWIGO_BANK_READ_TOKEN");
  if (token === undefined) {
    const name = setting("BANK_READ_TOKEN_PARAM");
    if (!name) throw new Error("JADWIGO_API_URL is set: set BANK_READ_TOKEN_PARAM too");
    token = (await read(name))?.trim() || undefined;
    if (token === undefined) throw new Error(`the SSM parameter ${name} holds no value`);
  }
  return { base, token };
}

/**
 * A local jadwigo database, the rule `make`'s LOCAL_DB_GATE holds: postgres(ql)://, an optional
 * login, localhost or 127.0.0.1, an optional port, and a database named jadwigo….
 */
const LOCAL_DB =
  /^postgres(ql)?:\/\/([A-Za-z0-9._~%+=:-]+@)?(localhost|127\.0\.0\.1)(:[0-9]+)?\/jadwigo[A-Za-z0-9_]*$/;

export function isLocalDatabaseUrl(url: string): boolean {
  return LOCAL_DB.test(url.trim());
}

/**
 * The dev runner's database (`make dev-all`, dl-uukj.47.14.2): `LOCAL_DATABASE_URL`, else the
 * `DATABASE_URL` make sets from it, and only when it is a local jadwigo database. Never
 * `RUNNER_DATABASE_URL` and never SSM: a laptop must not drain a deployed queue, sending real
 * families' turns to the model as paid calls.
 */
export function devDatabaseUrl(): string {
  const url = setting("LOCAL_DATABASE_URL") ?? setting("DATABASE_URL");
  if (url === undefined) {
    throw new Error("set LOCAL_DATABASE_URL (make dev-all does) to a local jadwigo database");
  }
  if (!isLocalDatabaseUrl(url)) {
    throw new Error(
      "the dev runner drains a local database only: LOCAL_DATABASE_URL (or DATABASE_URL) is not postgresql://[user[:password]@]localhost[:port]/jadwigo…",
    );
  }
  return checked(url, "LOCAL_DATABASE_URL or DATABASE_URL");
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

/** The model tier a learner turn runs on: the contributor model unless the host is set otherwise. */
type MuseTier = "contributor" | "private";

/** What the host's `HttpMuse` needs: the Meta key, the lane's cap, the tier and its model. */
export interface MuseConfig {
  api_key: string;
  lane_cap_usd: number;
  /**
   * `JADWIGO_MUSE_TIER`, `contributor` by default: the owner's decision of 2026-11-01 lets learner
   * turns, names included, run on any Meta model (noted on dl-z5ja.20; dl-z5ja.22 closed).
   */
  tier: MuseTier;
  /** `JADWIGO_MUSE_PRIVATE_MODEL`, which the `private` tier needs; null when unnamed. */
  private_model: string | null;
}

/**
 * The key is `META_API_KEY` when it is in the environment (a laptop, which sources
 * `~/.config/jadwigo-bank/muse.env`), else the SSM SecureString `JADWIGO_MUSE_KEY_PARAM` names, read
 * once per cold start. The cap is `JADWIGO_MUSE_CAP_USD`, required: no call without a cap.
 */
export async function museConfig(read: ReadParameter = readSsm): Promise<MuseConfig> {
  let api_key = setting("META_API_KEY");
  if (api_key === undefined) {
    const name = setting("JADWIGO_MUSE_KEY_PARAM");
    if (!name) throw new Error("set META_API_KEY or JADWIGO_MUSE_KEY_PARAM: the host calls Muse");
    api_key = (await read(name))?.trim() || undefined;
    if (api_key === undefined) throw new Error(`the SSM parameter ${name} holds no value`);
  }
  const lane_cap_usd = Number(setting("JADWIGO_MUSE_CAP_USD") ?? "");
  if (!(lane_cap_usd > 0)) {
    throw new Error(
      "JADWIGO_MUSE_CAP_USD is unset or not a positive number: no call without a cap",
    );
  }
  const tier = setting("JADWIGO_MUSE_TIER") ?? "contributor";
  if (tier !== "contributor" && tier !== "private") {
    throw new Error(`JADWIGO_MUSE_TIER is ${tier}: contributor or private`);
  }
  const private_model = setting("JADWIGO_MUSE_PRIVATE_MODEL") ?? null;
  if (tier === "private" && private_model === null) {
    throw new Error("JADWIGO_MUSE_TIER is private: name its model in JADWIGO_MUSE_PRIVATE_MODEL");
  }
  return { api_key, lane_cap_usd, tier, private_model };
}

/**
 * The SSM parameter holding the uploads bucket's name when `UPLOADS_BUCKET` is unset
 * (dl-z5ja.11.2's Terraform writes it, as the bank's writes the content bucket's).
 */
export const UPLOADS_BUCKET_PARAM = "/jadwigo/uploads/bucket";

/** The bucket a parent's photos are read from, `UPLOADS_BUCKET`; undefined when unset or blank. */
export function uploadsBucket(): string | undefined {
  return setting("UPLOADS_BUCKET");
}

/**
 * The converter Lambda's ARN, `CONVERTER_FUNCTION`: dl-z5ja.11.8's Terraform sets it once the
 * owner has pushed an image and set its tag. Undefined when unset or blank, and then a PDF, a DOCX
 * or a HEIC is refused as `unavailable`.
 */
export function converterFunction(): string | undefined {
  return setting("CONVERTER_FUNCTION");
}

/**
 * The folder `make dev-all`'s uploads stand-in keeps photos in (dl-z5ja.11.19), `.logs/dev/uploads`,
 * the same one the local api writes: set, the dev step host reads a turn's photos from it.
 * Undefined when unset or blank; the Lambda never reads it.
 */
export function localUploadsDir(): string | undefined {
  return setting("LOCAL_UPLOADS_DIR");
}
