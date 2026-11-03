/**
 * A feature or vision page's status (epic `dl-5ssh.90.53`, bead `dl-5ssh.90.53.1`): where the
 * thing it describes stands, as of a date, with the pull requests that put it there. The
 * frontmatter fields are declared in `src/content.config.ts`; `Status.astro` draws the badge and
 * `status.test.ts` fails a page under `features/` or `vision/` that lacks one of them.
 */

/** Every status a page may carry, in the order a judge meets them on the splash. */
export const STATUSES = ["live", "main", "vision"] as const;

export type DocStatus = (typeof STATUSES)[number];

/** What each status says on its badge. */
export const STATUS_LABEL: Readonly<Record<DocStatus, string>> = {
  live: "Live on prod",
  main: "On main, not yet on prod",
  vision: "Vision",
};

/** The frontmatter block's text, or "" when the page has none. */
function frontmatter(text: string): string {
  return /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? "";
}

/** One frontmatter field's value as written (`status: live` gives `live`), if the field is there. */
function field(block: string, name: string): string | undefined {
  return new RegExp(`^${name}:\\s*(.*)$`, "m").exec(block)?.[1]?.trim();
}

/**
 * Every way a page's status frontmatter is incomplete, one line each; none when it carries a
 * status in STATUSES, an `as_of` date and a `prs` list (empty when nothing shipped it yet).
 */
export function statusProblems(text: string): string[] {
  const problems: string[] = [];
  const block = frontmatter(text);
  if (block === "") return ["has no frontmatter, so no status, as_of or prs"];

  const status = field(block, "status");
  if (status === undefined || status === "") problems.push("has no status");
  else if (!(STATUSES as readonly string[]).includes(status))
    problems.push(`status is "${status}", not one of ${STATUSES.join(", ")}`);

  const asOf = field(block, "as_of");
  if (asOf === undefined || asOf === "") problems.push("has no as_of");
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || Number.isNaN(Date.parse(asOf)))
    problems.push(`as_of is "${asOf}", not a date written 2026-11-03`);

  const prs = field(block, "prs");
  if (prs === undefined || prs === "") problems.push("has no prs");
  else if (!/^\[\s*(\d+\s*(,\s*\d+\s*)*)?\]$/.test(prs))
    problems.push(`prs is "${prs}", not a list of pull request numbers like [737, 775]`);

  return problems;
}
