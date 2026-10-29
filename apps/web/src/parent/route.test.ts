import { AssignmentId, AttemptId, LearnerId } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { attemptPath, claimOf, isParentPath, learnerOf, parentPath, parentRoute } from "./route.ts";

const ASSIGNMENT = AssignmentId.parse("asg_0ectzj2evqb95a3v1v6wewjzy3");
const ATTEMPT = AttemptId.parse("att_43007b83dp9w2tnfjxhha74cyq");
const LEARNER = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");

describe("parentPath", () => {
  it("names the assignment to keep and the language, never an attempt", () => {
    expect(parentPath()).toBe("/parent");
    expect(parentPath({ claim: ASSIGNMENT, lang: "pl" })).toBe(
      `/parent?claim=${ASSIGNMENT}&lang=pl`,
    );
  });
});

describe("claimOf", () => {
  it("reads ?claim, and is null for a missing or malformed one", () => {
    expect(claimOf(new URLSearchParams(`claim=${ASSIGNMENT}`))).toBe(ASSIGNMENT);
    expect(claimOf(new URLSearchParams())).toBeNull();
    expect(claimOf(new URLSearchParams("claim=att_nope"))).toBeNull();
  });
});

describe("attemptPath", () => {
  it("names the attempt in the path, its learner and the language in the query", () => {
    expect(attemptPath({ attempt: ATTEMPT })).toBe(`/parent/attempts/${ATTEMPT}`);
    expect(attemptPath({ attempt: ATTEMPT, learner: LEARNER, lang: "en" })).toBe(
      `/parent/attempts/${ATTEMPT}?learner=${LEARNER}&lang=en`,
    );
  });
});

describe("parentRoute", () => {
  it("reads the home and an attempt, and is null for any other path", () => {
    expect(parentRoute("/parent")).toEqual({ kind: "home" });
    expect(parentRoute("/parent/")).toEqual({ kind: "home" });
    expect(parentRoute(`/parent/attempts/${ATTEMPT}`)).toEqual({
      kind: "attempt",
      attempt: ATTEMPT,
    });
    expect(parentRoute(`/parent/attempts/${ATTEMPT}/`)).toEqual({
      kind: "attempt",
      attempt: ATTEMPT,
    });
    expect(parentRoute("/parent/attempts/asg_0ectzj2evqb95a3v1v6wewjzy3")).toEqual({
      kind: "attempt",
      attempt: null,
    });
    expect(parentRoute("/parent/attempts")).toBeNull();
    expect(parentRoute("/parents")).toBeNull();
    expect(parentRoute("/play/asg_0ectzj2evqb95a3v1v6wewjzy3")).toBeNull();
  });

  it("tells the app's router which paths are the parent's", () => {
    expect(isParentPath("/parent")).toBe(true);
    expect(isParentPath(`/parent/attempts/${ATTEMPT}`)).toBe(true);
    expect(isParentPath("/parents")).toBe(false);
  });

  it("round-trips attemptPath", () => {
    const url = new URL(attemptPath({ attempt: ATTEMPT, learner: LEARNER }), "http://app.local");
    expect(parentRoute(url.pathname)).toEqual({ kind: "attempt", attempt: ATTEMPT });
    expect(learnerOf(url.searchParams)).toBe(LEARNER);
  });
});

describe("learnerOf", () => {
  it("reads ?learner, and is null for a missing or malformed one", () => {
    expect(learnerOf(new URLSearchParams(`learner=${LEARNER}`))).toBe(LEARNER);
    expect(learnerOf(new URLSearchParams())).toBeNull();
    expect(learnerOf(new URLSearchParams(`learner=${ATTEMPT}`))).toBeNull();
  });
});
