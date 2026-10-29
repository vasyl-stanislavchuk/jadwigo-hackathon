"""The compose eval on the owner's real Polish items (dl-e8ov.5.38.4). Opt-in, never in CI.

    cd apps/cli
    JW_KHAN_CONVERTED=<converted-pl.json> JADWIGO_BANK_DIR=<jadwigo-bank checkout> \
      uv run --frozen pytest -q evals/compose/eval_real_items.py

The file name does not start with `test_`, so `pytest -q` never collects it; naming it runs it.
It is skipped, with the reason, when either path is missing. It asks for "6 zadań z mnożenia,
klasa 3" against the multiplication sets of the bank checkout whose items are in the converted
file (the search is stubbed with those sets, so no bank URL or token is read), fills every rung
with one placeholder line and each twin with the question itself, and runs the real check.ts.
It shows the real items compile as the import compiles them; it says nothing about the rungs, which
a composing agent writes. Nothing it reads is written into the repo: the lesson file goes to a
temporary folder.
"""

from __future__ import annotations

import json
import os
import shutil
from pathlib import Path
from typing import Any

import pytest

from jw import lesson, settings_keys
from jw.commands import question

REQUEST = "6 zadań z mnożenia, klasa 3"
CONVERTED = os.environ.get(settings_keys.JW_KHAN_CONVERTED, "")
BANK_DIR = os.environ.get(settings_keys.JADWIGO_BANK_DIR, "")

pytestmark = [
    pytest.mark.skipif(
        not CONVERTED or not Path(CONVERTED).is_file(),
        reason=f"{settings_keys.JW_KHAN_CONVERTED} names no converted items file",
    ),
    pytest.mark.skipif(
        not BANK_DIR or not (Path(BANK_DIR) / "sets").is_dir(),
        reason=f"{settings_keys.JADWIGO_BANK_DIR} names no bank checkout",
    ),
    pytest.mark.skipif(shutil.which("bun") is None, reason="bun is not on PATH"),
]


def _multiplication_rows() -> list[dict[str, Any]]:
    """Grade 3 multiplication sets whose items the converted file holds, most items first."""
    raw = json.loads(Path(CONVERTED).read_text(encoding="utf-8"))
    playable = {i["id"] for i in raw["items"] if i.get("spec")}
    found = []
    for path in sorted((Path(BANK_DIR) / "sets").rglob("set_*.json")):
        page = json.loads(path.read_text(encoding="utf-8"))
        title = ((page.get("titles") or {}).get("pl") or "").lower()
        if page.get("grade") != "3" or "mno" not in title:
            continue
        held = [i for i in (page.get("items") or {}).get("ids") or [] if i in playable]
        if held:
            found.append((len(held), page["id"]))
    found.sort(reverse=True)
    return [{"id": set_id, "rank": n} for n, (_, set_id) in enumerate(found[:3], start=1)]


def _fill(draft: dict[str, Any]) -> dict[str, Any]:
    for q in draft["questions"]:
        worked = list(q["material"]["worked"]) or ["(rozwiązanie)"]
        q["help"] = {
            "look": {"text": "Przeczytaj zadanie jeszcze raz."},
            "boost": {"text": "Pomyśl, ile jest grup i ile w każdej."},
            "boost_by_mistake": {"any": {"text": "Sprawdź jeszcze raz."}},
            "almost": [*worked[:-1], ""],
            "worked": worked,
            "twin": {"say": q["say"], **q["question"]},
        }
    return draft


def test_a_real_multiplication_draft_checks(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv(settings_keys.JW_BANK_ENV_FILE, str(tmp_path / "no-bank.env"))
    rows = _multiplication_rows()
    assert rows, f"no grade 3 multiplication set in {BANK_DIR} holds a converted item"
    monkeypatch.setattr(question, "search_envelope", lambda **_: {"rows": rows})

    draft = lesson.draft(REQUEST, "3")
    assert draft["rule_settled"] is False
    assert len(draft["questions"]) == 6, draft["left_out"]
    assert all(q["credit"]["source"] and q["credit"]["licence"] for q in draft["questions"])
    assert all(q["why_drawn"] for q in draft["questions"])
    assert all(q["skill_ids"] and ":" not in q["skill_ids"][0] for q in draft["questions"])
    assert all(left["reason"] for left in draft["left_out"])

    result = lesson.check(_fill(draft), out_dir=tmp_path)
    assert result["ok"] is True, result["errors"]
    assert result["play_path"].startswith("/play/")
    print(lesson.card_text(result["card"]))
