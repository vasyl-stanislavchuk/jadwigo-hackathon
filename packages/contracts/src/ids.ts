import { z } from "zod";

/**
 * A learner's id. The brand means a plain string is not a LearnerId: the only way to get one is
 * through this parser, so every id in the system has been checked once at the edge.
 */
export const LearnerId = z
  .string()
  .regex(/^lrn_[0-9a-z]{12}$/, "a learner id is lrn_ and 12 lowercase letters or digits")
  .brand<"LearnerId">();
export type LearnerId = z.infer<typeof LearnerId>;
