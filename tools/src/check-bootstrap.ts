// The PR plan role in infra/bootstrap stays read-only and trusts only this repo's pull_request runs
// (dl-5ssh.34.4, decision bead dl-w146). The repo is public and a pull_request run executes the PR's
// own workflow, so whatever the role can do, any PR author can do: a write verb, a decrypt, or a trust
// wider than this repo is a leak, not a convenience. Run: bun tools/src/check-bootstrap.ts
import { readFileSync } from "node:fs";

const DIR = "infra/bootstrap";
/** The immutable-id subject GitHub sends for repos created after 15 July 2026 (owner@id/repo@id). */
export const PLAN_SUBJECT =
  "repo:vasyl-stanislavchuk@681519/jadwigo-hackathon@1434530369:pull_request";
const SUB = "token.actions.githubusercontent.com:sub";
const AUD = "token.actions.githubusercontent.com:aud";
const BOUNDARY = "arn:aws:iam::843109108289:policy/jadwigo-boundary";

interface Statement {
  readonly Sid?: string;
  readonly Effect: "Allow" | "Deny";
  readonly Action?: string | string[];
  readonly Resource?: string | string[];
  readonly NotResource?: string | string[];
  readonly Condition?: Record<string, Record<string, string | string[]>>;
}
export interface Policy {
  readonly Statement: Statement[];
}

const list = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

/** A read verb: Get, List or Describe, or API Gateway's GET. Anything else can change the account. */
const READ = /^[a-z0-9-]+:(Get|List|Describe)[A-Za-z]*\*?$|^apigateway:GET$/;

export function checkTrust(trust: Policy): string[] {
  const problems: string[] = [];
  if (trust.Statement.length !== 1) problems.push("plan-trust.json: exactly 1 statement");
  for (const s of trust.Statement) {
    if (s.Effect !== "Allow" || list(s.Action).join() !== "sts:AssumeRoleWithWebIdentity")
      problems.push("plan-trust.json: the statement allows sts:AssumeRoleWithWebIdentity only");
    const eq = s.Condition?.["StringEquals"] ?? {};
    if (list(eq[SUB]).join() !== PLAN_SUBJECT)
      problems.push(`plan-trust.json: ${SUB} is StringEquals "${PLAN_SUBJECT}" and nothing else`);
    if (list(eq[AUD]).join() !== "sts.amazonaws.com")
      problems.push(`plan-trust.json: ${AUD} is StringEquals "sts.amazonaws.com"`);
    for (const op of Object.keys(s.Condition ?? {}))
      if (op !== "StringEquals")
        problems.push(`plan-trust.json: no ${op} condition; a pattern widens the trust`);
  }
  return problems;
}

export function checkPlanPolicy(policy: Policy): string[] {
  const problems: string[] = [];
  for (const s of policy.Statement.filter((s) => s.Effect === "Allow"))
    for (const a of list(s.Action))
      if (!READ.test(a))
        problems.push(
          `plan-policy.json: ${s.Sid ?? "a statement"} allows ${a}, which is not a read`,
        );
  const denies = policy.Statement.filter((s) => s.Effect === "Deny");
  const decrypt = denies.some(
    (s) => list(s.Action).includes("kms:Decrypt") && list(s.Resource).includes("*"),
  );
  if (!decrypt) problems.push("plan-policy.json: Deny kms:Decrypt on *");
  const ssm = denies.find((s) => list(s.Action).includes("ssm:GetParameter*"));
  const spared = list(ssm?.NotResource);
  if (
    !ssm ||
    list(ssm.Resource).length > 0 ||
    spared.some((r) => !r.endsWith(":parameter/jadwigo/bank/search-alias-arn"))
  )
    problems.push(
      "plan-policy.json: Deny ssm:GetParameter* on every parameter but the bank alias (NotResource)",
    );
  return problems;
}

export function checkBoundary(boundary: Policy): string[] {
  const guards = boundary.Statement.some(
    (s) =>
      s.Effect === "Deny" &&
      list(s.Resource).includes(BOUNDARY) &&
      list(s.Action).includes("iam:CreatePolicyVersion"),
  );
  return guards ? [] : ["boundary.json: Deny iam:CreatePolicyVersion on jadwigo-boundary itself"];
}

if (import.meta.main) {
  const read = (f: string): Policy => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8")) as Policy;
  const problems = [
    ...checkTrust(read("plan-trust.json")),
    ...checkPlanPolicy(read("plan-policy.json")),
    ...checkBoundary(read("boundary.json")),
  ];
  for (const p of problems) console.error(`bootstrap: ${p}`);
  if (problems.length > 0) process.exit(1);
}
