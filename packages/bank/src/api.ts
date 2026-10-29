import { apiUrl } from "@jadwigo/api-client";
import { ErrorEnvelope, ROUTES } from "@jadwigo/contracts";
import { BankError, publicEnvelope } from "./envelope.ts";
import type { BankSearch } from "./ports.ts";

export interface ApiBankOptions {
  /** Where the API is: "" for the page's own origin. */
  readonly base: string;
  /** The read token the route checks, sent as a bearer token. */
  readonly token?: string | undefined;
  readonly fetch?: typeof fetch;
  /** How long a search may take before it is a `timeout`. Default 10 seconds. */
  readonly timeoutMs?: number;
}

/**
 * The bank through `POST /api/v1/question-searches` (decision
 * 2026-10-28-callers-reach-the-bank-only-through-apps-api-which-invokes-the-b). A 4xx is
 * `refused` with the route's message, a 5xx or no answer is `unavailable`, and the reply goes
 * through `publicEnvelope` like every backend's.
 */
export function apiSearch({
  base,
  token,
  fetch: send = globalThis.fetch,
  timeoutMs = 10_000,
}: ApiBankOptions): BankSearch {
  const route = ROUTES.questionSearches;
  return {
    async search(need) {
      const headers: Record<string, string> = {
        accept: "application/json",
        "content-type": "application/json",
      };
      if (token !== undefined) headers["authorization"] = `Bearer ${token}`;
      let reply: Response;
      try {
        reply = await send(apiUrl(base, route.path), {
          method: route.method,
          headers,
          body: JSON.stringify(need),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "TimeoutError")
          throw new BankError("timeout", `the bank took over ${timeoutMs}ms`);
        throw new BankError("unavailable", "no answer from the bank route");
      }
      const json: unknown = await reply.json().catch(() => undefined);
      if (reply.status >= 500)
        throw new BankError("unavailable", `the bank route answered ${reply.status}`);
      if (!reply.ok) {
        const refusal = ErrorEnvelope.safeParse(json);
        throw new BankError(
          "refused",
          refusal.success ? refusal.data.error.message : `the bank route answered ${reply.status}`,
        );
      }
      return publicEnvelope(json);
    },
  };
}
