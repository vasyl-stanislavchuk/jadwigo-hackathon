import { timingSafeEqual } from "node:crypto";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BankQuestionId, ErrorType, Need, QuestionBody, SearchEnvelope } from "@jadwigo/contracts";
import {
  bankReadTokenParam,
  bankSearchAliasArn,
  CONTENT_BUCKET_PARAM,
  contentBucket,
  type ReadParameter,
  readSsm,
} from "./config.ts";
import { ApiError, badRequest } from "./errors.ts";

/**
 * What the search route needs from outside, injected so tests run on fakes with no network.
 *
 * - `invoke` calls the bank Lambda's `live` alias (`BANK_SEARCH_ALIAS_ARN`) with a JSON payload
 *   and returns the payload it answered, and the function error the SDK reported, if any.
 * - `readToken` is the shared read token callers present, from the SSM parameter
 *   `BANK_READ_TOKEN_PARAM` names. An interim check until `jw login` and `jgw_` tokens exist
 *   (`dl-e8ov.2.11`): an assumption of wave 4, not a decision.
 *
 * The bank's own function URL and token are never read here (decision
 * 2026-10-28-callers-reach-the-bank-only-through-apps-api-which-invokes-the-b).
 */
export interface BankDeps {
  invoke(payload: string): Promise<BankInvokeReply>;
  readToken(): Promise<string | undefined>;
}

export interface BankInvokeReply {
  readonly payload: string | undefined;
  readonly functionError?: string | undefined;
}

/** The bank Lambda's reply to a direct invoke: a function URL response, as service/handler.py writes it. */
interface BankResponse {
  readonly statusCode: number;
  readonly body?: string;
}

const Row = SearchEnvelope.shape.rows.element;

/**
 * `POST /api/v1/question-searches`: the need in, the bank's envelope out. Authorization runs
 * first, then the need is parsed, then the bank is invoked. The reply is parsed with
 * `SearchEnvelope` here and again by the router, so a field the envelope does not name is
 * dropped, and a row carrying a private body is dropped whole, never sent. The route takes no
 * query parameters, so it always asks for stage `final` (arm C with the A1 fallback) and ignores
 * any arm or stage a caller sends; first-stage results through the gateway are a later issue.
 */
export async function searchQuestions(
  bank: BankDeps | undefined,
  headers: Headers,
  body: unknown,
): Promise<SearchEnvelope> {
  // No bank wired (the local server, or a Lambda without the alias): nothing to authorize against.
  if (bank === undefined) throw unavailable();
  await authorizeRead(bank, headers);
  const need = Need.safeParse(body);
  if (!need.success) throw badRequest(need.error.issues);
  const reply = await invokeBank(bank, need.data);
  return publicEnvelope(reply);
}

/**
 * What the question body route reads besides the read token, injected so tests run on a fake.
 * `get` returns the object's text at `key` in the content bucket, or undefined when there is no
 * such object; any other failure throws.
 */
export interface BucketDeps {
  get(key: string): Promise<string | undefined>;
}

/**
 * `GET /api/v1/questions/{id}`: one question's private body, key included, from the content
 * bucket's derived layer `questions/khan/<id>.json`. Authorization runs first, exactly as for a
 * search, so a caller without the read token is 401 whatever id it sends. Then the id must be a
 * `BankQuestionId` (404 otherwise, before it reaches a key), the object must exist (404), the read
 * must succeed (502) and the object must parse as a `QuestionBody` for that id (502).
 */
export async function questionBody(
  bank: BankDeps | undefined,
  bucket: BucketDeps | undefined,
  headers: Headers,
  id: string,
): Promise<QuestionBody> {
  if (bank === undefined) throw unavailable();
  await authorizeRead(bank, headers);
  const parsedId = BankQuestionId.safeParse(id);
  if (!parsedId.success) throw noSuchQuestion();
  if (bucket === undefined) throw unavailable();
  let text: string | undefined;
  try {
    text = await bucket.get(`questions/khan/${parsedId.data}.json`);
  } catch {
    throw unavailable();
  }
  if (text === undefined) throw noSuchQuestion();
  const body = QuestionBody.safeParse(parseJson(text));
  if (!body.success || body.data.id !== parsedId.data) throw unavailable();
  return body.data;
}

/** The client the bucket is read through: `S3Client` in the Lambda, a fake in tests. */
export interface GetObjectClient {
  send(
    command: GetObjectCommand,
  ): Promise<{ Body?: { transformToString(): Promise<string> } | undefined }>;
}

/**
 * The content bucket in the Lambda: its name from `CONTENT_BUCKET`, else from the SSM parameter
 * `/jadwigo/bank/content-bucket`, read once per cold start (again after a failed read), and each
 * object through the SDK. A missing object (`NoSuchKey`, or a 404) is undefined; a name that
 * resolves to nothing, and every other failure, throws, which the route answers 502.
 */
export function lambdaBucket(
  name = contentBucket(),
  read: ReadParameter = readSsm,
  client: GetObjectClient = new S3Client({}),
): BucketDeps {
  let bucket: Promise<string | undefined> | undefined;
  const resolve = (): Promise<string | undefined> => {
    if (name !== undefined) return Promise.resolve(name);
    bucket ??= read(CONTENT_BUCKET_PARAM).then((value) => value?.trim() || undefined);
    bucket.catch(() => {
      bucket = undefined;
    });
    return bucket;
  };
  return {
    async get(key) {
      const Bucket = await resolve();
      if (Bucket === undefined) throw new Error("no content bucket is named");
      try {
        const out = await client.send(new GetObjectCommand({ Bucket, Key: key }));
        if (out.Body === undefined) throw new Error("the object has no body");
        return await out.Body.transformToString();
      } catch (error) {
        if (missing(error)) return undefined;
        throw error;
      }
    },
  };
}

function missing(error: unknown): boolean {
  const e = error as { name?: unknown; $metadata?: { httpStatusCode?: unknown } } | null;
  return e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404;
}

/** The client the bank is invoked through: `LambdaClient` in the Lambda, a fake in tests. */
export interface InvokeClient {
  send(
    command: InvokeCommand,
  ): Promise<{ Payload?: Uint8Array | undefined; FunctionError?: string | undefined }>;
}

/**
 * The bank in the Lambda: the alias `BANK_SEARCH_ALIAS_ARN` names, invoked through the SDK, and
 * the read token from the SSM SecureString `BANK_READ_TOKEN_PARAM` names, read once per cold
 * start (again after a failed read). Undefined when either is unset, so the route answers 502.
 */
export function lambdaBank(
  arn = bankSearchAliasArn(),
  tokenParam = bankReadTokenParam(),
  read: ReadParameter = readSsm,
  client: InvokeClient = new LambdaClient({}),
): BankDeps | undefined {
  if (arn === undefined || tokenParam === undefined) return undefined;
  let token: Promise<string | undefined> | undefined;
  return {
    async invoke(payload) {
      const out = await client.send(
        new InvokeCommand({ FunctionName: arn, Payload: new TextEncoder().encode(payload) }),
      );
      return {
        payload: out.Payload === undefined ? undefined : new TextDecoder().decode(out.Payload),
        functionError: out.FunctionError,
      };
    },
    readToken() {
      token ??= read(tokenParam);
      token.catch(() => {
        token = undefined;
      });
      return token;
    },
  };
}

/**
 * The read check, before anything else: a bearer token equal to the one in SSM. A missing,
 * malformed or wrong token is 401, and so is an empty parameter, so an unset token never opens
 * the route. A read of the parameter that fails is 502. The message never names the token.
 */
async function authorizeRead(bank: BankDeps, headers: Headers): Promise<void> {
  const sent = bearer(headers.get("authorization"));
  let expected: string | undefined;
  try {
    expected = (await bank.readToken())?.trim();
  } catch {
    throw unavailable();
  }
  if (sent === undefined || !expected || !same(sent, expected)) {
    throw new ApiError(ErrorType.enum.Unauthorized, "a bank read needs a valid read token");
  }
}

function bearer(header: string | null): string | undefined {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header ?? "");
  return match?.[1];
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * One invoke of the alias with `{need, stage: "final"}`. A 400 from the bank is the caller's
 * need, so it is a BadRequest with the bank's detail; anything else that is not a 200 envelope
 * (a function error, a throw, a 403 or 500, a body that is not JSON) is BankUnavailable, 502.
 */
async function invokeBank(bank: BankDeps, need: Need): Promise<unknown> {
  let reply: BankInvokeReply;
  try {
    reply = await bank.invoke(JSON.stringify({ need, stage: "final" }));
  } catch {
    throw unavailable();
  }
  if (reply.functionError !== undefined || reply.payload === undefined) throw unavailable();
  const parsed = parseJson(reply.payload);
  // JSON null (a handler that returned None) and any other non-object are no response.
  if (typeof parsed !== "object" || parsed === null) throw unavailable();
  const response = parsed as BankResponse;
  if (typeof response.statusCode !== "number") throw unavailable();
  const answer = parseJson(response.body ?? "");
  if (response.statusCode === 400) {
    throw new ApiError(ErrorType.enum.BadRequest, bankDetail(answer));
  }
  if (response.statusCode !== 200 || answer === undefined) throw unavailable();
  return answer;
}

/**
 * The envelope with only the public fields: rows that do not parse (one with a private body
 * among them) are dropped, and fields the schema does not name are stripped. An answer that
 * is still no envelope is 502.
 */
function publicEnvelope(answer: unknown): SearchEnvelope {
  if (typeof answer !== "object" || answer === null) throw unavailable();
  const rows = (answer as { rows?: unknown }).rows;
  const kept = Array.isArray(rows) ? rows.filter((row) => Row.safeParse(row).success) : rows;
  const parsed = SearchEnvelope.safeParse({ ...answer, rows: kept });
  if (!parsed.success) throw unavailable();
  const sent = Array.isArray(rows) ? rows.length : 0;
  return sent > 0 && parsed.data.rows.length === 0 ? allRowsDropped(parsed.data) : parsed.data;
}

/**
 * The bank answered rows and not one passed the row schema: the shapes have drifted (as they had
 * on 2026-10-29, dl-n9fr.37), so the answering arm's state says `degraded` with the reason, never
 * an empty `ok` a caller would read as "nothing matched".
 */
function allRowsDropped(envelope: SearchEnvelope): SearchEnvelope {
  const detail = "every row the bank answered failed the contract's row schema";
  const arm = envelope.arm ?? "final";
  const state = envelope.state.map((s) =>
    s.arm === arm ? { ...s, state: "degraded" as const, detail } : s,
  );
  if (!state.some((s) => s.arm === arm)) state.push({ arm, state: "degraded", detail });
  return { ...envelope, state };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function bankDetail(answer: unknown): string {
  const detail = (answer as { detail?: unknown } | undefined)?.detail;
  return typeof detail === "string" && detail !== "" ? detail : "the bank refused the need";
}

function unavailable(): ApiError {
  return new ApiError(ErrorType.enum.BankUnavailable, "the question bank did not answer");
}

function noSuchQuestion(): ApiError {
  return new ApiError(ErrorType.enum.NotFound, "no such question");
}
