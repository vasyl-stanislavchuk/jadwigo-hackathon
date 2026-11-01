/** The engine's one read of the environment: the database the queue's integration test uses. */
export function databaseUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "DATABASE_URL is unset. Locally: postgresql://localhost:5433/jadwigo_test (Postgres.app 17), from .env.local.",
    );
  }
  return url;
}

/**
 * What `HttpMuse` reads from the environment. The key is `META_API_KEY`, the name in
 * `~/.config/jadwigo-bank/muse.env` that `jw.muse.api_key` reads; the host puts it in the
 * environment from its secret store, never on argv. The cap is `JADWIGO_MUSE_CAP_USD`, as for
 * `jw.muse`. `JADWIGO_MUSE_PRIVATE_MODEL` names a no-training model once the owner has named one
 * from the dl-z5ja.3 probe; until then, and while it has no price, the contributor model serves
 * a private-tier call (owner decision of 2026-11-01, bead dl-uafq).
 */
export interface MuseSettings {
  api_key: string;
  lane_cap_usd: number;
  private_model: string | null;
}

/** The Meta key, or null: the live int test skips without it. */
export function museApiKey(): string | null {
  return process.env["META_API_KEY"] || null;
}

export function museSettings(): MuseSettings {
  const api_key = museApiKey();
  if (api_key === null) throw new Error("META_API_KEY is unset: HttpMuse needs the Meta key.");
  const cap = Number(process.env["JADWIGO_MUSE_CAP_USD"] ?? "");
  if (!(cap > 0)) {
    throw new Error(
      "JADWIGO_MUSE_CAP_USD is unset or not a positive number: no call without a cap.",
    );
  }
  return {
    api_key,
    lane_cap_usd: cap,
    private_model: process.env["JADWIGO_MUSE_PRIVATE_MODEL"] || null,
  };
}
