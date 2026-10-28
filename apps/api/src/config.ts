/** The api's one read of the environment. */
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

/** The database the routes use, or undefined to serve from an in-memory store. */
export function databaseUrl(): string | undefined {
  return process.env["DATABASE_URL"] || undefined;
}

/** Reads one SecureString, decrypted. The Lambda's role may read only the parameter it names. */
export type ReadParameter = (name: string) => Promise<string | undefined>;

const readSsm: ReadParameter = async (name) => {
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
  if (direct !== undefined) return direct;
  const name = process.env["JADWIGO_DB_URL_PARAM"];
  if (!name)
    throw new Error("set DATABASE_URL or JADWIGO_DB_URL_PARAM: the Lambda serves from Postgres");
  const value = await read(name);
  if (!value) throw new Error(`the SSM parameter ${name} holds no value`);
  return value;
}

/** The local server's port: md's environment sets `PORT` per worktree (tools/src/ports.ts). */
export function port(): number {
  return Number(process.env["PORT"] || 8787);
}
