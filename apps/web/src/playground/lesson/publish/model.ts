/**
 * The publish state (dl-a38n.48): what jw's `lesson_publish` wrote to `<draft_id>.publish.json`
 * (wave-3 lead decision 2: `{draft_id, request, lesson_id, version, assignment_id, play_url,
 * verified, target, published_at, timings}`), read for the page: the play link, each check the
 * publish ran with its result, and whether the draft changed after it, so a link never passes for
 * the draft on the screen when it is an older one.
 *
 * `verified` is an object keyed by check name (`api_health`, `attempt_started`, `play_page`), each
 * `{ok: boolean, status: number | null, detail: string}`, beside a top-level `ok` (every check ok)
 * and `verified_at` (the lead's fix on dl-a38n.48 and .39). A value of another shape reads as a
 * failed check, and a publish is verified only when `ok` and every check say so.
 */

interface PublishCheck {
  name: string;
  ok: boolean;
  /** The status or what went wrong, as jw wrote it; "" when it wrote none. */
  detail: string;
}

export interface PublishState {
  target: string;
  play_url: string | null;
  lesson_id: string | null;
  version: string | null;
  published_at: string | null;
  /** When jw ran the checks. */
  verified_at: string | null;
  checks: PublishCheck[];
  /** Every check passed, and there was at least one. */
  verified: boolean;
  /** The draft file changed after the publish: the link plays an older draft. */
  stale: boolean;
}

const SLACK_MS = 1_000;

const text = (v: unknown): string | null =>
  typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;

function checkOf(name: string, v: unknown): PublishCheck {
  const { ok, status, detail } = (v ?? {}) as Record<string, unknown>;
  if (typeof ok !== "boolean") return { name, ok: false, detail: "not recorded in jw's form" };
  return {
    name,
    ok,
    detail: [text(status), text(detail)].filter((x) => x !== null).join(" · "),
  };
}

function checksOf(verified: unknown): PublishCheck[] {
  if (verified === null || typeof verified !== "object" || Array.isArray(verified)) return [];
  return Object.entries(verified).map(([name, v]) => checkOf(name, v));
}

/** The publish file of a draft changed at `draftMtime` (ms), or null when there is none. */
export function publishOf(raw: unknown, draftMtime: number | null): PublishState | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const checks = checksOf(r["verified"]);
  const published_at = text(r["published_at"]);
  const at = published_at === null ? Number.NaN : Date.parse(published_at);
  return {
    target: text(r["target"]) ?? "local",
    play_url: text(r["play_url"]),
    lesson_id: text(r["lesson_id"]),
    version: text(r["version"]),
    published_at,
    verified_at: text(r["verified_at"]),
    checks,
    verified: r["ok"] === true && checks.length > 0 && checks.every((c) => c.ok),
    // With no time to compare, the link is not trusted for the draft on the screen. A second of
    // slack: a publish time written to the second falls before the draft jw wrote just before it.
    stale: draftMtime !== null && (Number.isNaN(at) || draftMtime > at + SLACK_MS),
  };
}
