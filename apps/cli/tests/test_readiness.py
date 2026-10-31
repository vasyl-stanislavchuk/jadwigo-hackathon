"""`jw question readiness`, converter refusals as shapes, and the cause a gap names (dl-a38n.32.36),
on the planted fixture: tests/fixtures/ready (the Polish side of set_khan_fx0009) and
tests/fixtures/readiness (its English side, the converter's refusals and a readiness.json). Ids and
statuses only, never question text."""

from __future__ import annotations

import json
import shutil
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import fake_bank
import pytest
from click.testing import CliRunner

from jw import readiness, refusals
from jw.cli import main
from jw.commands import question
from jw.settings_keys import JADWIGO_BANK_DIR, JADWIGO_KHAN_DIR, JW_API_URL

FIXTURES = Path(__file__).resolve().parent / "fixtures"
READY = FIXTURES / "ready"
READINESS = FIXTURES / "readiness"
ALT = "a hint picture has no alt text yet (media/khan/alt.json)"
NOT_PULLED = "a picture was not pulled"
MIXED = "a question in several parts whose parts mix families waits"


@pytest.fixture
def khan(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """A Khan dir with the Polish and English converted files and the converter's English
    refusals, no readiness.json; the bank checkout beside it holds the set page."""
    root = tmp_path / "khan"
    root.mkdir()
    shutil.copy(READY / "converted-pl.json", root / "converted-pl.json")
    for name in ("converted.json", "converted.refused.json"):
        shutil.copy(READINESS / name, root / name)
    bank = tmp_path / "bank"
    shutil.copytree(READY, bank)
    monkeypatch.setenv(JADWIGO_KHAN_DIR, str(root))
    monkeypatch.setenv(JADWIGO_BANK_DIR, str(bank))
    readiness._causes.cache_clear()
    return root


def _run(*args: str) -> str:
    result = CliRunner().invoke(main, ["question", *args])
    assert result.exit_code == 0, result.output
    return result.output


def _json(*args: str) -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(_run(*args, "--json"))
    return loaded


@pytest.mark.parametrize(
    ("reason", "cause"),
    [
        (f"refused: x075b4b5fefb5500b: {ALT}", ALT),
        (
            "refused: x1: web+graphie://cdn.invalid/g/4817bc was not pulled; run media.py",
            NOT_PULLED,
        ),
        ("refused: x1: https://cdn.invalid/a.png was not pulled; run media.py", NOT_PULLED),
        ("set set_khan_xc3737896 stopped: 5 of 25 items pl differs from en", "set stopped"),
        ("pl differs from en (numbers)", "pl differs from en (numbers, pictures)"),
        ("pl differs from en (key, numbers, pictures)", "pl differs from en (numbers, pictures)"),
        ("pl differs from en (family, key, numbers)", "pl differs from en (family)"),
        ("no Polish raw item", "no Polish raw item"),
        ("render-picture-missing", "render-picture-missing"),
        # readiness.json's keys: the id gone, the `refused: ` prefix and a placeholder kept
        (f"refused: {ALT}", ALT),
        ("refused: <picture> was not pulled; run media.py", NOT_PULLED),
    ],
)
def test_a_converter_reason_becomes_its_cause_and_stays_one(reason: str, cause: str) -> None:
    assert refusals.cause_of(reason) == cause
    assert refusals.cause_of(cause) == cause


def test_refusals_lists_the_converters_refusals_as_shapes_it_owns(khan: Path) -> None:
    report = _json("refusals", "--lang", "en")

    assert (report["items"], report["ready"], report["refused_before_conversion"]) == (8, 1, 5)
    shapes = [(s["rule"], s["question_type"], s["items"], s["owner"]) for s in report["shapes"]]
    assert shapes == [(ALT, None, 3, "converter"), (NOT_PULLED, None, 2, "converter")]
    # fxr4 waits in the converted file; the converter lists it too, and it counts once.
    assert report["waiting"] == 1

    _run("refusals", "assign", NOT_PULLED, "-", "dl-fixture-pic", "--lang", "en")

    assert _json("refusals", "--lang", "en", "--new")["shapes"][0]["rule"] == ALT
    assert "5 refused before conversion" in _run("refusals", "--lang", "en")


def test_readiness_computed_from_the_files_counts_every_cause_with_its_bead(khan: Path) -> None:
    _run("refusals", "assign", ALT, "-", "dl-fixture-alt", "--lang", "en")

    pl, en = _json("readiness")["languages"]

    assert (pl["language"], pl["source"], pl["items"], pl["ready"]) == ("pl", "computed", 5, 1)
    assert [(r["cause"], r["items"]) for r in pl["refused"]["by_cause"]] == [
        ("key-grades", 1),
        ("render-picture-missing", 1),
        ("render-raw-tex", 1),
    ]
    assert (en["items"], en["ready"], en["not_checked"], en["flagged"]) == (8, 1, 1, 0)
    assert en["waiting"] == {
        "items": 1,
        "by_reason": [{"reason": MIXED, "items": 1, "issue": "dl-fixture-wait"}],
    }
    assert en["refused"] == {
        "items": 5,
        "by_cause": [
            {"cause": ALT, "items": 3, "owner": "converter", "issue": "dl-fixture-alt"},
            {"cause": NOT_PULLED, "items": 2, "owner": "converter", "issue": None},
        ],
    }
    assert en["readmitted"] is None
    assert en["rules_version"] == "fixture-2"
    assert en["sets"] == {"indexed": 1, "skipped_no_ready": []}
    assert en["warnings"] is None

    text = _run("readiness", "--lang", "en")
    assert "en: 8 items, 1 lesson-ready, 1 waiting, 5 refused, 0 flagged, 1 not checked" in text
    assert f"        3  {ALT}  [converter]  dl-fixture-alt" in text
    assert f"        2  {NOT_PULLED}  [converter]  no bead" in text
    assert f"        1  {MIXED}  dl-fixture-wait" in text
    assert "re-admitted since the previous run: unknown" in text


def test_readiness_reads_readiness_json_when_it_has_the_language(khan: Path) -> None:
    shutil.copy(READINESS / "readiness.json", khan / "readiness.json")
    _run("refusals", "assign", "render-picture-missing", "multi_select", "dl-fixture-media")

    pl, en = _json("readiness")["languages"]

    assert (pl["source"], pl["generated_at"], pl["rules_version"]) == (
        "readiness.json",
        "2026-10-31T12:00:00Z",
        "fixture-2",
    )
    assert (pl["items"], pl["ready"], pl["not_checked"], pl["flagged"]) == (40, 21, 1, 1)
    # Raw converter reasons and causes merge: 3 graphie + 1 https picture are one cause.
    assert [
        (r["cause"], r["items"], r["owner"], r["issue"]) for r in pl["refused"]["by_cause"]
    ] == [
        (ALT, 6, "converter", None),
        (NOT_PULLED, 4, "converter", None),
        ("no Polish raw item", 2, "converter", None),
        ("render-picture-missing", 2, "media", "dl-fixture-media"),
        ("pl differs from en (family)", 1, "converter", None),
    ]
    assert pl["waiting"]["by_reason"] == [{"reason": MIXED, "items": 2, "issue": "dl-fixture-wait"}]
    assert pl["readmitted"] == [
        {"cause": "set stopped", "items": 4},
        {"cause": "pl differs from en (numbers, pictures)", "items": 3},
    ]
    assert pl["sets"] == {"indexed": 3, "skipped_no_ready": ["set_khan_fx0010"]}
    assert pl["warnings"] == [
        {"kind": "twin numbers", "items": 5},
        {"kind": "twin pictures", "items": 2},
    ]
    # readiness.json has no English block, so English is counted from the files.
    assert (en["source"], en["items"]) == ("computed", 8)

    text = _run("readiness", "--lang", "pl")
    for row in pl["refused"]["by_cause"]:
        assert f"{row['items']:>5}  {row['cause']}" in text
    assert "re-admitted since the previous run: 7" in text
    assert "        4  set stopped" in text
    assert "sets: 3 indexed, 1 skipped with no ready item: set_khan_fx0010" in text
    assert "warnings, by kind: 7" in text
    assert "        5  twin numbers" in text

    assert _json("readiness", "--lang", "pl", "--from-files")["languages"][0]["source"] == (
        "computed"
    )


def test_a_language_with_nothing_to_read_says_so(khan: Path) -> None:
    (khan / "converted.json").unlink()

    pl, en = _json("readiness")["languages"]

    assert pl["ready"] == 1
    assert en["language"] == "en" and "no converted items file" in en["missing"]
    assert "en: nothing to read (no converted items file" in _run("readiness")
    result = CliRunner().invoke(main, ["question", "readiness", "--lang", "en"])
    assert result.exit_code == 1


def test_a_readiness_file_of_another_shape_is_refused(khan: Path) -> None:
    (khan / "readiness.json").write_text('{"pl": {}}', encoding="utf-8")

    result = CliRunner().invoke(main, ["question", "readiness", "--json"])

    assert result.exit_code == 1
    assert "is not a readiness file" in result.output


def test_the_dominant_cause_names_its_share_and_bead(khan: Path) -> None:
    ids = ["fxr1", "fxr2", "fxr3", "fxr4", "fxr5"]
    assert readiness.dominant_cause(ids, "en") == f"{ALT}, 3 of 5 items"

    _run("refusals", "assign", ALT, "-", "dl-fixture-alt", "--lang", "en")

    assert readiness.dominant_cause(ids, "en") == f"{ALT}, 3 of 5 items (dl-fixture-alt)"
    assert (
        readiness.dominant_cause(["fxr4"], "en")
        == f"waiting: {MIXED}, 1 of 1 items (dl-fixture-wait)"
    )
    assert readiness.dominant_cause(["fxe9"], "en") is None
    assert readiness.dominant_cause(ids, "uk") is None


class ReadyBank(fake_bank.FakeBank):
    """The fake bank, answering with set_khan_fx0009, which has no lesson-ready item in English."""

    def answer(self, need: Any, query: dict[str, str]) -> dict[str, Any]:
        envelope: dict[str, Any] = json.loads((READY / "envelope.json").read_text("utf-8"))
        envelope["need"] = need
        return envelope


@pytest.fixture
def ready_bank(khan: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Any]:
    fake = ReadyBank().start()
    monkeypatch.setenv(JW_API_URL, fake.url)
    yield fake
    fake.stop()


def test_a_gap_of_a_set_with_nothing_ready_names_the_dominant_cause(ready_bank: Any) -> None:
    (row,) = question.gaps_report(grade="3", words=["liczby parzyste"], language="en")["needs"]

    assert row["verdict"] == "gap"
    assert row["reason"] == f"no item is lesson-ready in en; most: {ALT}, 3 of 5 items"

    args = ["question", "gaps", "--words", "liczby parzyste", "--grade", "3", "--language", "en"]
    assert f"most: {ALT}, 3 of 5 items)" in CliRunner().invoke(main, args).output


def test_a_first_run_re_admitted_nothing(khan: Path) -> None:
    raw = json.loads((READINESS / "readiness.json").read_text("utf-8"))
    raw["languages"]["pl"]["readmitted"] = {}
    raw["languages"]["pl"]["waiting"] = {"dl-fx9.1": 2}
    (khan / "readiness.json").write_text(json.dumps(raw), encoding="utf-8")

    (pl,) = _json("readiness", "--lang", "pl")["languages"]

    assert pl["readmitted"] == []
    # A waiting item keyed by its bead carries that bead.
    assert pl["waiting"]["by_reason"] == [
        {"reason": "dl-fx9.1", "items": 2, "issue": "dl-fx9.1"}
    ]
    assert "re-admitted since the previous run: 0" in _run("readiness", "--lang", "pl")


def test_a_flag_changes_the_dominant_cause_at_once(khan: Path) -> None:
    assert readiness.dominant_cause(["fxr5"], "en") == "not checked, 1 of 1 items"

    _run("flag", "fxr5", "the options repeat", "--lang", "en")

    assert readiness.dominant_cause(["fxr5"], "en") == "flagged, 1 of 1 items"
