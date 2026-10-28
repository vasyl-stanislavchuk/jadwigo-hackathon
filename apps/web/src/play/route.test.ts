import { AssignmentId } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { playPath, playRoute } from "./route.ts";

describe("playRoute", () => {
  it("reads the assignment from /play/<id>", () => {
    const id = AssignmentId.parse("asg_0ectzj2evqb95a3v1v6wewjzy3");
    expect(playRoute(playPath(id))).toEqual({ assignmentId: id });
    expect(playRoute(`${playPath(id)}/`)).toEqual({ assignmentId: id });
  });

  it("names no lesson for a malformed id, and is null off the player's paths", () => {
    expect(playRoute("/play/not-an-id")).toEqual({ assignmentId: null });
    expect(playRoute("/")).toBeNull();
    expect(playRoute("/playground")).toBeNull();
  });
});
