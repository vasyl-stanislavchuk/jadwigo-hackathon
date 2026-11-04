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

/** PostHog's public project key, where errors are reported (dl-5ssh.158). Unset, none are. */
export function posthogKey(): string | undefined {
  return process.env["JW_POSTHOG_KEY"]?.trim() || undefined;
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
 * The OAuth authorization server the remote MCP names in its protected-resource metadata
 * (`/.well-known/oauth-protected-resource`, dl-1u6fn.8): `MCP_AUTHORIZATION_SERVER`, else
 * `AUTH_ISSUER`, since a token's `iss` is its authorization server's issuer. Undefined when both
 * are unset: the metadata then names none.
 */
export function mcpAuthorizationServer(): string | undefined {
  return process.env["MCP_AUTHORIZATION_SERVER"]?.trim() || authIssuer();
}

/**
 * The remote MCP's public URL, `https://app.jadwigo.pl/api/mcp`, as its metadata's `resource`
 * and its 401's `resource_metadata` name it. CloudFront hands the Lambda API Gateway's host, so
 * the Lambda needs it set (dl-1u6fn.2); unset or blank, the request's own URL stands in (`make dev`).
 */
export function mcpResourceUrl(): string | undefined {
  return process.env["MCP_RESOURCE_URL"]?.trim() || undefined;
}

/**
 * The bank Lambda's `live` alias ARN the search route invokes, which Terraform sets from the
 * bank root's SSM handshake (`dl-5ssh.57`). Undefined when unset or blank: no bank is wired.
 */
export function bankSearchAliasArn(): string | undefined {
  return process.env["BANK_SEARCH_ALIAS_ARN"]?.trim() || undefined;
}

/**
 * The name of the SSM SecureString holding the Send Email Hook's secrets, one per Supabase project
 * that calls it (`/jadwigo/<env>/send-email-hook-secret`, dl-liwi.33). Unset, the hook is not wired.
 */
export function sendEmailHookSecretParam(): string | undefined {
  return process.env["SEND_EMAIL_HOOK_SECRET_PARAM"]?.trim() || undefined;
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

/**
 * The step host's live alias ARN the message routes poke after a commit (dl-z5ja.88), or
 * undefined to poke nothing: the host's every-minute schedule drains the queue behind it.
 */
export function runnerLiveAliasArn(): string | undefined {
  return process.env["RUNNER_LIVE_ALIAS_ARN"]?.trim() || undefined;
}

/**
 * Where `make dev-all`'s step host listens on this machine (dl-uukj.47.14.1): `unix:<path>` for its
 * socket, or an `http://` URL. Set, the local server pokes it after a commit in place of the
 * Lambda's alias; undefined when unset or blank.
 */
export function localRunnerUrl(): string | undefined {
  return process.env["LOCAL_RUNNER_URL"]?.trim() || undefined;
}

/**
 * The SSM parameter holding the uploads bucket's name when `UPLOADS_BUCKET` is unset, as with the
 * content bucket: infra's `modules/uploads` writes it (dl-z5ja.11.2).
 */
export const UPLOADS_BUCKET_PARAM = "/jadwigo/uploads/bucket";

/**
 * The bucket a message's photos go to (dl-z5ja.11.2): `pending/<pod>/<id>` for the browser's upload,
 * `pods/<pod>/attachments/<id>.jpg` once a message carries it. `UPLOADS_BUCKET`, as Terraform sets
 * it on the function, else the name in `UPLOADS_BUCKET_PARAM`; undefined when neither names one.
 */
export async function uploadsBucket(read: ReadParameter = readSsm): Promise<string | undefined> {
  const direct = process.env["UPLOADS_BUCKET"]?.trim();
  if (direct) return direct;
  return (await read(UPLOADS_BUCKET_PARAM))?.trim() || undefined;
}

/**
 * The folder `make dev-all`'s uploads stand-in keeps photos in (dl-z5ja.11.19), `.logs/dev/uploads`:
 * set, serve.ts serves the photo routes from it in place of S3. Undefined when unset or blank; the
 * Lambda never reads it.
 */
export function localUploadsDir(): string | undefined {
  return process.env["LOCAL_UPLOADS_DIR"]?.trim() || undefined;
}

/**
 * The print Lambda's ARN the print route starts with an async invoke (dl-1eieq.8.4), or undefined
 * where none is set up: the print routes then answer 502 `PrintUnavailable`.
 */
export function printFunction(): string | undefined {
  return process.env["PRINT_FUNCTION"]?.trim() || undefined;
}

/** Where lesson pictures are served from, as apps/web's `VITE_MEDIA_URL`; "" when unset. */
export function mediaUrl(): string {
  return process.env["MEDIA_URL"]?.trim() ?? "";
}
