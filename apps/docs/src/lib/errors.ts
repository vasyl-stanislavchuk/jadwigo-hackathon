import { ERROR_STATUS, type ErrorType } from "@jadwigo/contracts";

/** What each HTTP status means across the API (packages/contracts RULES.md rule 20). */
const STATUS_MEANING: Readonly<Record<number, string>> = {
  400: "The body fails its schema, or sends a field the server owns.",
  401: "The route needs a credential and the request has none, or a wrong one.",
  404: "No such record, or one in another pod. Never 403.",
  409: "The request conflicts with what is already stored.",
  429: "The request is past a limit.",
  502: "An upstream the server calls, the question bank, did not answer.",
};

/** One row of the Errors guide's table: a status and every error type sent with it. */
export interface ErrorRow {
  readonly status: number;
  readonly meaning: string;
  readonly types: readonly ErrorType[];
}

/**
 * ERROR_STATUS grouped by status, lowest first, each status's types in the order the contracts
 * list them. A status with no line in STATUS_MEANING throws, so a new one fails the build.
 */
export function errorRows(table: Readonly<Record<ErrorType, number>> = ERROR_STATUS): ErrorRow[] {
  const byStatus = new Map<number, ErrorType[]>();
  for (const [type, status] of Object.entries(table) as [ErrorType, number][]) {
    const types = byStatus.get(status) ?? [];
    types.push(type);
    byStatus.set(status, types);
  }
  return [...byStatus.entries()]
    .sort(([a], [b]) => a - b)
    .map(([status, types]) => {
      const meaning = STATUS_MEANING[status];
      if (meaning === undefined) throw new Error(`STATUS_MEANING has no line for ${status}`);
      return { status, meaning, types };
    });
}
