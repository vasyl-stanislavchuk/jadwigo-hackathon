import { afterEach, describe, expect, it } from "vitest";
import { museConfig, runnerDatabaseUrl } from "./config.ts";

const KEYS = [
  "META_API_KEY",
  "JADWIGO_MUSE_KEY_PARAM",
  "JADWIGO_MUSE_CAP_USD",
  "JADWIGO_MUSE_PRIVATE_MODEL",
  "DATABASE_URL",
  "RUNNER_DATABASE_URL",
  "JADWIGO_RUNNER_DB_URL_PARAM",
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

    expect(config).toEqual({ api_key: "a-key", lane_cap_usd: 0.5, private_model: null });
    expect(asked).toEqual(["/jadwigo/dev/muse-api-key"]);
  });

  it("refuses to call without a cap", async () => {
    env({ META_API_KEY: "a-key" });
    await expect(museConfig()).rejects.toThrow("no call without a cap");
    env({ META_API_KEY: "a-key", JADWIGO_MUSE_CAP_USD: "0" });
    await expect(museConfig()).rejects.toThrow("no call without a cap");
  });

  it("names the private tier's model only when the owner set it", async () => {
    env({ META_API_KEY: "a-key", JADWIGO_MUSE_CAP_USD: "1", JADWIGO_MUSE_PRIVATE_MODEL: "m" });
    expect((await museConfig()).private_model).toBe("m");
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
