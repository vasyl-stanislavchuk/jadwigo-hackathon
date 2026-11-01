"""dl-u1y5.23 (moved from dl-e8ov.5.2.8): set pages from the local bank checkout, and the caller's gap list.

`show_set` reads JADWIGO_BANK_DIR and checks each page against the pinned set schema. `gaps`
searches the fake bank once per need and tells a need the bank could not meet from one it could
not be asked.
"""

from __future__ import annotations

import json
import shutil
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import fake_bank
import pytest

from jw import bank_client, settings_keys
from jw.errors import JwError
from jw.settings_keys import JADWIGO_BANK_DIR, JW_API_URL

BANK_DIR = Path(__file__).resolve().parent / "fixtures" / "bank"


@pytest.fixture
def bank(monkeypatch: pytest.MonkeyPatch) -> Iterator[Any]:
    fake = fake_bank.FakeBank().start()
    monkeypatch.setenv(JW_API_URL, fake.url)
    monkeypatch.setenv(JADWIGO_BANK_DIR, str(BANK_DIR))
    yield fake
    fake.stop()


def test_the_pinned_set_schema_names_its_bank_commit() -> None:
    schema = json.loads(bank_client.SET_SCHEMA.read_text(encoding="utf-8"))
    assert "at bank commit " in schema["$comment"]


@pytest.mark.parametrize("path", sorted((BANK_DIR / "sets").glob("*.json")), ids=lambda p: p.stem)
def test_every_fixture_page_validates(path: Path) -> None:
    bank_client.validate_set(json.loads(path.read_text(encoding="utf-8")))


def test_show_reads_the_page(bank: Any) -> None:
    assert bank_client.show_set("set_khan_fx0001")["titles"]["pl"] == "Dodawanie pisemne do 1000"


def test_show_refuses_a_missing_dir_a_bad_id_and_an_unknown_set(
    bank: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    with pytest.raises(bank_client.SetNotFound, match="not a set id"):
        bank_client.show_set("../../etc/passwd")
    with pytest.raises(bank_client.SetNotFound, match="no page for set_khan_nope"):
        bank_client.show_set("set_khan_nope")
    monkeypatch.delenv(JADWIGO_BANK_DIR)
    with pytest.raises(bank_client.BankDirNotConfigured):
        bank_client.show_set("set_khan_fx0001")


def test_show_refuses_a_page_that_breaks_the_schema(tmp_path: Path) -> None:
    (tmp_path / "sets").mkdir()
    (tmp_path / "sets" / "set_khan_bad.json").write_text('{"id": "set_khan_bad"}')
    with pytest.raises(JwError, match=r"does not match set\.schema\.json"):
        bank_client.show_set("set_khan_bad", bank_dir=tmp_path)


def test_gaps_reports_found_needs(bank: Any) -> None:
    report = bank_client.gaps([{"language": "pl", "grade": "3", "words": "dodawanie"}])
    assert report["gaps"] == 0 and report["needs"][0]["verdict"] == "found"
    assert report["needs"][0]["top"] == ["set_khan_xd4e5f6", "set_khan_xj1k2l3"]


def test_a_bank_that_cannot_be_asked_is_degraded_not_a_gap(bank: Any) -> None:
    bank.status = 503
    report = bank_client.gaps([{"language": "pl", "grade": "3", "words": "dodawanie"}])
    assert report["gaps"] == 0 and report["degraded"] == 1


def test_an_empty_answer_is_a_gap(bank: Any, monkeypatch: pytest.MonkeyPatch) -> None:
    def empty(need: Any, query: Any) -> dict[str, Any]:
        return {
            "version": 1,
            "need": need,
            "rows": [],
            "state": [{"arm": "C", "state": "empty"}, {"arm": "A1", "state": "not_asked"}],
        }

    monkeypatch.setattr(bank, "answer", empty)
    report = bank_client.gaps([{"language": "pl", "grade": "3", "skills": ["maths.none"]}])
    assert report["gaps"] == 1
    assert report["needs"][0]["state"] == [{"arm": "C", "state": "empty"}]


def test_with_no_setting_the_pages_come_from_where_jw_bank_pull_clones(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """dl-a38n.60: JADWIGO_BANK_DIR unset reads settings_keys.bank_dir()'s default; a missing
    checkout says to run jw bank pull."""
    with pytest.raises(bank_client.BankDirNotConfigured, match="no bank checkout") as caught:
        bank_client.show_set("set_khan_fx0003")
    assert "jw bank pull" in caught.value.hint
    clone = tmp_path / "clone"
    shutil.copytree(BANK_DIR, clone)
    monkeypatch.setattr(settings_keys, "DEFAULT_BANK_DIR", clone)
    assert bank_client.show_set("set_khan_fx0003")["id"] == "set_khan_fx0003"
