import { ROUTES, type RouteName } from "@jadwigo/contracts";
import { InMemoryStore } from "@jadwigo/store";
import { describe, expect, it } from "vitest";
import { mcpReadSuite } from "../testing/mcp-read.suite.ts";
import { TOOLS } from "./tools/index.ts";

mcpReadSuite("InMemoryStore", () => new InMemoryStore());

/**
 * Every token GET a parent's app reads, and the MCP tool that reads it (decision
 * `2026-11-02-the-remote-mcp-reads-everything-a-parent-can-read-in-the-app-and`). A new token GET
 * fails the test below until it gets a tool here or a reason in `EXCLUDED`.
 */
const READ_TOOLS: Partial<Record<RouteName, string>> = {
  getMe: "me",
  getLearnerAttempts: "learner_attempts",
  getParentReview: "attempt_review",
  getAssignmentAttempts: "assignment_attempts",
  getLearnerSkills: "learner_skills",
  listSkills: "skills",
  getLearnerGoals: "learner_goals",
  getLearnerReports: "report_list",
  listConversations: "conversation_list",
  listConversationRuns: "conversation_runs",
  listRunEvents: "run_events",
  getAttachment: "attachment_get",
};
/** Token GETs with no read tool, each with why. */
const EXCLUDED: Partial<Record<RouteName, string>> = {};

describe("the MCP read tools' coverage", () => {
  it("gives every token GET in ROUTES a tool, or a stated reason for none", () => {
    const gets = (Object.keys(ROUTES) as RouteName[]).filter(
      (name) => ROUTES[name].auth === "token" && ROUTES[name].method === "GET",
    );
    const names = new Set(TOOLS.map((t) => t.name));
    for (const route of gets) {
      const tool = READ_TOOLS[route];
      if (tool === undefined) expect(EXCLUDED[route], `${route} has no tool`).toBeTruthy();
      else expect(names.has(tool), `${route}: no tool ${tool}`).toBe(true);
    }
    // The map names only real token GETs, so a renamed route fails here too.
    for (const route of Object.keys(READ_TOOLS) as RouteName[]) expect(gets).toContain(route);
  });

  it("names every tool once", () => {
    const names = TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
