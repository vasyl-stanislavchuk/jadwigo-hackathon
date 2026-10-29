import { AssignmentId } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { playPath, playRoute, reviewPath } from "./route.ts";

describe("playRoute", () => {
  it("reads the assignment from /play/<id>", () => {
    const id = AssignmentId.parse("asg_0ectzj2evqb95a3v1v6wewjzy3");
    expect(playRoute(playPath(id))).toEqual({ assignmentId: id });
    expect(playRoute(`${playPath(id)}/`)).toEqual({ assignmentId: id });
  });

  it("names no lesson for a malformed id, and is null off the player's paths", () => {
    expect(playRoute("/play/not-an-id")).toEqual({ assignmentId: null });
    // decodeURIComponent throws on this; App calls playRoute while rendering (dl-5ssh.3.9).
    expect(playRoute("/play/%E0%A4")).toEqual({ assignmentId: null });
    expect(playRoute("/")).toBeNull();
    expect(playRoute("/playground")).toBeNull();
  });

  it("reads the question a review path opens (dl-uukj.30.1)", () => {
    const id = AssignmentId.parse("asg_0ectzj2evqb95a3v1v6wewjzy3");
    expect(reviewPath(id, 3)).toBe(`/play/${id}/review/3`);
    expect(playRoute(reviewPath(id, 3))).toStrictEqual({ assignmentId: id, review: 3 });
    expect(playRoute(`${reviewPath(id, 12)}/`)).toStrictEqual({ assignmentId: id, review: 12 });
  });

  it("opens the list for a review path with no whole seq, and names no lesson for a bad id", () => {
    const id = AssignmentId.parse("asg_0ectzj2evqb95a3v1v6wewjzy3");
    for (const seq of ["0", "abc", "1.5", "-1", "01"]) {
      expect(playRoute(`/play/${id}/review/${seq}`)).toStrictEqual({ assignmentId: id });
    }
    expect(playRoute("/play/not-an-id/review/1")).toEqual({ assignmentId: null });
    expect(playRoute(`/play/${id}/review`)).toBeNull();
    expect(playRoute(`/play/${id}/review/1/more`)).toBeNull();
  });
});
