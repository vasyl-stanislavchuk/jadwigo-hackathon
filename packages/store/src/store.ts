import type { LearnerId } from "@jadwigo/contracts";

/** One learner's record. Its fields wait on the record mapping (dl-e8ov.5.34). */
export interface LearnerRecord {
  readonly learnerId: LearnerId;
  readonly displayName: string;
}

/**
 * The seam every app writes records through. The in-memory store backs unit tests and local runs;
 * the Postgres implementation (Supabase) comes once dl-e8ov.5.34 says which record lives where.
 */
export interface Store {
  get(learnerId: LearnerId): Promise<LearnerRecord | undefined>;
  put(record: LearnerRecord): Promise<void>;
}

export class InMemoryStore implements Store {
  readonly #records = new Map<LearnerId, LearnerRecord>();

  async get(learnerId: LearnerId): Promise<LearnerRecord | undefined> {
    return this.#records.get(learnerId);
  }

  async put(record: LearnerRecord): Promise<void> {
    this.#records.set(record.learnerId, record);
  }
}
