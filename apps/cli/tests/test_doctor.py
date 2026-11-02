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
    khan = machine.parent / "khan"
    assert ready["lines"][0]["detail"] == (
        f"2 ready ids on 1 pages, all lesson-ready in {khan / 'converted-pl.json'}"
    )


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
    monkeypatch.setattr(doctor.settings_keys, "DEFAULT_BANK_DIR", tmp_path / "no-bank")
    settings = doctor.settings_check(["pl"])
    by_name = {line["name"]: line for line in settings["lines"]}
    assert by_name["bank checkout"]["status"] == doctor.FAIL
    assert by_name["converted items (pl)"]["status"] == doctor.FAIL
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


def test_a_loose_bank_env_is_a_fail_line_with_its_fix_not_a_crash(
    machine: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    env = tmp_path / "bank.env"
    env.write_text("JW_BANK_TIMEOUT_SECS=10\n")
    env.chmod(0o644)
    monkeypatch.setenv("JW_BANK_ENV_FILE", str(env))
    monkeypatch.delenv("JADWIGO_BANK_DIR")
    monkeypatch.setattr(doctor, "http_status", lambda url: 200)
    monkeypatch.setattr(doctor.bank_client, "search", _search("x"))
    result = CliRunner().invoke(main, ["doctor", "--json"])
    assert result.exit_code == 1
    printed = json.loads(result.output)
    assert [c["n"] for c in printed["checks"]] == [1, 2, 3, 4, 5]
    settings = printed["checks"][0]["lines"][0]
    assert settings["status"] == doctor.FAIL
    assert "can be read by other users" in settings["detail"]
    assert settings["fix"].startswith(f"chmod 600 {env}")
    assert _check(printed, 5)["status"] == doctor.OK


def test_the_mcp_tool_returns_the_verb_s_json(
    machine: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import anyio

    from jw.commands.mcp import build_server

    monkeypatch.setattr(doctor, "http_status", lambda url: 200)
    monkeypatch.setattr(doctor.bank_client, "search", _search("x"))
    verb = json.loads(CliRunner().invoke(main, ["doctor", "--language", "pl", "--json"]).output)
    result = anyio.run(build_server().call_tool, "doctor", {"language": "pl"})
    assert not result.is_error
    assert result.structured_content == verb


# dl-n9fr.65 and dl-n9fr.64: every language, and one home for the converted files.


def _english(machine: Path, ids: list[str]) -> None:
    """The page lists `ids` as ready in en; converted.json beside the Polish file holds only a."""
    khan = machine.parent / "khan"
    page = machine / "sets" / "khan" / "khan-add-10.json"
    raw = json.loads(page.read_text())
    raw["items"]["ready_ids"]["en"] = ids
    page.write_text(json.dumps(raw))
    english = {"generated_by": "tools/khan/to_family.py", "items": [{**_item("a", PLAYS), "language": "en"}]}
    (khan / "converted.json").write_text(json.dumps(english))


def test_doctor_with_no_language_checks_pl_and_en_each_against_its_own_file(
    machine: Path,
) -> None:
    _english(machine, ["a", "x1", "x2"])
    result = doctor.run(get=lambda url: 200, search=_search("x"))
    assert result["language"] is None and result["languages"] == ["pl", "en"]
    lines = {line["name"]: line for line in _check(result, 2)["lines"]}
    assert set(lines) == {"ready ids (pl)", "ready ids (en)"}
    english = lines["ready ids (en)"]
    assert english["status"] == doctor.FAIL
    assert english["detail"].startswith("2 of 3 ready ids on 1 pages are not lesson-ready in ")
    assert str(machine.parent / "khan" / "converted.json") in english["detail"]
    assert "khan-add-10: x1 (not in the converted file)" in english["detail"]
    settings = {line["name"] for line in _check(result, 1)["lines"]}
    assert {"converted items (pl)", "converted items (en)", "converted homes"} <= settings


def test_doctor_with_a_language_checks_only_that_one(machine: Path) -> None:
    _english(machine, ["x1"])
    result = doctor.run("en", get=lambda url: 200, search=_search("x"))
    assert [line["name"] for line in _check(result, 2)["lines"]] == ["ready ids (en)"]


def test_the_cli_without_language_checks_both(machine: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _english(machine, ["a"])
    monkeypatch.setattr(doctor, "http_status", lambda url: 200)
    monkeypatch.setattr(doctor.bank_client, "search", _search("x"))
    printed = json.loads(CliRunner().invoke(main, ["doctor", "--json"]).output)
    assert printed["languages"] == ["pl", "en"]


def test_converted_files_in_one_home_are_ok(machine: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _english(machine, ["a"])
    monkeypatch.setattr(doctor.settings_keys, "DEFAULT_KHAN_DIR", machine.parent / "khan")
    line = doctor.homes_line(["pl", "en"])
    assert line["status"] == doctor.OK and str(machine.parent / "khan") in line["detail"]


def test_a_second_copy_in_the_default_home_warns_with_both_paths(
    machine: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The MCP server reads one copy (JW_KHAN_CONVERTED); a shell jw without it reads the cache."""
    _english(machine, ["a"])
    cache = tmp_path / "cache-khan"
    cache.mkdir()
    (cache / "converted.json").write_text("{}")
    monkeypatch.setattr(doctor.settings_keys, "DEFAULT_KHAN_DIR", cache)
    line = doctor.homes_line(["pl", "en"])
    assert line["status"] == doctor.WARN
    assert f"{cache / 'converted.json'} is a second en copy" in line["detail"]
    assert str(machine.parent / "khan" / "converted.json") in line["detail"]
    assert "JADWIGO_KHAN_DIR" in line["fix"]


def test_languages_read_from_different_folders_warn(
    machine: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    other = tmp_path / "elsewhere" / "converted.json"
    other.parent.mkdir()
    other.write_text("{}")
    monkeypatch.setenv("JW_KHAN_CONVERTED_EN", str(other))
    monkeypatch.setattr(doctor.settings_keys, "DEFAULT_KHAN_DIR", tmp_path / "no-cache")
    line = doctor.homes_line(["pl", "en"])
    assert line["status"] == doctor.WARN
    assert "the languages read from different folders" in line["detail"]
