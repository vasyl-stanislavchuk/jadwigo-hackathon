import { ERROR_STATUS, type ErrorEnvelope, ErrorType } from "@jadwigo/contracts";
import { StoreError } from "@jadwigo/store";

/** A refusal a route makes itself, named as the contracts name it (RULES.md rule 20). */
export class ApiError extends Error {
  constructor(
    readonly type: ErrorType,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function errorResponse(type: ErrorType, message: string): Response {
  const body: ErrorEnvelope = { error: { type, message } };
  return json(ERROR_STATUS[type], body);
}

/** A StoreError or an ApiError as `{error: {type, message}}`; anything else is not ours to name. */
export function refusal(error: unknown): Response | undefined {
  if (error instanceof ApiError || error instanceof StoreError)
    return errorResponse(error.type, error.message);
  return undefined;
}

/** A schema's first complaint, as a person reads it. */
export function badRequest(issues: readonly { path: PropertyKey[]; message: string }[]): ApiError {
  const first = issues[0];
  const where = first && first.path.length > 0 ? `${first.path.map(String).join(".")}: ` : "";
  return new ApiError(ErrorType.enum.BadRequest, `${where}${first?.message ?? "a bad request"}`);
}
