// The PR body has the /jadwigo-pr shape (dl-5ssh.34.8): Summary, Evidence, Merge Danger, and a door
// stated as one-way or two-way. CI runs it on every PR but Renovate's, with the body in PR_BODY.
// Run: PR_BODY="$(gh pr view <n> --json body --jq .body)" bun tools/src/check-pr-body.ts
const HEADINGS = ["## Summary", "## Evidence", "## Merge Danger"];
const DOOR = /^\*\*Door:\*\*\s*(one-way|two-way)\b/im;

export function checkPrBody(body: string): string[] {
  const problems = HEADINGS.filter((h) => !new RegExp(`^${h}\\s*$`, "m").test(body)).map(
    (h) => `missing the heading "${h}"`,
  );
  if (!DOOR.test(body)) problems.push('missing "**Door:** one-way" or "**Door:** two-way"');
  return problems;
}

if (import.meta.main) {
  const problems = checkPrBody(process.env["PR_BODY"] ?? "");
  for (const p of problems) console.error(`pr body: ${p}. Write it with /jadwigo-pr.`);
  if (problems.length > 0) process.exit(1);
}
