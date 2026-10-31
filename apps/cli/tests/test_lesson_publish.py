"""dl-a38n.39: lesson_publish imports a checked draft through `make lesson-import JSON=1` and checks
that it plays, against a fake runner and a fake api and web server on 127.0.0.1.

The draft here is written by hand, the way lesson_draft and lesson_check leave it: jw's record in
`.jw/`, the lesson file and its check. No bank and no bun: the import is the runner's answer.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import threading
import tomllib
from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from click.testing import CliRunner

from jw import lesson, lesson_publish
from jw.cli import main as cli
from jw.errors import JwError
from jw.settings_keys import JADWIGO_DRAFTS_DIR

REPO = Path(__file__).resolve().parents[3]
DRAFT_ID = "draft_0123456789ab"
IMPORTED = {
    "file": "x",
    "lesson_id": "les_fixture",
    "version": 2,
    "version_id": "lv_fixture",
    "published": True,
    "assignment_id": "asg_fixture",
    "play_path": "/play/asg_fixture",
    "questions": 6,
}


class Servers:
    """The api and the web dev server, one fake on 127.0.0.1: what they answer, what they saw."""

    def __init__(self) -> None:
        self.plan = 6
        self.version_id = "lv_fixture"
        self.seen: list[tuple[str, str, Any]] = []
        servers = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_: Any) -> None:
                pass

            def _answer(self, status: int, body: Any) -> None:
                raw = json.dumps(body).encode() if body is not None else b"<html></html>"
                self.send_response(status)
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)

            def do_GET(self) -> None:
                servers.seen.append(("GET", self.path, None))
                if self.path == "/api/health":
                    self._answer(200, {"ok": True})
                elif self.path == "/play/asg_fixture":
                    self._answer(200, None)
                else:
                    self._answer(404, {"error": "not_found"})

            def do_POST(self) -> None:
                body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                servers.seen.append(("POST", self.path, body))
                if self.path == "/api/v1/assignments/asg_fixture/attempts":
                    self._answer(201, {"attempt": {"lesson_version_id": servers.version_id},
                                       "plan": [{"position": n} for n in range(servers.plan)]})
                else:
                    self._answer(404, {"error": "not_found"})

        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.httpd.server_address[1]}"
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()


@pytest.fixture
def servers(monkeypatch: pytest.MonkeyPatch) -> Iterator[Servers]:
    fake = Servers()
    monkeypatch.setenv(lesson_publish.JW_LOCAL_API_URL, fake.url)
    monkeypatch.setenv(lesson_publish.JW_LOCAL_WEB_URL, fake.url + "/")
    yield fake
    fake.httpd.shutdown()


class Make:
    """`make -s lesson-import` stubbed at subprocess.run, so jw's own runner runs: each argv, the
    environment it was given, and what it prints."""

    def __init__(self) -> None:
        self.seen: list[list[str]] = []
        self.envs: list[dict[str, str]] = []
        self.returncode = 0
        self.stdout = "bun run v1\n" + json.dumps(IMPORTED) + "\n"

    def run(self, argv: list[str], **kwargs: Any) -> Any:
        self.seen.append(argv)
        self.envs.append(kwargs["env"])
        return SimpleNamespace(returncode=self.returncode, stdout=self.stdout, stderr="db is down")


@pytest.fixture
def make(monkeypatch: pytest.MonkeyPatch) -> Make:
    stub = Make()
    monkeypatch.setattr(lesson_publish.subprocess, "run", stub.run)
    return stub


@pytest.fixture
def drafts(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    """A checked draft, as lesson_check leaves it."""
    where = tmp_path / "drafts"
    monkeypatch.setenv(JADWIGO_DRAFTS_DIR, str(where))
    lesson._make_dirs(where)
    lesson._write_json(where / ".jw" / f"{DRAFT_ID}.json",
                       {"draft_id": DRAFT_ID, "request": "6 zadań z mnożenia, klasa 3",
                        "questions": []})
    lesson._write_json(where / f"{DRAFT_ID}.json", {"id": "lesson", "script": {"parts": []}})
    _checked(where, ok=True)
    return where


def _checked(where: Path, *, ok: bool) -> None:
    lesson._write_json(where / f"{DRAFT_ID}.check.json",
                       {"ok": ok, "findings": [], "mistake_classes": {}, "checked_at": "x"})


def test_publish_imports_the_checked_draft_and_checks_it_plays(
    drafts: Path, make: Make, servers: Servers
) -> None:
    result = lesson_publish.publish(DRAFT_ID)

    assert make.seen == [["make", "-s", "lesson-import", f"FILE={drafts / f'{DRAFT_ID}.json'}",
                          "JSON=1", "ENV="]]
    assert result["ok"] is True
    assert result["play_url"] == servers.url + "/play/asg_fixture"
    assert (result["lesson_id"], result["version"], result["assignment_id"]) == (
        "les_fixture", 2, "asg_fixture"
    )
    # The form the builder's page reads (dl-a38n.48): one {ok, status, detail} per check.
    verified = result["verified"]
    assert list(verified) == ["api_health", "attempt_started", "play_page"]
    assert all(set(c) == {"ok", "status", "detail"} and c["ok"] for c in verified.values())
    assert [c["status"] for c in verified.values()] == [200, 201, 200]
    assert "6 questions of version lv_fixture" in verified["attempt_started"]["detail"]
    assert dt.datetime.fromisoformat(result["verified_at"]).tzinfo is not None
    assert ("POST", "/api/v1/assignments/asg_fixture/attempts", {"mode": "preview"}) in servers.seen
    assert set(result["timings"]) == {"import_s", "verify_s", "total_s"}

    record_path = Path(result["publish_path"])
    assert record_path == drafts / f"{DRAFT_ID}.publish.json"
    assert record_path.stat().st_mode & 0o777 == 0o600
    record = json.loads(record_path.read_text(encoding="utf-8"))
    assert set(record) == {"draft_id", "request", "lesson_id", "version", "assignment_id",
                           "play_url", "ok", "verified", "verified_at", "target", "published_at",
                           "timings"}
    assert record["ok"] is True
    assert (record["request"], record["target"]) == ("6 zadań z mnożenia, klasa 3", "local")
    assert {k: result[k] for k in record} == record


def test_dev_names_the_owners_command_and_prod_refuses(drafts: Path, make: Make) -> None:
    with pytest.raises(JwError, match="the owner's step") as caught:
        lesson_publish.publish(DRAFT_ID, "dev")
    assert caught.value.hint is not None
    assert f"make lesson-import FILE={drafts / f'{DRAFT_ID}.json'} ENV=dev" in caught.value.hint
    with pytest.raises(JwError, match="never published"):
        lesson_publish.publish(DRAFT_ID, "prod")
    with pytest.raises(JwError, match="unknown target"):
        lesson_publish.publish(DRAFT_ID, "staging")
    assert make.seen == []


def test_publish_refuses_a_draft_without_a_clean_current_check(drafts: Path, make: Make) -> None:
    _checked(drafts, ok=False)
    with pytest.raises(JwError, match="last check is not ok"):
        lesson_publish.publish(DRAFT_ID)
    _checked(drafts, ok=True)
    later = (drafts / f"{DRAFT_ID}.check.json").stat().st_mtime + 5
    os.utime(drafts / f"{DRAFT_ID}.json", (later, later))  # an edit after the check
    with pytest.raises(JwError, match="changed after its last check"):
        lesson_publish.publish(DRAFT_ID)
    (drafts / f"{DRAFT_ID}.check.json").unlink()
    with pytest.raises(JwError, match="has no check yet"):
        lesson_publish.publish(DRAFT_ID)
    assert make.seen == []


def test_a_failed_import_says_how_to_see_it(drafts: Path, make: Make) -> None:
    make.returncode, make.stdout = 2, ""
    with pytest.raises(JwError, match="the import failed \\(exit 2\\): db is down") as caught:
        lesson_publish.publish(DRAFT_ID)
    assert caught.value.hint is not None and "make db-reset" in caught.value.hint


def test_a_lesson_that_does_not_play_is_not_ok(
    drafts: Path, make: Make, servers: Servers, monkeypatch: pytest.MonkeyPatch
) -> None:
    servers.plan, servers.version_id = 5, "lv_other"
    result = lesson_publish.publish(DRAFT_ID)
    assert result["ok"] is False
    attempt = result["verified"]["attempt_started"]
    assert (attempt["ok"], attempt["status"]) == (False, 201)
    assert "the plan has 5 questions, the import 6" in attempt["detail"]
    assert "version lv_other, the import published lv_fixture" in attempt["detail"]
    assert result["verified"]["api_health"]["ok"] and result["verified"]["play_page"]["ok"]
    # Nothing listening: each check says None, and the record is still written.
    servers.httpd.shutdown()
    servers.httpd.server_close()
    result = lesson_publish.publish(DRAFT_ID)
    assert result["ok"] is False
    assert result["verified"]["api_health"] == {
        "ok": False, "status": None, "detail": f"GET {servers.url}/api/health answered nothing"}
    assert Path(result["publish_path"]).is_file()


def test_the_hosts_mirror_the_main_checkouts_ports(monkeypatch: pytest.MonkeyPatch) -> None:
    ports = tomllib.loads((REPO / ".md" / "repo.toml").read_text(encoding="utf-8"))
    assert lesson_publish.DEV_PORTS == ports["review"]["ports"]
    for name in ("API_PORT", "WEB_PORT", lesson_publish.JW_LOCAL_API_URL,
                 lesson_publish.JW_LOCAL_WEB_URL):
        monkeypatch.delenv(name, raising=False)
    assert lesson_publish.api_url() == "http://127.0.0.1:8730"
    assert lesson_publish.web_url() == "http://127.0.0.1:5173"
    monkeypatch.setenv("API_PORT", "8131")
    monkeypatch.setenv("WEB_PORT", "3131")
    assert lesson_publish.api_url() == "http://127.0.0.1:8131"
    assert lesson_publish.web_url() == "http://127.0.0.1:3131"
    monkeypatch.setenv(lesson_publish.JW_LOCAL_WEB_URL, " http://localhost:9000/ ")
    assert lesson_publish.web_url() == "http://localhost:9000"


def test_the_publish_verb_prints_the_record(drafts: Path, make: Make, servers: Servers) -> None:
    result = CliRunner().invoke(cli, ["lesson", "publish", DRAFT_ID, "--json"])
    assert result.exit_code == 0, result.output
    assert json.loads(result.output)["play_url"] == servers.url + "/play/asg_fixture"
    plain = CliRunner().invoke(cli, ["lesson", "publish", DRAFT_ID])
    assert plain.output.startswith(f"ok: {servers.url}/play/asg_fixture")
    refused = CliRunner().invoke(cli, ["lesson", "publish", DRAFT_ID, "--target", "dev"])
    assert refused.exit_code != 0 and "ENV=dev" in refused.output


def test_env_from_the_parent_never_steers_a_local_publish_to_dev(
    drafts: Path, make: Make, servers: Servers, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The Makefile imports into jadwigo-dev when ENV is set, from the environment or MAKEFLAGS: a
    local publish passes ENV= on make's command line, which beats both, and drops them from the
    child's environment."""
    monkeypatch.setenv("ENV", "dev")
    monkeypatch.setenv("MAKEFLAGS", "ENV=dev")
    monkeypatch.setenv("GNUMAKEFLAGS", "ENV=dev")
    result = lesson_publish.publish(DRAFT_ID)
    assert result["ok"] is True and result["target"] == "local"
    ((argv,), (env,)) = (make.seen, make.envs)
    assert argv[-1] == "ENV=" and "ENV=dev" not in argv
    assert not {"ENV", "MAKEFLAGS", "MFLAGS", "GNUMAKEFLAGS"} & set(env)
    assert env["PATH"] == os.environ["PATH"]  # everything else passes through


@pytest.mark.parametrize("missing", ["play_path", "assignment_id", "version_id"])
def test_an_import_answer_without_a_play_path_is_refused(
    drafts: Path, make: Make, servers: Servers, missing: str
) -> None:
    make.stdout = json.dumps({**IMPORTED, missing: None}) + "\n"
    with pytest.raises(JwError, match=f"the import's answer has no {missing}") as caught:
        lesson_publish.publish(DRAFT_ID)
    assert caught.value.hint is not None and "JSON=1" in caught.value.hint
    assert not (drafts / f"{DRAFT_ID}.publish.json").exists()  # no ...5173None in a record
    assert servers.seen == []
