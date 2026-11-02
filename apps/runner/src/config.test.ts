import { afterEach, describe, expect, it } from "vitest";
import { devDatabaseUrl, isLocalDatabaseUrl, museConfig, runnerDatabaseUrl } from "./config.ts";

const KEYS = [
  "META_API_KEY",
  "JADWIGO_MUSE_KEY_PARAM",
  "JADWIGO_MUSE_CAP_USD",
  "JADWIGO_MUSE_PRIVATE_MODEL",
  "JADWIGO_MUSE_TIER",
  "DATABASE_URL",
  "RUNNER_DATABASE_URL",
  "JADWIGO_RUNNER_DB_URL_PARAM",
  "LOCAL_DATABASE_URL",
];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function env(values: Record<string, string>) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, values);
}

afterEach(() => {
  for (const k of KEYS) {
    const v = saved[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("the runner's settings", () => {
  it("reads the Meta key from the SSM parameter it names, once, when the environment has none", async () => {
    env({ JADWIGO_MUSE_KEY_PARAM: "/jadwigo/dev/muse-api-key", JADWIGO_MUSE_CAP_USD: "0.5" });
    const asked: string[] = [];
    const config = await museConfig((name) => {
      asked.push(name);
      return Promise.resolve(" a-key ");
    });

    expect(config).toEqual({
      api_key: "a-key",
      lane_cap_usd: 0.5,
      tier: "contributor",
      private_model: null,
    });
    expect(asked).toEqual(["/jadwigo/dev/muse-api-key"]);
  });

  it("refuses to call without a cap", async () => {
    env({ META_API_KEY: "a-key" });
    await expect(museConfig()).rejects.toThrow("no call without a cap");
    env({ META_API_KEY: "a-key", JADWIGO_MUSE_CAP_USD: "0" });
    await expect(museConfig()).rejects.toThrow("no call without a cap");
  });

  it("runs on the contributor tier unless set to private, which needs its model named", async () => {
    env({ META_API_KEY: "a-key", JADWIGO_MUSE_CAP_USD: "1" });
    expect((await museConfig()).tier).toBe("contributor");
    env({ META_API_KEY: "a-key", JADWIGO_MUSE_CAP_USD: "1", JADWIGO_MUSE_TIER: "private" });
    await expect(museConfig()).rejects.toThrow("JADWIGO_MUSE_PRIVATE_MODEL");
    env({
      META_API_KEY: "a-key",
      JADWIGO_MUSE_CAP_USD: "1",
      JADWIGO_MUSE_TIER: "private",
      JADWIGO_MUSE_PRIVATE_MODEL: "m",
    });
    expect(await museConfig()).toMatchObject({ tier: "private", private_model: "m" });
    env({ META_API_KEY: "a-key", JADWIGO_MUSE_CAP_USD: "1", JADWIGO_MUSE_TIER: "public" });
    await expect(museConfig()).rejects.toThrow("contributor or private");
  });

  it("takes the Edge secret before DATABASE_URL, and SSM last", async () => {
    env({
      RUNNER_DATABASE_URL: "postgresql://edge.invalid/db",
      DATABASE_URL: "postgresql://local.invalid/db",
    });
    expect(await runnerDatabaseUrl()).toBe("postgresql://edge.invalid/db");
    env({ JADWIGO_RUNNER_DB_URL_PARAM: "/jadwigo/dev/runner-database-url" });
    expect(await runnerDatabaseUrl(() => Promise.resolve("postgresql://ssm.invalid/db"))).toBe(
      "postgresql://ssm.invalid/db",
    );
  });

  it("never puts the URL in its error, which holds the password", async () => {
    env({ DATABASE_URL: "mysql://user:secret@host/db" });
    await expect(runnerDatabaseUrl()).rejects.toThrow("is not a postgres:// or postgresql:// URL");
    await expect(runnerDatabaseUrl()).rejects.not.toThrow("secret");
  });
});

describe("the dev runner's database (dl-uukj.47.14.2's review)", () => {
  it("takes a local jadwigo database, from LOCAL_DATABASE_URL first", () => {
    env({
      LOCAL_DATABASE_URL: "postgresql://localhost:5433/jadwigo",
      DATABASE_URL: "postgresql://127.0.0.1/jadwigo_test",
    });
    expect(devDatabaseUrl()).toBe("postgresql://localhost:5433/jadwigo");
    env({ DATABASE_URL: "postgres://me:pw@127.0.0.1/jadwigo_test" });
    expect(devDatabaseUrl()).toBe("postgres://me:pw@127.0.0.1/jadwigo_test");
  });

  it("refuses a deployed database, and never reads RUNNER_DATABASE_URL or SSM", () => {
    env({ DATABASE_URL: "postgresql://runner:pw@db.example.supabase.co:5432/postgres" });
    expect(() => devDatabaseUrl()).toThrow(/local database only/);
    env({
      RUNNER_DATABASE_URL: "postgresql://localhost/jadwigo",
      JADWIGO_RUNNER_DB_URL_PARAM: "/jadwigo/prod/runner",
    });
    expect(() => devDatabaseUrl()).toThrow(/set LOCAL_DATABASE_URL/);
    env({ LOCAL_DATABASE_URL: "postgresql://localhost/postgres" });
    expect(() => devDatabaseUrl()).toThrow(/local database only/);
  });

  it("matches make's LOCAL_DB_GATE", () => {
    for (const ok of ["postgresql://localhost/jadwigo", "postgres://u@127.0.0.1:5433/jadwigo_test"])
      expect(isLocalDatabaseUrl(ok), ok).toBe(true);
    for (const no of [
      "postgresql://localhost.evil.com/jadwigo",
      "postgresql://10.0.0.5/jadwigo",
      "postgresql://localhost/jadwigo?host=db.example.com",
      "mysql://localhost/jadwigo",
    ])
      expect(isLocalDatabaseUrl(no), no).toBe(false);
  });
});
