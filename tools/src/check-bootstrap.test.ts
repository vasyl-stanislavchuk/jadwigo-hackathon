import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  checkBoundary,
  checkPlanPolicy,
  checkTrust,
  PLAN_SUBJECT,
  type Policy,
} from "./check-bootstrap.ts";

const read = (f: string): Policy =>
  JSON.parse(
    readFileSync(new URL(`../../infra/bootstrap/${f}`, import.meta.url), "utf8"),
  ) as Policy;
const trust = read("plan-trust.json");
const policy = read("plan-policy.json");
const boundary = read("boundary.json");
const SUB = "token.actions.githubusercontent.com:sub";

/** The policy with one statement changed by `edit`, the rest as in the repo. */
const withStatement = (p: Policy, sid: string, edit: (s: object) => object): Policy => ({
  Statement: p.Statement.map((s) => (s.Sid === sid ? (edit(s) as typeof s) : s)),
});

describe("check-bootstrap", () => {
  it("passes on the repo as it is", () => {
    expect(checkTrust(trust)).toEqual([]);
    expect(checkPlanPolicy(policy)).toEqual([]);
    expect(checkBoundary(boundary)).toEqual([]);
  });

  it("lets the plan read EventBridge Scheduler, so a PR plan refreshes module.runner's schedule (dl-5ssh.34.72)", () => {
    const allowed = policy.Statement.filter((s) => s.Effect === "Allow").flatMap((s) =>
      Array.isArray(s.Action) ? s.Action : s.Action === undefined ? [] : [s.Action],
    );
    // An IAM action pattern: `*` matches any run of characters.
    const grants = (action: string) =>
      allowed.some((a) => new RegExp(`^${a.replaceAll("*", ".*")}$`).test(action));
    for (const action of [
      "scheduler:GetSchedule",
      "scheduler:ListSchedules",
      "scheduler:ListTagsForResource",
    ])
      expect(grants(action), action).toBe(true);
    expect(grants("scheduler:UpdateSchedule")).toBe(false);
  });

  it("fails on a trust that takes any branch of the repo", () => {
    const wide = withStatement(trust, "PullRequestRunsOfThisRepoOnly", (s) => ({
      ...s,
      Condition: {
        StringEquals: { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
        StringLike: { [SUB]: "repo:vasyl-stanislavchuk/jadwigo-hackathon:*" },
      },
    }));
    expect(checkTrust(wide)).toEqual([
      `plan-trust.json: ${SUB} is StringEquals "${PLAN_SUBJECT}" and nothing else`,
      "plan-trust.json: no StringLike condition; a pattern widens the trust",
    ]);
  });

  it("fails on the old name-only subject, which a recreated repo of the same name would match", () => {
    const old = JSON.parse(
      JSON.stringify(trust).replace(
        PLAN_SUBJECT,
        "repo:vasyl-stanislavchuk/jadwigo-hackathon:pull_request",
      ),
    ) as Policy;
    expect(checkTrust(old)).toHaveLength(1);
  });

  it("fails on a write verb in an Allow", () => {
    const write = withStatement(policy, "ReadProdState", (s) => ({ ...s, Action: "s3:PutObject" }));
    expect(checkPlanPolicy(write)).toEqual([
      "plan-policy.json: ReadProdState allows s3:PutObject, which is not a read",
    ]);
  });

  it("fails when the SSM Deny is gone, so the SecureStrings could be read", () => {
    const open = {
      Statement: policy.Statement.filter((s) => s.Sid !== "NoParameterValueButTheBankAlias"),
    };
    expect(checkPlanPolicy(open)).toEqual([
      "plan-policy.json: Deny ssm:GetParameter* on every parameter but the bank alias (NotResource)",
    ]);
  });

  it("fails when the decrypt Deny is gone", () => {
    const open = { Statement: policy.Statement.filter((s) => s.Sid !== "NeverDecrypt") };
    expect(checkPlanPolicy(open)).toEqual(["plan-policy.json: Deny kms:Decrypt on *"]);
  });

  it("fails on a boundary a role could rewrite", () => {
    const editable = {
      Statement: boundary.Statement.filter((s) => s.Sid !== "TheBoundaryIsNotEditable"),
    };
    expect(checkBoundary(editable)).toHaveLength(1);
  });
});
