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
 * The converter Lambda's name, `CONVERTER_FUNCTION` (dl-z5ja.11.8's Terraform sets it); undefined
 * when unset or blank, and then a PDF, a DOCX or a HEIC is refused as `unavailable`.
 */
export function converterFunction(): string | undefined {
  return setting("CONVERTER_FUNCTION");
}
