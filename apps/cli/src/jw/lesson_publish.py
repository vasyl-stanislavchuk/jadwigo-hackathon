"""A checked draft, published into the local database `make dev` serves and played once (dl-a38n.39).

`publish(draft_id, target="local")` is the lesson_publish tool and `jw lesson publish`. It refuses a
draft whose last check is not ok or is older than the draft file, then runs
`make -s lesson-import FILE=<draft file> JSON=1` in the jadwigo checkout (`JADWIGO_REPO_DIR`), the
way `lesson.check` runs check.ts, and reads the one JSON object it prints: `{file, lesson_id,
version, version_id, published, assignment_id, play_path, questions}`. Then it checks the lesson
plays, against the dev servers:

1. `GET <api>/api/health` answers 200;
2. `POST <api>/api/v1/assignments/<id>/attempts` with `{"mode": "preview"}` answers 201, with a
   plan of `questions` entries and the version the import published;
3. `GET <web>/play/<id>` answers 200.

The api is `JW_LOCAL_API_URL`, else `http://127.0.0.1:<API_PORT>`; the web is `JW_LOCAL_WEB_URL`,
else `http://127.0.0.1:<WEB_PORT>`. The ports are md's (`API_PORT`, `WEB_PORT`, exported by
`md run`), else the main checkout's, which `.md/repo.toml` and `tools/src/ports.ts` DEV_PORTS
declare. The web server listens on 127.0.0.1 only (apps/web/vite.config.ts), so it is never
`localhost`, which is ::1 first on macOS. All four are read from the environment only.

The record is `<draft_id>.publish.json` beside the draft, mode 600: `{draft_id, request (guarded),
lesson_id, version, assignment_id, play_url, verified, target, published_at, timings}`.

Only `local`: jadwigo-dev is the owner's (`make lesson-import FILE=<path> ENV=dev`, which the
refusal names), and prod is never published from here (owner's decision `dl-diel`).
"""

from __future__ import annotations

import datetime as dt
import json
import os
import time
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping
from pathlib import Path
from typing import Any

from jw import lesson
from jw.errors import JwError

TARGETS = ("local", "dev", "prod")
IMPORT_TARGET = "lesson-import"  # the Makefile target
# The main checkout's ports: .md/repo.toml [review.ports] and tools/src/ports.ts DEV_PORTS.
DEV_PORTS = {"WEB_PORT": 5173, "API_PORT": 8730}
JW_LOCAL_API_URL = "JW_LOCAL_API_URL"
JW_LOCAL_WEB_URL = "JW_LOCAL_WEB_URL"
HEALTH_PATH = "/api/health"  # ROUTES.health in packages/contracts
ATTEMPTS_PATH = "/api/v1/assignments/{id}/attempts"  # ROUTES.startAttempt
PLAY_PATH = "/play/{id}"
IMPORT_TIMEOUT_SECS = 120
HTTP_TIMEOUT_SECS = 5

# What `publish` asks over HTTP: method, url, JSON body or None in; status (None when nothing
# answered) and the JSON reply (None when it was not JSON) out.
Http = Callable[[str, str, Any], tuple[int | None, Any]]


def _url(name: str, port: str) -> str:
    configured = os.environ.get(name, "").strip()
    if configured:
        return configured.rstrip("/")
    raw = os.environ.get(port, "").strip()
    return f"http://127.0.0.1:{raw or DEV_PORTS[port]}"


def api_url() -> str:
    return _url(JW_LOCAL_API_URL, "API_PORT")


def web_url() -> str:
    return _url(JW_LOCAL_WEB_URL, "WEB_PORT")


def _http(method: str, url: str, body: Any = None) -> tuple[int | None, Any]:
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(url, data=data, method=method)
    if data is not None:
        request.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_SECS) as reply:  # noqa: S310
            status, raw = reply.status, reply.read()
    except urllib.error.HTTPError as exc:
        status, raw = exc.code, exc.read()
    except (urllib.error.URLError, OSError):
        return None, None
    try:
        return status, json.loads(raw)
    except ValueError:
        return status, None


def owner_command(path: Path) -> str:
    return f"make {IMPORT_TARGET} FILE={path} ENV=dev"


def _refuse_target(target: str, path: Path) -> None:
    if target == "local":
        return
    if target == "dev":
        raise JwError(
            "publishing to jadwigo-dev is the owner's step",
            hint=f"The owner runs, from the jadwigo checkout: {owner_command(path)}",
        )
    if target == "prod":
        raise JwError("prod is never published from here", hint="Publish with target local.")
    raise JwError(f"unknown target {target!r}", hint=f"Use one of {', '.join(TARGETS)}.")


def _checked(where: Path, draft_id: str, path: Path) -> None:
    """A clean check of the draft as it stands, or a JwError saying what to do."""
    check_path = lesson._check_path(where, draft_id)
    hint = "Call lesson_check (or lesson_edit) until it answers ok, then publish."
    try:
        checked: Any = json.loads(check_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError) as exc:
        raise JwError(f"{draft_id} has no check yet", hint=hint) from exc
    if not checked.get("ok"):
        raise JwError(f"{draft_id}'s last check is not ok", hint=hint)
    if check_path.stat().st_mtime < path.stat().st_mtime:
        raise JwError(f"{draft_id} changed after its last check", hint=hint)


def _import(path: Path, runner: lesson.Runner | None) -> dict[str, Any]:
    """`make -s lesson-import FILE=<path> JSON=1` in the checkout, and the JSON object it prints."""
    repo, _ = lesson.check_script()
    run = runner or lesson._run(repo)
    argv = ["make", "-s", IMPORT_TARGET, f"FILE={path}", "JSON=1"]
    done = run(argv)
    lines = [line for line in (done.stdout or "").splitlines() if line.strip().startswith("{")]
    hint = (
        f"Is the local database up (`make db-reset` once, then `make dev`)? Run `{' '.join(argv)}` "
        f"in {repo} to see it."
    )
    if done.returncode != 0 or not lines:
        tail = (done.stderr or done.stdout or "").strip()[-400:]
        raise JwError(f"the import failed (exit {done.returncode}): {tail}", hint=hint)
    try:
        imported: dict[str, Any] = json.loads(lines[-1])
    except ValueError as exc:
        raise JwError(f"the import printed no JSON object: {lines[-1][:200]}", hint=hint) from exc
    return imported


def _verify(imported: Mapping[str, Any], http: Http) -> dict[str, Any]:
    """Whether the published lesson plays: the api's health, a preview attempt, the play page."""
    api, web = api_url(), web_url()
    assignment = imported["assignment_id"]
    health, _ = http("GET", api + HEALTH_PATH, None)
    started, snapshot = http("POST", api + ATTEMPTS_PATH.format(id=assignment), {"mode": "preview"})
    reply = snapshot if isinstance(snapshot, dict) else {}
    plan = reply.get("plan")
    version = (reply.get("attempt") or {}).get("lesson_version_id")
    page, _ = http("GET", web + PLAY_PATH.format(id=assignment), None)
    out = {
        "api": api,
        "web": web,
        "api_health": health,
        "attempt_started": started,
        "plan_questions": len(plan) if isinstance(plan, list) else None,
        "version_matches": version == imported.get("version_id"),
        "play_page": page,
    }
    out["ok"] = (
        health == 200
        and started == 201
        and out["plan_questions"] == imported.get("questions")
        and out["version_matches"]
        and page == 200
    )
    return out


def publish(
    draft_id: str,
    target: str = "local",
    *,
    runner: lesson.Runner | None = None,
    http: Http | None = None,
    folder: Path | None = None,
) -> dict[str, Any]:
    """Publish the checked draft locally and check it plays. Returns the publish record with `ok`
    (imported and every check passed) and `publish_path`. Stamped in the draft's timings."""
    called_at = lesson.now()
    where = folder or lesson.drafts_dir()
    try:
        return _publish(draft_id, target, runner=runner, http=http, where=where)
    finally:
        lesson.stamp(where, draft_id, "lesson_publish", called_at)


def _publish(
    draft_id: str,
    target: str,
    *,
    runner: lesson.Runner | None,
    http: Http | None,
    where: Path,
) -> dict[str, Any]:
    started = time.monotonic()
    stored = lesson.load_draft(draft_id, where)
    path = lesson._lesson_path(where, draft_id)
    _refuse_target(target, path)
    _checked(where, draft_id, path)

    imported = _import(path, runner)
    imported_at = time.monotonic()
    verified = _verify(imported, http or _http)
    done = time.monotonic()
    record = {
        "draft_id": draft_id,
        "request": stored.get("request"),
        "lesson_id": imported.get("lesson_id"),
        "version": imported.get("version"),
        "assignment_id": imported.get("assignment_id"),
        "play_url": verified["web"] + str(imported.get("play_path")),
        "verified": verified,
        "target": target,
        "published_at": dt.datetime.now(dt.UTC).isoformat(timespec="seconds"),
        "timings": {
            "import_s": round(imported_at - started, 2),
            "verify_s": round(done - imported_at, 2),
            "total_s": round(done - started, 2),
        },
    }
    publish_path = where / f"{draft_id}.publish.json"
    lesson._write_json(publish_path, record, mode=0o600)
    return {"ok": bool(verified["ok"]), **record, "publish_path": str(publish_path)}
