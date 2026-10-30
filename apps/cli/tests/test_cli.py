"""jw's top-level verbs, and the refusals loop (dl-a38n.32.11): `jw question refusals`,
`refusals assign` and `jw question flag`, on the planted fixture of wave dl-a38n.32-1
(tests/fixtures/ready, our own small bank: 1 ready item, 3 refused, 1 not checked)."""

from __future__ import annotations

import datetime as dt
import json
import shutil
from collections.abc import Iterator
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import fake_bank
import pytest
from click.testing import CliRunner

from jw import items, lesson, refusals
from jw.cli import main
from jw.settings_keys import (
    JADWIGO_BANK_DIR,
    JADWIGO_DRAFTS_DIR,
    JW_API_URL,
    JW_KHAN_CONVERTED,
)

READY = Path(__file__).resolve().parent / "fixtures" / "ready"
THREE_SHAPES = [
    ("key-grades", "multi_select", 1, "converter", ["fxr3"]),
    ("render-picture-missing", "multi_select", 1, "media", ["fxr4"]),
    ("render-raw-tex", "multi_select", 1, "lesson-kit", ["fxr2"]),
]


def test_version() -> None:
    result = CliRunner().invoke(main, ["--version"])
    assert result.exit_code == 0
    assert "jw, version 0.0.1" in result.output


@pytest.fixture
def checkout(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """The planted fixture copied into tmp_path as the bank checkout and the converted file."""
    root = tmp_path / "bank"
    shutil.copytree(READY, root)
    monkeypatch.setenv(JADWIGO_BANK_DIR, str(root))
    monkeypatch.setenv(JW_KHAN_CONVERTED, str(root / "converted-pl.json"))
    items._read.cache_clear()
    return root


def _run(*args: str) -> Any:
    result = CliRunner().invoke(main, ["question", *args])
    assert result.exit_code == 0, result.output
    return result


def _report(*args: str) -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(_run("refusals", *args, "--json").output)
    return loaded


def _shapes(report: dict[str, Any]) -> list[tuple[Any, ...]]:
    return [
        (s["rule"], s["question_type"], s["items"], s["owner"], s["examples"])
        for s in report["shapes"]
    ]


def test_refusals_lists_each_shape_with_its_count_examples_and_owner(checkout: Path) -> None:
    report = _report()

    assert (report["items"], report["ready"], report["not_checked"]) == (5, 1, 1)
    assert _shapes(report) == THREE_SHAPES
    assert all(s["issue"] is None for s in report["shapes"])
    text = _run("refusals").output
    assert "5 items, 1 lesson-ready, 1 not checked, 0 waiting" in text
    assert "render-raw-tex          multi_select   1      lesson-kit  -      fxr2" in text


def test_new_lists_only_the_shapes_no_bead_tracks(checkout: Path) -> None:
    assert _shapes(_report("--new")) == THREE_SHAPES

    _run("refusals", "assign", "key-grades", "multi_select", "dl-fixture-1")

    assert _shapes(_report("--new")) == THREE_SHAPES[1:]
    assigned = {s["rule"]: s["issue"] for s in _report()["shapes"]}
    assert assigned["key-grades"] == "dl-fixture-1"


def test_assign_writes_ids_and_reasons_only_and_replaces_an_earlier_bead(checkout: Path) -> None:
    _run("refusals", "assign", "key-grades", "multi_select", "dl-fixture-1")
    _run("refusals", "assign", "key-grades", "multi_select", "dl-fixture-2")
    _run("refusals", "assign", "render-overflow", "-", "dl-fixture-3")

    written = json.loads((checkout / "refusals" / "pl.json").read_text("utf-8"))
    assert written == {
        "shapes": [
            {"rule": "key-grades", "question_type": "multi_select", "issue": "dl-fixture-2"},
            {"rule": "render-overflow", "question_type": None, "issue": "dl-fixture-3"},
        ],
        "flags": [],
    }
    # Never the question's text: no word of the fixture's stem reaches the file.
    assert "parzyste" not in (checkout / "refusals" / "pl.json").read_text("utf-8")


def test_since_shows_whether_a_beads_shape_still_holds_items(checkout: Path) -> None:
    _run("refusals", "assign", "key-grades", "multi_select", "dl-fixture-1")

    since = _report("--since", "dl-fixture-1")["since"]
    assert since["shapes"] == [
        {
            "rule": "key-grades",
            "question_type": "multi_select",
            "still_refused": ["fxr3"],
            "plays_now": False,
        }
    ]

    # The fix lands and the next stamp says fxr3 plays: the bead's shape is empty.
    converted = checkout / "converted-pl.json"
    payload = json.loads(converted.read_text("utf-8"))
    fxr3 = next(i for i in payload["items"] if i["id"] == "fxr3")
    fxr3["status"] = {"kind": "plays", "rules_version": "fixture-2", "checked_at": "2026-10-31"}
    converted.write_text(json.dumps(payload), encoding="utf-8")

    since = _report("--since", "dl-fixture-1")["since"]
    assert since["shapes"][0]["plays_now"] is True
    assert "key-grades / multi_select: empty, every item plays now" in _run(
        "refusals", "--since", "dl-fixture-1"
    ).output


def test_a_sidecar_run_newer_than_the_stamp_shows_at_once(checkout: Path) -> None:
    finding = {
        "step_id": "fxr1",
        "path": "data.options",
        "level": "error",
        "rule": "render-overflow",
        "text": "An option runs past the card.",
        "fix": "Wrap the option.",
    }
    sidecar = {
        "items": {"fxr1": {"render_ok": False, "findings": [finding]}},
        "rules_version": "fixture-2",
        "ran_at": "2026-10-31T09:00:00Z",
    }
    (checkout / "converted-pl.render.json").write_text(json.dumps(sidecar), encoding="utf-8")

    assert ("render-overflow", "multi_select", 1, "lesson-kit", ["fxr1"]) in _shapes(_report())


def test_flag_and_clear(checkout: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(refusals, "_today", lambda: dt.date(2026, 10, 30))

    _run("flag", "fxr1", "--lang", "pl", "the options repeat")

    path = checkout / "refusals" / "pl.json"
    assert json.loads(path.read_text("utf-8"))["flags"] == [
        {"id": "fxr1", "by": "owner", "reason": "the options repeat", "on": "2026-10-30"}
    ]
    flagged = ("flagged", "multi_select", 1, "owner", ["fxr1"])
    assert flagged in _shapes(_report())
    assert _report()["ready"] == 0

    _run("flag", "fxr1", "--clear")

    assert json.loads(path.read_text("utf-8"))["flags"] == []
    assert _report()["ready"] == 1


def test_flag_refuses_an_unknown_id_an_empty_reason_and_a_missing_checkout(
    checkout: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    for args in (["fxr99", "why"], ["fxr1"], ["fxr1", "--clear"]):
        result = CliRunner().invoke(main, ["question", "flag", *args])
        assert result.exit_code == 1, args
    monkeypatch.delenv(JADWIGO_BANK_DIR)
    result = CliRunner().invoke(main, ["question", "flag", "fxr1", "why"])
    assert result.exit_code == 1
    assert JADWIGO_BANK_DIR in result.output


class _ReadyBank(fake_bank.FakeBank):
    def answer(self, need: Any, query: dict[str, str]) -> dict[str, Any]:
        envelope: dict[str, Any] = json.loads((READY / "envelope.json").read_text("utf-8"))
        envelope["need"] = need
        return envelope


@pytest.fixture
def bank(checkout: Path, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Iterator[None]:
    fake = _ReadyBank().start()
    monkeypatch.setenv(JW_API_URL, fake.url)
    monkeypatch.setenv(JADWIGO_DRAFTS_DIR, str(tmp_path / "drafts"))
    ok = {"ok": True, "errors": [], "mistake_classes": {}}
    answer = SimpleNamespace(returncode=0, stdout=json.dumps(ok), stderr="")
    monkeypatch.setattr(lesson.shutil, "which", lambda _name: "bun")
    monkeypatch.setattr(lesson, "_run", lambda _repo: lambda _argv: answer)
    yield
    fake.stop()


def test_a_flag_holds_in_the_next_draft_with_no_re_run(bank: None) -> None:
    draft = ["lesson", "draft", "zadania z liczb parzystych", "--grade", "3"]
    draft += ["--topic", "liczby parzyste", "--no-names", "--json"]

    before = json.loads(CliRunner().invoke(main, draft).output)
    _run("flag", "fxr1", "the options repeat")
    after = json.loads(CliRunner().invoke(main, draft).output)

    assert [q["item_id"] for q in before["questions"]] == ["fxr1"]
    assert after["questions"] == []
    left = {item["id"]: item["reason"] for item in after["left_out"]}
    assert left["fxr1"] == "flagged: the options repeat"
