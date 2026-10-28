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

  const param = "/jadwigo/prod/database-url";
  const good = "postgresql://jadwigo_api.ref:pw@pooler.example:6543/postgres";

  function fromSsm(value: string) {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("JADWIGO_DB_URL_PARAM", param);
    return lambdaDatabaseUrl(async () => value);
  }

  it("passes a good URL through unchanged", async () => {
    expect(await fromSsm(good)).toBe(good);
  });

  it("trims a leading space", async () => {
    expect(await fromSsm(` ${good}`)).toBe(good);
  });

  it("trims a trailing space and newline", async () => {
    expect(await fromSsm(`${good} \n`)).toBe(good);
  });

  it("treats a whitespace-only DATABASE_URL as unset and reads the parameter", async () => {
    vi.stubEnv("DATABASE_URL", "   ");
    vi.stubEnv("JADWIGO_DB_URL_PARAM", param);
    const read = vi.fn(async () => good);
    expect(await lambdaDatabaseUrl(read)).toBe(good);
    expect(read).toHaveBeenCalledWith(param);
  });

  it("refuses an unencoded '#' in the password, naming the parameter but not the password", async () => {
    const failure = fromSsm("postgresql://u:secret#pw@h:6543/postgres");
    await expect(failure).rejects.toThrow(param);
    await expect(failure).rejects.not.toThrow(/secret/);
  });

  it("refuses a URL that is not postgres, naming DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "https://u:secret@h/postgres");
    await expect(lambdaDatabaseUrl(vi.fn())).rejects.toThrow(/^DATABASE_URL is not a postgres/);
  });
});
