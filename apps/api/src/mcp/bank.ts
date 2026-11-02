import { apiBank, type BankPort, type BankReads, fixtureBank } from "@jadwigo/jadwigo-ai";
import { ApiError } from "../errors.ts";
import {
  type BankDeps,
  type BucketDeps,
  questionBody,
  questionSet,
  searchQuestions,
} from "../questions.ts";

/**
 * The bank the MCP's lesson verbs draw from (dl-1u6fn.10): the api's own 3 bank routes called
 * in-process, so no HTTP call goes back to this Lambda and the parent never holds the bank's read
 * token. They check that token as for any caller, so a Lambda whose token is unset refuses here
 * as it refuses over HTTP. With no bank wired (the local server, the tests), the fixture bank.
 */
export function mcpBank(bank: BankDeps | undefined, bucket: BucketDeps | undefined): BankPort {
  if (bank === undefined) return fixtureBank();
  const headers = async () =>
    new Headers({ authorization: `Bearer ${(await bank.readToken())?.trim() ?? ""}` });
  const reads: BankReads = {
    search: async (need) => searchQuestions(bank, await headers(), need),
    set: async (id) => absentAsUndefined(questionSet(bank, await headers(), id)),
    body: async (id) => absentAsUndefined(questionBody(bank, bucket, await headers(), id)),
  };
  return apiBank(reads);
}

/** `BankReads` answers undefined for an id the bank does not hold, where the routes answer 404. */
async function absentAsUndefined<T>(read: Promise<T>): Promise<T | undefined> {
  try {
    return await read;
  } catch (error) {
    if (error instanceof ApiError && error.type === "NotFound") return undefined;
    throw error;
  }
}
