import type { Need, SearchEnvelope, SearchRow } from "@jadwigo/contracts";

/**
 * What a caller of the bank holds: one search, the need in and the public envelope out. It
 * rejects with a `BankError` when the bank refuses the need, cannot answer, or times out.
 */
export interface BankSearch {
  search(need: Need): Promise<SearchEnvelope>;
}

/**
 * The 4 ports a bank backend is built from. The Python service in `jadwigo-bank` implements them
 * (S3 Vectors, DynamoDB, Voyage); the backends here only search through `BankSearch`, so these
 * name the seam for a later TypeScript backend and are not built in this package.
 */
export interface BankReader {
  /** The public row of one question set, or undefined for an unknown id. */
  row(id: string): Promise<SearchRow | undefined>;
  /** The bank's revision: what was published, by content. */
  rev(): Promise<string>;
}

export interface QuestionIndex {
  /** The nearest sets to a vector, best first, at most `depth`. */
  nearest(
    vector: readonly number[],
    depth: number,
  ): Promise<readonly { id: string; score: number }[]>;
  /** Sets holding the words, best first. */
  keyword(
    words: readonly string[],
    depth: number,
  ): Promise<readonly { id: string; score: number }[]>;
}

export interface Embedder {
  embed(texts: readonly string[]): Promise<readonly (readonly number[])[]>;
}

export interface Reranker {
  /** Scores for each candidate's text against the query, in the candidates' order. */
  rerank(query: string, candidates: readonly string[]): Promise<readonly number[]>;
}
