/** The api's one read of the environment. */
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { apiPort } from "../../../tools/src/ports.ts";

/** The database the routes use, or undefined to serve from an in-memory store. Blank counts as unset. */
export function databaseUrl(): string | undefined {
  return process.env["DATABASE_URL"]?.trim() || undefined;
}

/**
 * The URL, trimmed, once `new URL()` parses it with a postgres scheme and a host, so a slip (a
 * leading space, an unencoded `#` in the password) fails here, naming its source, rather than at
 * the first query against host `base`. The error never carries the value: it holds the password.
 */
function checkedDatabaseUrl(value: string, source: string): string {
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(
      `${source} is not a URL: percent-encode any reserved character in the password`,
    );
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:")
    throw new Error(`${source} is not a postgres:// or postgresql:// URL`);
  if (!url.hostname) throw new Error(`${source} names no host`);
  if (url.hash) throw new Error(`${source} has a '#': percent-encode it in the password as %23`);
  return trimmed;
}

/** Reads one SecureString, decrypted. The Lambda's role may read only the parameter it names. */
export type ReadParameter = (name: string) => Promise<string | undefined>;

export const readSsm: ReadParameter = async (name) => {
  const reply = await new SSMClient({}).send(
    new GetParameterCommand({ Name: name, WithDecryption: true }),
  );
  return reply.Parameter?.Value;
};

/**
 * The Lambda's database: `DATABASE_URL` when it is set (a local invoke), else the SSM SecureString
 * `JADWIGO_DB_URL_PARAM` names, which holds jadwigo_api's transaction pooler URL (port 6543). The
 * entry calls it once per cold start, so the secret is never in Terraform's state or the function's
 * environment.
 */
export async function lambdaDatabaseUrl(read: ReadParameter = readSsm): Promise<string> {
  const direct = databaseUrl();
  if (direct !== undefined) return checkedDatabaseUrl(direct, "DATABASE_URL");
  const name = process.env["JADWIGO_DB_URL_PARAM"];
  if (!name)
    throw new Error("set DATABASE_URL or JADWIGO_DB_URL_PARAM: the Lambda serves from Postgres");
  const value = (await read(name))?.trim();
  if (!value) throw new Error(`the SSM parameter ${name} holds no value`);
  return checkedDatabaseUrl(value, `the SSM parameter ${name}`);
}

/** The local server's port: md's `API_PORT` per worktree, else the main checkout's default
 * (tools/src/ports.ts). */
export function port(): number {
  return apiPort(process.env);
}

/**
 * Where the token routes' keys are: Supabase's JWKS, `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`.
 * Unset, the local server and the Lambda accept no token unless API Gateway's authorizer verified
 * one; the tests sign with a key of their own (src/testing/token.ts).
 */
export function authJwksUrl(): string | undefined {
  return process.env["AUTH_JWKS_URL"]?.trim() || undefined;
}

/**
 * The `iss` a token verified against `AUTH_JWKS_URL` must carry, exactly: the Supabase project's
 * Auth issuer, as its tokens state it (`https://<ref>.supabase.co/auth/v1`, or the custom domain's
 * once Auth runs on `auth.jadwigo.pl`, `dl-e8ov.2.65`). Never inferred from the JWKS URL. Unset or
 * blank, no token verifies against the JWKS.
 */
export function authIssuer(): string | undefined {
  return process.env["AUTH_ISSUER"]?.trim() || undefined;
}

/**
 * The bank Lambda's `live` alias ARN the search route invokes, which Terraform sets from the
 * bank root's SSM handshake (`dl-5ssh.57`). Undefined when unset or blank: no bank is wired.
 */
export function bankSearchAliasArn(): string | undefined {
  return process.env["BANK_SEARCH_ALIAS_ARN"]?.trim() || undefined;
}

/**
 * The name of the SSM SecureString holding the read token callers present to the search route
 * (`/jadwigo/<env>/bank-read-token`). Interim until `jw login` exists (`dl-e8ov.2.11`).
 */
export function bankReadTokenParam(): string | undefined {
  return process.env["BANK_READ_TOKEN_PARAM"]?.trim() || undefined;
}

/**
 * The SSM parameter holding the content bucket's name when `CONTENT_BUCKET` is unset. The bank's
 * Terraform writes it beside `/jadwigo/bank/search-alias-arn`.
 */
export const CONTENT_BUCKET_PARAM = "/jadwigo/bank/content-bucket";

/**
 * The content bucket the question body route reads `questions/<source>/<id>.json` from, as the infra
 * lane sets it on the function. Undefined when unset or blank: the name is then read from SSM.
 */
export function contentBucket(): string | undefined {
  return process.env["CONTENT_BUCKET"]?.trim() || undefined;
}
