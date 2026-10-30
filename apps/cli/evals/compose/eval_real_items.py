"""The compose eval on the owner's real Polish items (dl-e8ov.5.38.4). Opt-in, never in CI.

    cd apps/cli
    JW_KHAN_CONVERTED=<converted-pl.json> JADWIGO_BANK_DIR=<jadwigo-bank checkout> \
      uv run --frozen pytest -q evals/compose/eval_real_items.py

The file name does not start with `test_`, so `pytest -q` never collects it; naming it runs it.
It is skipped, with the reason, when either path is missing. It asks for "6 zadań z mnożenia,
klasa 3" against the multiplication sets of the bank checkout whose items are in the converted
file (the search is stubbed with those sets, so no bank URL or token is read), copies each drawn
question whole, writes what each step's you_write lists (one placeholder line, and the question
itself as the twin), and runs the real check.ts. It shows the real items play as copied and
compile as the import compiles them; it says nothing about the agent's words. Nothing it reads is written into the repo: the lesson file goes to a
temporary folder.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import shutil
from pathlib import Path
from typing import Any

import pytest

from jw import lesson, settings_keys
from jw.commands import question

REQUEST = "6 zadań z mnożenia, klasa 3"
TODAY = dt.date(2026, 10, 29)
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


def _words(draft: dict[str, Any], folder: Path) -> dict[str, Any]:
    stored = lesson.load_draft(draft["draft_id"], folder)
    placeholder = {
        "look": {"text": "Przeczytaj zadanie jeszcze raz."},
        "boost": {"text": "Pomyśl, ile jest grup i ile w każdej."},
        "worked": ["(rozwiązanie)"],
    }
    words: dict[str, Any] = {}
    for q, kept in zip(draft["questions"], stored["questions"], strict=True):
        twin = {"say": kept["say"], **{k: kept["question"][k] for k in ("family", "data", "key")}}
        words[q["step_id"]] = {"twin": twin, **{r: placeholder[r] for r in q["you_write"]
                                                if r in placeholder}}
        if "boost_by_mistake" in q["you_write"]:
            words[q["step_id"]]["boost_by_mistake"] = {
                q["mistake_classes"][0]: {"text": "Sprawdź jeszcze raz."}
            }
    return words


def test_a_real_multiplication_draft_checks(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv(settings_keys.JW_BANK_ENV_FILE, str(tmp_path / "no-bank.env"))
    rows = _multiplication_rows()
    assert rows, f"no grade 3 multiplication set in {BANK_DIR} holds a converted item"
    monkeypatch.setattr(question, "search_envelope", lambda **_: {"rows": rows})

    draft = lesson.draft(
        REQUEST, "3", names=[], topic="mnożenie", today=TODAY, folder=tmp_path
    )
    assert draft["rule_settled"] is False
    assert draft["plays_as_copied"] is True, draft["copy_errors"]
    assert len(draft["questions"]) == 6, draft["left_out"]
    assert len(json.dumps(draft, ensure_ascii=False)) < 20_000
    assert all(q["copied_help"]["hints"] for q in draft["questions"])
    assert all(q["why_drawn"] for q in draft["questions"])
    assert all(left["reason"] for left in draft["left_out"])
    stored = lesson.load_draft(draft["draft_id"], tmp_path)
    assert all(q["credit"]["source"] and q["credit"]["licence"] for q in stored["questions"])
    assert all(q["skill_ids"] and ":" not in q["skill_ids"][0] for q in stored["questions"])

    result = lesson.check(draft["draft_id"], _words(draft, tmp_path), out_dir=tmp_path, folder=tmp_path)
    assert result["ok"] is True, result["errors"]
    assert result["play_path"].startswith("/play/")
    print(lesson.card_text(result["card"]))
