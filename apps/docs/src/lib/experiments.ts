import { z } from "zod";

/**
 * One experiment's result (epic `dl-5ssh.90.53`, bead `dl-5ssh.90.53.1`): what ran, on which
 * model, what it cost and what came out, as `src/data/experiments/<id>.json`. An experiment page
 * shows it with `<ExperimentResult id="e1" />`; the test beside this file validates every JSON
 * there, so a lane's run either fits this shape or says why it cannot.
 *
 * Cost keeps its source: the product path's calls come from its ledger, and a `muse exec` run's
 * tokens from `muse trace` or `muse export`. A run that called no model says `model: "none"`,
 * 0 calls and `cost_source: "ledger"`, with its $0 in `usd`.
 */
const experimentResult = z.object({
  /** The experiment's id, its file's stem: `e1` to `e7`. */
  id: z.string().min(1),
  /** What the experiment shows, in the words its page opens with. */
  title: z.string().min(1),
  /** `running` until the lane's run lands; its page ships with the badge either way. */
  status: z.enum(["running", "done"]),
  /** The model that ran, such as `muse-wonder-full-1.0`; `none` for a local, code-only run. */
  model: z.string().min(1),
  /** How many model calls the run made. */
  calls: z.number().int().nonnegative(),
  tokens: z.object({
    input: z.number().int().nonnegative(),
    output: z.number().int().nonnegative(),
  }),
  /** What the run cost in US dollars. */
  usd: z.number().nonnegative(),
  /** Where `usd` and `tokens` were read from: the product ledger, or a Muse trace. */
  cost_source: z.enum(["ledger", "muse-trace"]),
  /** The run's wall-clock seconds. */
  wall_s: z.number().nonnegative(),
  /** The commit the run ran at, short or full. */
  commit: z.string().min(1),
  /** The command lines that reproduce the run, in order. */
  commands: z.array(z.string().min(1)),
  /** The outcomes a judge reads first, each a label and its value as the run reported it. */
  results: z.array(
    z.object({
      label: z.string().min(1),
      value: z.union([z.string(), z.number()]),
    }),
  ),
});

export type ExperimentResultData = z.infer<typeof experimentResult>;

/** A result JSON parsed against the schema, or the errors that keep it out, one line each. */
export function parseExperiment(
  json: unknown,
): { ok: true; data: ExperimentResultData } | { ok: false; problems: string[] } {
  const parsed = experimentResult.safeParse(json);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    problems: parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    ),
  };
}
