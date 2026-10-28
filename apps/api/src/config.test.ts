import { afterEach, describe, expect, it, vi } from "vitest";
import { lambdaDatabaseUrl } from "./config.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("lambdaDatabaseUrl", () => {
  it("takes DATABASE_URL when it is set, and reads no parameter", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5433/jadwigo");
    vi.stubEnv("JADWIGO_DB_URL_PARAM", "/jadwigo/prod/database-url");
    const read = vi.fn();
    expect(await lambdaDatabaseUrl(read)).toBe("postgresql://localhost:5433/jadwigo");
    expect(read).not.toHaveBeenCalled();
  });

  it("reads the SecureString JADWIGO_DB_URL_PARAM names when DATABASE_URL is unset", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("JADWIGO_DB_URL_PARAM", "/jadwigo/prod/database-url");
    const read = vi.fn(async () => "postgresql://jadwigo_api.ref@pooler:6543/postgres");
    expect(await lambdaDatabaseUrl(read)).toBe("postgresql://jadwigo_api.ref@pooler:6543/postgres");
    expect(read).toHaveBeenCalledWith("/jadwigo/prod/database-url");
  });

  it("refuses when neither is set, and when the parameter is empty", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("JADWIGO_DB_URL_PARAM", "");
    await expect(lambdaDatabaseUrl(vi.fn())).rejects.toThrow(/JADWIGO_DB_URL_PARAM/);
    vi.stubEnv("JADWIGO_DB_URL_PARAM", "/jadwigo/prod/database-url");
    await expect(lambdaDatabaseUrl(async () => undefined)).rejects.toThrow(/holds no value/);
  });
});
