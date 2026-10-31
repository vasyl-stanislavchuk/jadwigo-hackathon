/**
 * The publish state (dl-a38n.48): what jw's `lesson_publish` wrote to `<draft_id>.publish.json`
 * (wave-3 lead decision 2: `{draft_id, request, lesson_id, version, assignment_id, play_url,
 * verified, target, published_at, timings}`), read for the page: the play link, each check the
 * publish ran with its result, and whether the draft changed after it, so a link never passes for
 * the draft on the screen when it is an older one.
 *
 * `verified`'s own shape is jw's: a list of `{name | check, ok, status?, detail?}` or an object of
 * `name -> boolean | {ok, status?, detail?}` both read, and anything else draws as not verified.
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
  if (typeof v === "boolean") return { name, ok: v, detail: "" };
  const { ok, status, detail, error } = (v ?? {}) as Record<string, unknown>;
  return {
    name,
    ok: ok === true,
    detail: [text(status), text(detail) ?? text(error)].filter((x) => x !== null).join(" · "),
  };
}

function checksOf(verified: unknown): PublishCheck[] {
  if (Array.isArray(verified))
    return verified.map((v, i) => {
      const { name, check } = (v ?? {}) as Record<string, unknown>;
      return checkOf(text(name) ?? text(check) ?? `check ${i + 1}`, v);
    });
  if (verified !== null && typeof verified === "object")
    return Object.entries(verified).map(([name, v]) => checkOf(name, v));
  return [];
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
    checks,
    verified: checks.length > 0 && checks.every((c) => c.ok),
    // With no time to compare, the link is not trusted for the draft on the screen. A second of
    // slack: a publish time written to the second falls before the draft jw wrote just before it.
    stale: draftMtime !== null && (Number.isNaN(at) || draftMtime > at + SLACK_MS),
  };
}
