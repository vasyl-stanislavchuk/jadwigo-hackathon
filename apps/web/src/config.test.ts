import { describe, expect, it } from "vitest";
import { authConfig } from "./config.ts";

const project = { JW_SUPABASE_URL: "https://ref.supabase.co", JW_SUPABASE_KEY: "sb_publishable_x" };

describe("authConfig", () => {
  it("is null without a project", () => {
    expect(authConfig({ JW_SUPABASE_PROVIDERS: "google" })).toBeNull();
  });

  it("has no provider when JW_SUPABASE_PROVIDERS is unset or empty", () => {
    expect(authConfig(project)?.providers).toEqual([]);
    expect(authConfig({ ...project, JW_SUPABASE_PROVIDERS: "" })?.providers).toEqual([]);
  });

  it("keeps the screen's order whatever the list's, and drops a name it does not know", () => {
    expect(
      authConfig({ ...project, JW_SUPABASE_PROVIDERS: " facebook, apple ,google" })?.providers,
    ).toEqual(["google", "facebook"]);
  });
});
