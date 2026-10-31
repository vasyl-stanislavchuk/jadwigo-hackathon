"""jw doctor (dl-a38n.42): five checks against a planted bank checkout and converted file, with a
fake HTTP getter and a fake search, so nothing leaves the machine."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import pytest
from click.testing import CliRunner

from jw import doctor
from jw.cli import main

PLAYS = {"kind": "plays", "rules_version": "sha256:r1", "checked_at": "2026-10-31T10:00:00Z"}


def _item(item_id: str, status: dict[str, Any] | None) -> dict[str, Any]:
    return {"id": item_id, "language": "pl", **({"status": status} if status else {})}


@pytest.fixture
def machine(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """A bank checkout with one page that lists 5 ready ids, of which 3 are stale."""
    bank = tmp_path / "bank"
    (bank / "sets" / "khan").mkdir(parents=True)
    page = {
        "id": "khan-add-10",
        "items": {"ids": ["a", "b", "c", "d", "e"], "ready_ids": {"pl": ["a", "b", "c", "d", "e"]}},
    }
    (bank / "sets" / "khan" / "khan-add-10.json").write_text(json.dumps(page))
    khan = tmp_path / "khan"
    khan.mkdir()
    converted = {
        "generated_by": "tools/khan/to_family_pl.py",
        "items": [
            _item("a", PLAYS),
            _item("b", {"kind": "plays", "rules_version": "sha256:r1"}),
            _item("d", {"kind": "refused", "rule": "picture-missing"}),
            _item("e", PLAYS),
        ],
    }
    (khan / "converted-pl.json").write_text(json.dumps(converted))
    (khan / "readiness.json").write_text(json.dumps({"rules_version": "sha256:r1"}))
    drafts = tmp_path / "drafts"
    drafts.mkdir(mode=0o700)
    monkeypatch.setenv("JADWIGO_BANK_DIR", str(bank))
    monkeypatch.setenv("JADWIGO_KHAN_DIR", str(khan))
    monkeypatch.setenv("JADWIGO_DRAFTS_DIR", str(drafts))
    for name in ("JW_LOCAL_API_URL", "JW_LOCAL_WEB_URL", "API_PORT", "WEB_PORT"):
        monkeypatch.delenv(name, raising=False)
    return bank


def _search(bank_rev: str = "", state: str = "ok") -> Any:
    def search(need: dict[str, Any], **_: Any) -> dict[str, Any]:
        return {"rows": [], "state": [{"arm": "bm25", "state": state}], "bank_rev": bank_rev}

    return search


def _check(result: dict[str, Any], n: int) -> dict[str, Any]:
    return next(c for c in result["checks"] if c["n"] == n)


def test_stale_ready_ids_fail_check_2_with_a_count_and_3_examples(machine: Path) -> None:
    result = doctor.run("pl", get=lambda url: 200, search=_search("x"))
    ready = _check(result, 2)
    assert ready["status"] == doctor.FAIL
    detail = ready["lines"][0]["detail"]
    assert detail.startswith("3 of 5 ready ids on 1 pages are not lesson-ready")
    assert "khan-add-10: b (not checked)" in detail
    assert "khan-add-10: c (not in the converted file)" in detail
    assert "khan-add-10: d (renders wrong: picture-missing)" in detail
    assert "jw bank pull" in ready["lines"][0]["fix"]
    assert result["status"] == doctor.FAIL


def test_every_ready_id_lesson_ready_passes_check_2(machine: Path) -> None:
    page = machine / "sets" / "khan" / "khan-add-10.json"
    page.write_text(json.dumps({"id": "khan-add-10", "items": {"ready_ids": {"pl": ["a", "e"]}}}))
    ready = _check(doctor.run("pl", get=lambda url: 200, search=_search("x")), 2)
    assert ready["status"] == doctor.OK
    assert ready["lines"][0]["detail"] == "2 ready ids on 1 pages, all lesson-ready"


def test_stamps_disagree_and_pages_unstamped(machine: Path) -> None:
    khan = Path(str(machine.parent / "khan"))
    (khan / "readiness.json").write_text(json.dumps({"rules_version": "sha256:r0"}))
    stamps = _check(doctor.run("pl", get=lambda url: 200, search=_search("x")), 3)
    by_name = {line["name"]: line for line in stamps["lines"]}
    assert by_name["pages"]["detail"].startswith("pages unstamped")
    assert by_name["rules_version"]["status"] == doctor.FAIL
    assert "readiness.json sha256:r0" in by_name["rules_version"]["detail"]
    assert "converted file sha256:r1" in by_name["rules_version"]["detail"]


def test_a_stamped_page_that_agrees_is_ok(machine: Path) -> None:
    stamp = "sha256:r1@2026-10-31T10:00:00Z"  # the latest check over the ready items
    khan = machine.parent / "khan"
    (khan / "readiness.json").write_text(
        json.dumps({"rules_version": "sha256:r1", "stamp_id": stamp})
    )
    page = machine / "sets" / "khan" / "khan-add-10.json"
    page.write_text(json.dumps({"id": "khan-add-10", "items": {"ready_stamp": stamp}}))
    stamps = _check(doctor.run("pl", get=lambda url: 200, search=_search("x")), 3)
    assert [line["name"] for line in stamps["lines"]] == ["rules_version", "stamp_id"]
    assert [line["status"] for line in stamps["lines"]] == [doctor.OK, doctor.OK]
    assert stamps["lines"][1]["detail"] == f"{stamp} in readiness.json, converted file, pages"


def test_a_page_from_another_stamp_fails(machine: Path) -> None:
    page = machine / "sets" / "khan" / "khan-add-10.json"
    page.write_text(
        json.dumps(
            {"id": "khan-add-10", "items": {"ready_stamp": "sha256:r0@2026-10-30T09:00:00Z"}}
        )
    )
    stamps = _check(doctor.run("pl", get=lambda url: 200, search=_search("x")), 3)
    by_name = {line["name"]: line for line in stamps["lines"]}
    assert by_name["stamp_id"]["status"] == doctor.FAIL
    assert "pages sha256:r0@2026-10-30T09:00:00Z" in by_name["stamp_id"]["detail"]


def test_bank_rev_compares_the_service_with_the_local_manifest(machine: Path) -> None:
    (machine / "index").mkdir()
    (machine / "index" / "manifest.json").write_bytes(b'{"version": 1}')
    local = hashlib.sha256(b'{"version": 1}').hexdigest()
    same = _check(doctor.run("pl", get=lambda url: 200, search=_search(local)), 4)
    assert same["status"] == doctor.OK
    other = _check(doctor.run("pl", get=lambda url: 200, search=_search("f" * 64)), 4)
    assert other["status"] == doctor.WARN
    down = _check(doctor.run("pl", get=lambda url: 200, search=_search("", "degraded")), 4)
    assert down["status"] == doctor.FAIL


def test_services_name_db_reset_for_a_500(machine: Path) -> None:
    codes = {"/api/health": 200, "/api/v1/featured-lessons": 500}
    seen: list[str] = []

    def get(url: str) -> int:
        seen.append(url)
        return next((c for path, c in codes.items() if url.endswith(path)), 0)

    services = _check(doctor.run("pl", get=get, search=_search("x")), 5)
    assert seen == [
        "http://127.0.0.1:8730/api/health",
        "http://127.0.0.1:8730/api/v1/featured-lessons",
        "http://127.0.0.1:5173/api/health",
    ]
    featured = services["lines"][1]
    assert featured["status"] == doctor.FAIL and "make db-reset" in featured["fix"]


def test_settings_name_what_is_missing(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JADWIGO_DRAFTS_DIR", str(tmp_path / "drafts"))
    settings = doctor.settings_check("pl")
    by_name = {line["name"]: line for line in settings["lines"]}
    assert by_name["bank checkout"]["status"] == doctor.FAIL
    assert by_name["converted items"]["status"] == doctor.FAIL
    assert by_name["drafts directory"]["status"] == doctor.WARN
    assert by_name["drafts directory"]["fix"] == f"mkdir -m 700 -p {tmp_path / 'drafts'}"


def test_the_cli_prints_the_same_json_and_exits_1_on_a_failure(
    machine: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(doctor, "http_status", lambda url: 200)
    monkeypatch.setattr(doctor.bank_client, "search", _search("x"))
    result = CliRunner().invoke(main, ["doctor", "--json"])
    assert result.exit_code == 1
    printed = json.loads(result.output)
    assert [c["n"] for c in printed["checks"]] == [1, 2, 3, 4, 5]
    assert printed["status"] == doctor.FAIL
