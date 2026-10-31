"""`jw doctor`: whether this machine can draft, check and publish a lesson, and what to fix when it
cannot (dl-a38n.42, wave-3 lead decision 8: a clean machine works).

Five checks, each `ok`, `warn` or `fail`, each line with the fix to run:

1. settings: the bank checkout's `sets/`, the converted items file (size, generated_by),
   `readiness.json`, the operator's `bank.env` at mode 600, `check.ts` and `bun`, the drafts
   directory writable at mode 700.
2. ready ids: every set page's `items.ready_ids[<lang>]` names an item the converted file has,
   with status plays and checked_at; the stale ones are counted with 3 examples (the 58 of the
   2026-10-31 run, a page stamped against another converted file).
3. stamps: the rules version (and stamp id, where written) agrees between readiness.json, the
   converted file's items and the pages' `items.ready_stamp`; "pages unstamped" without it.
4. bank_rev: the search service's `bank_rev` from one search, against the sha256 of the local
   index manifest when the checkout has one.
5. services: the local api's `/api/health` and `/api/v1/featured-lessons` (a 500 there means
   `make db-reset` never ran) and the web dev server's `/api/health`, all 200.

`run()` returns the same JSON for `jw doctor --json` and the MCP tool. Nothing here writes.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import stat
import urllib.error
import urllib.request
from collections.abc import Callable, Iterable, Mapping
from pathlib import Path
from typing import Any

from jw import bank_client, items, readiness, refusals, settings_keys
from jw.errors import JwError

OK, WARN, FAIL = "ok", "warn", "fail"
_RANK = {OK: 0, WARN: 1, FAIL: 2}
EXAMPLES = 3

# The local api and web dev server, as tools/src/ports.ts DEV_PORTS names them; md's API_PORT and
# WEB_PORT in a worktree; JW_LOCAL_API_URL and JW_LOCAL_WEB_URL (environment only) override both.
DEV_API_PORT, DEV_WEB_PORT = 8730, 5173
HTTP_TIMEOUT_SECS = 3.0

# What check 4 searches for: any need will do, the answer's bank_rev is what is read.
PROBE_NEED = {"language": "pl", "grade": "3", "words": "dodawanie"}

Get = Callable[[str], int]
Search = Callable[..., Mapping[str, Any]]


def _line(name: str, status: str, detail: str, fix: str = "") -> dict[str, str]:
    return {"name": name, "status": status, "detail": detail, "fix": fix}


def _check(n: int, name: str, lines: list[dict[str, str]]) -> dict[str, Any]:
    worst = max((line["status"] for line in lines), key=_RANK.__getitem__, default=OK)
    return {"n": n, "name": name, "status": worst, "lines": lines}


# ---------------------------------------------------------------- 1. settings


def _bank_dir() -> Path | None:
    """JADWIGO_BANK_DIR, else the default `jw bank pull` clones into, when it is there."""
    configured = settings_keys.bank_dir()
    if settings_keys.setting(settings_keys.JADWIGO_BANK_DIR) or configured.is_dir():
        return configured
    return None


def _converted_line(path: Path) -> dict[str, str]:
    if not path.is_file():
        return _line(
            "converted items",
            FAIL,
            f"no file at {path}",
            "Run `jw bank pull`, or set JADWIGO_KHAN_DIR to the synced Khan copy.",
        )
    size = path.stat().st_size
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        return _line(
            "converted items", FAIL, f"{path} cannot be read: {exc}", "Run `jw bank pull`."
        )
    made_by = raw.get("generated_by") if isinstance(raw, dict) else None
    return _line("converted items", OK, f"{path}, {size:,} bytes, generated_by {made_by or '?'}")


def _mode_line(
    name: str, path: Path, want: int, fix: str, missing: tuple[str, str, str]
) -> dict[str, str]:
    if not path.exists():
        return _line(name, *missing)
    mode = stat.S_IMODE(path.stat().st_mode)
    if mode & ~want & 0o777:
        return _line(name, WARN, f"{path} is mode {mode:o}, not {want:o}", fix)
    return _line(name, OK, f"{path}, mode {mode:o}")


def settings_check(language: str) -> dict[str, Any]:
    lines: list[dict[str, str]] = []
    bank = _bank_dir()
    if bank is None:
        lines.append(
            _line(
                "bank checkout",
                FAIL,
                "JADWIGO_BANK_DIR is not set",
                "Run `jw bank pull`, or set JADWIGO_BANK_DIR to a jadwigo-bank checkout.",
            )
        )
    elif not (bank / "sets").is_dir():
        lines.append(_line("bank checkout", FAIL, f"no sets/ under {bank}", "Run `jw bank pull`."))
    else:
        lines.append(_line("bank checkout", OK, f"{bank / 'sets'}"))
    lines.append(_converted_line(refusals.converted_file(language)))
    ready_file = readiness.readiness_path()
    lines.append(
        _line("readiness.json", OK, str(ready_file))
        if ready_file.is_file()
        else _line(
            "readiness.json",
            WARN,
            f"no file at {ready_file}; readiness is computed from the converted file",
            "Run `jw bank pull` once the bank syncs readiness.json.",
        )
    )
    env = settings_keys.env_file()
    lines.append(
        _mode_line(
            "bank.env",
            env,
            0o600,
            f"chmod 600 {env}",
            (WARN, f"no file at {env}; settings come from the environment only", ""),
        )
    )
    repo = settings_keys.repo_dir()
    script = repo / settings_keys.LESSON_CHECK_SCRIPT if repo else None
    lines.append(
        _line("check.ts", OK, str(script))
        if script and script.is_file()
        else _line(
            "check.ts",
            FAIL,
            f"no {settings_keys.LESSON_CHECK_SCRIPT} in {repo or 'any checkout'}",
            "Set JADWIGO_REPO_DIR to the jadwigo-hackathon checkout.",
        )
    )
    bun = shutil.which("bun")
    lines.append(
        _line("bun", OK, bun)
        if bun
        else _line("bun", FAIL, "bun is not on PATH", "Run `mise install` in the jadwigo checkout.")
    )
    drafts = settings_keys.drafts_dir()
    line = _mode_line(
        "drafts directory",
        drafts,
        0o700,
        f"chmod 700 {drafts}",
        (WARN, f"{drafts} does not exist yet; lesson_draft makes it", f"mkdir -m 700 -p {drafts}"),
    )
    if drafts.exists() and not os.access(drafts, os.W_OK):
        line = _line("drafts directory", FAIL, f"{drafts} is not writable", f"chmod u+w {drafts}")
    lines.append(line)
    return _check(1, "settings", lines)


# ---------------------------------------------------------------- 2. ready ids


def _pages(bank: Path | None) -> list[dict[str, Any]]:
    sets = bank / "sets" if bank else None
    if sets is None or not sets.is_dir():
        return []
    out = []
    for path in sorted(sets.rglob("*.json")):
        try:
            page = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if isinstance(page, dict) and page.get("id"):
            out.append(page)
    return out


def _converted_items(path: Path) -> dict[str, dict[str, Any]] | None:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    listed = raw.get("items") if isinstance(raw, dict) else None
    if not isinstance(listed, list):
        return None
    return {str(i["id"]): i for i in listed if isinstance(i, dict) and "id" in i}


def ready_check(
    language: str, pages: list[dict[str, Any]], converted: Mapping[str, Any] | None
) -> dict[str, Any]:
    name = f"ready ids ({language})"
    if converted is None:
        return _check(
            2,
            "ready ids",
            [_line(name, FAIL, "no converted items to check against", "Run `jw bank pull`.")],
        )
    stamped = [p for p in pages if isinstance((p.get("items") or {}).get("ready_ids"), Mapping)]
    if not stamped:
        return _check(
            2,
            "ready ids",
            [
                _line(
                    name,
                    WARN,
                    f"no page of {len(pages)} lists ready_ids",
                    "Pull a bank checkout built after the readiness stamp: `jw bank pull`.",
                )
            ],
        )
    total = 0
    stale: list[str] = []
    for page in stamped:
        for item_id in page["items"]["ready_ids"].get(language) or []:
            total += 1
            item = converted.get(str(item_id))
            why = (
                "not in the converted file"
                if item is None
                else items.why_not_ready(item.get("status"))
            )
            if why:
                stale.append(f"{page['id']}: {item_id} ({why})")
    if stale:
        return _check(
            2,
            "ready ids",
            [
                _line(
                    name,
                    FAIL,
                    f"{len(stale)} of {total} ready ids on {len(stamped)} pages are not "
                    "lesson-ready in "
                    f"the converted file; e.g. {'; '.join(stale[:EXAMPLES])}",
                    "The pages and the converted file come from different stamps: `jw bank pull` "
                    "brings both to the bucket's current one.",
                )
            ],
        )
    return _check(
        2,
        "ready ids",
        [_line(name, OK, f"{total} ready ids on {len(stamped)} pages, all lesson-ready")],
    )


# ---------------------------------------------------------------- 3. stamps


def _versions(values: Iterable[Any]) -> list[str]:
    return sorted({str(v) for v in values if v})


def _ready_statuses(items_by_id: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    return [
        i["status"]
        for i in items_by_id.values()
        if isinstance(i.get("status"), Mapping) and items.why_not_ready(i["status"]) is None
    ]


def converted_stamp(statuses: list[Mapping[str, Any]]) -> str | None:
    """The stamp the converted files carry, as the bank names it (jadwigo-bank
    tools/build_sets.py stamp_id): `<rules_version>@<checked_at>` over every ready item, the
    rules joined by `+` when they differ and the latest check. None when no item is ready."""
    if not statuses:
        return None
    versions = "+".join(sorted({str(s.get("rules_version")) for s in statuses}))
    return f"{versions}@{max(str(s['checked_at']) for s in statuses)}"


def stamp_check(
    pages: list[dict[str, Any]], converted: Mapping[str, Any] | None, language: str = "pl"
) -> dict[str, Any]:
    ready_file = readiness.readiness_path()
    try:
        ready_raw = json.loads(ready_file.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        ready_raw = None
    sources: dict[str, dict[str, list[str]]] = {}
    if isinstance(ready_raw, dict):
        sources["readiness.json"] = {
            "rules_version": _versions([ready_raw.get("rules_version")]),
            "stamp_id": _versions([ready_raw.get("stamp_id")]),
        }
    if converted is not None:
        # The bank's stamp covers both languages' files; the other one counts when it is here.
        statuses = _ready_statuses(converted)
        own = refusals.converted_file(language)
        for path in {refusals.converted_file(lang) for lang in ("pl", "en")} - {own}:
            other = _converted_items(path)
            if other is not None:
                statuses += _ready_statuses(other)
        sources["converted file"] = {
            "rules_version": _versions(s.get("rules_version") for s in statuses),
            "stamp_id": _versions([converted_stamp(statuses)]),
        }
    # A page's ready_stamp is the stamp id itself, `<rules_version>@<checked_at>` (set.schema.json).
    page_stamps = [(p.get("items") or {}).get("ready_stamp") for p in pages]
    page_stamps = [s for s in page_stamps if isinstance(s, str) and "@" in s]
    lines: list[dict[str, str]] = []
    if page_stamps:
        sources["pages"] = {
            "rules_version": _versions(s.rsplit("@", 1)[0] for s in page_stamps),
            "stamp_id": _versions(page_stamps),
        }
    else:
        lines.append(
            _line(
                "pages",
                WARN,
                "pages unstamped: no page carries items.ready_stamp",
                "Pull a bank checkout the bank lane stamped: `jw bank pull`.",
            )
        )
    for key in ("rules_version", "stamp_id"):
        seen = {where: v[key] for where, v in sources.items() if v[key]}
        values = sorted({x for v in seen.values() for x in v})
        if not values:
            continue
        said = "; ".join(f"{where} {', '.join(v)}" for where, v in seen.items())
        if len(values) > 1:
            lines.append(
                _line(
                    key,
                    FAIL,
                    f"they disagree: {said}",
                    "Run `jw bank pull` so readiness.json, the converted file and the pages come "
                    "from one stamp.",
                )
            )
        else:
            lines.append(_line(key, OK, f"{values[0]} in {', '.join(seen)}"))
    if not lines:
        lines.append(
            _line("stamps", WARN, "no source names a rules version", "Run `jw bank pull`.")
        )
    return _check(3, "stamps", lines)


# ---------------------------------------------------------------- 4. bank_rev


def bank_rev_check(search: Search, bank: Path | None) -> dict[str, Any]:
    try:
        envelope = search(dict(PROBE_NEED), limit=1)
    except JwError as exc:
        return _check(
            4,
            "bank_rev",
            [
                _line(
                    "search",
                    FAIL,
                    f"the search did not answer: {exc}",
                    exc.hint or "Check JW_API_URL or JW_BANK_URL and its token.",
                )
            ],
        )
    served = str(envelope.get("bank_rev") or "")
    states = [s.get("state") for s in envelope.get("state") or [] if isinstance(s, Mapping)]
    if states and all(s == "degraded" for s in states):
        return _check(
            4,
            "bank_rev",
            [
                _line(
                    "search",
                    FAIL,
                    "every arm came back degraded",
                    "Check JW_API_URL or JW_BANK_URL and its token.",
                )
            ],
        )
    if not served:
        return _check(
            4, "bank_rev", [_line("search", WARN, "the service answered with no bank_rev", "")]
        )
    manifest = bank / "index" / "manifest.json" if bank else None
    if manifest is None or not manifest.is_file():
        return _check(
            4,
            "bank_rev",
            [
                _line(
                    "search",
                    OK,
                    f"service bank_rev {served[:12]}; no local index manifest to compare",
                )
            ],
        )
    local = hashlib.sha256(manifest.read_bytes()).hexdigest()
    if local != served:
        return _check(
            4,
            "bank_rev",
            [
                _line(
                    "search",
                    WARN,
                    f"service bank_rev {served[:12]}, local index {local[:12]}",
                    "The service answers from another build than this checkout: `jw bank pull`, "
                    "or publish the bank.",
                )
            ],
        )
    return _check(
        4, "bank_rev", [_line("search", OK, f"service and local index agree: {served[:12]}")]
    )


# ---------------------------------------------------------------- 5. services


def local_urls(env: Mapping[str, str] | None = None) -> tuple[str, str]:
    """The local api and web base URLs (environment only, like tools/src/ports.ts)."""
    env = os.environ if env is None else env
    api = env.get("JW_LOCAL_API_URL") or f"http://127.0.0.1:{env.get('API_PORT') or DEV_API_PORT}"
    web = env.get("JW_LOCAL_WEB_URL") or f"http://127.0.0.1:{env.get('WEB_PORT') or DEV_WEB_PORT}"
    return api.rstrip("/"), web.rstrip("/")


def http_status(url: str) -> int:
    """The status a GET answers with, or 0 when nothing answered."""
    try:
        with urllib.request.urlopen(url, timeout=HTTP_TIMEOUT_SECS) as response:  # noqa: S310
            return int(response.status)
    except urllib.error.HTTPError as exc:
        return int(exc.code)
    except (urllib.error.URLError, OSError):
        return 0


def services_check(get: Get, env: Mapping[str, str] | None = None) -> dict[str, Any]:
    api, web = local_urls(env)
    probes = (
        ("api health", f"{api}/api/health", "Start the local api: `make dev`."),
        (
            "featured lessons",
            f"{api}/api/v1/featured-lessons",
            "A 500 here means the local database is empty: `make db-reset`.",
        ),
        ("web health", f"{web}/api/health", "Start the web dev server: `make dev`."),
    )
    lines = []
    for name, url, fix in probes:
        code = get(url)
        if code == 200:
            lines.append(_line(name, OK, f"{url} 200"))
        else:
            lines.append(_line(name, FAIL, f"{url} {'did not answer' if code == 0 else code}", fix))
    return _check(5, "services", lines)


# ---------------------------------------------------------------- all five


def _failed(n: int, name: str, error: JwError) -> dict[str, Any]:
    """A check that could not run, as a fail line with the error's own fix."""
    return _check(n, name, [_line(name, FAIL, str(error), error.hint or "")])


def _loose_env() -> JwError | None:
    """The refusal every setting read raises while bank.env is readable by others, read first so
    each check can say it rather than crash."""
    try:
        settings_keys.read_env_file()
    except JwError as exc:
        return exc
    return None


def run(
    language: str = "pl", *, get: Get | None = None, search: Search | None = None
) -> dict[str, Any]:
    """The 5 checks and the worst status among them. `get` and `search` default to the real HTTP
    GET and bank search, looked up at call time. A check that cannot read its settings (a loose
    bank.env) fails with the reason and its fix; the others still run."""
    get = get or http_status
    search = search or bank_client.search
    loose = _loose_env()
    checks: list[dict[str, Any]] = []
    if loose is not None:
        checks.append(
            _check(1, "settings", [_line("bank.env", FAIL, str(loose), loose.hint or "")])
        )
    else:
        checks.append(_guarded(1, "settings", lambda: settings_check(language)))
    try:
        bank = _bank_dir()
        pages = _pages(bank)
        converted = _converted_items(refusals.converted_file(language))
    except JwError as exc:
        checks += [_failed(2, "ready ids", exc), _failed(3, "stamps", exc)]
        checks.append(_guarded(4, "bank_rev", lambda: bank_rev_check(search, None)))
    else:
        checks += [
            _guarded(2, "ready ids", lambda: ready_check(language, pages, converted)),
            _guarded(3, "stamps", lambda: stamp_check(pages, converted, language)),
            _guarded(4, "bank_rev", lambda: bank_rev_check(search, bank)),
        ]
    checks.append(_guarded(5, "services", lambda: services_check(get)))
    status = max((c["status"] for c in checks), key=_RANK.__getitem__)
    return {"status": status, "language": language, "checks": checks}


def _guarded(n: int, name: str, check: Callable[[], dict[str, Any]]) -> dict[str, Any]:
    try:
        return check()
    except JwError as exc:
        return _failed(n, name, exc)
