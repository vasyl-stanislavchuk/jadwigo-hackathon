"""dl-hin8.15: when nothing plays in the asked language, the lesson is offered in its questions'
original language, whole, never mixed (decision jadwigo-ai-workflows/decisions/2026-11-01-when-a-
lesson-s-language-has-nothing-checked-the-family-is-offer). The fixture pages are Khan-shaped, and
Khan's originals are English."""

from __future__ import annotations

import copy
import datetime as dt
import json
from pathlib import Path
from typing import Any

import pytest

from jw import draw as draw_module
from jw import lesson
from jw.draw import draw_or_original

BANK = Path(__file__).resolve().parent / "fixtures" / "bank"
TODAY = dt.date(2026, 10, 28)
ADD, NUMBER_LINE = "set_khan_fx0001", "set_khan_fx0002"


def _pages(ready: dict[str, dict[str, list[str]]]) -> dict[str, dict[str, Any]]:
    """The fixture pages, each set in `ready` stamped with its lesson-ready ids per language."""
    pages = {
        p.stem: json.loads(p.read_text(encoding="utf-8"))
        for p in (BANK / "sets").glob("*.json")
    }
    for set_id, by_language in ready.items():
        page_items = pages[set_id]["items"]
        page_items["ready_ids"] = by_language
        page_items["count"]["ready"] = {
            lang: len(ids) for lang, ids in by_language.items()
        }
    return pages


def _ids(set_id: str) -> list[str]:
    return list(_pages({})[set_id]["items"]["ids"])


def _pointed(ids: list[str]) -> dict[str, Any]:
    envelope = json.loads((BANK / "envelope.json").read_text(encoding="utf-8"))
    template = envelope["rows"][0]
    rows = []
    for rank, set_id in enumerate(ids, start=1):
        row = copy.deepcopy(template)
        row.update(id=set_id, rank=rank)
        row.pop("skill_ids")
        rows.append(row)
    envelope["rows"] = rows
    return envelope


def test_asking_pl_for_a_set_ready_only_in_en_offers_the_en_original() -> None:
    pages = _pages({NUMBER_LINE: {"en": _ids(NUMBER_LINE)}})
    result = draw_or_original(
        _pointed([NUMBER_LINE]), pages, kind="practice", today=TODAY, language="pl"
    )
    assert (result.language, result.fallback_from) == ("en", "pl")
    assert result.draw.questions
    assert {q.set_id for q in result.draw.questions} == {NUMBER_LINE}


def test_asking_en_for_an_en_original_set_draws_directly() -> None:
    pages = _pages({NUMBER_LINE: {"en": _ids(NUMBER_LINE)}})
    result = draw_or_original(
        _pointed([NUMBER_LINE]), pages, kind="practice", today=TODAY, language="en"
    )
    assert (result.language, result.fallback_from) == ("en", None)
    assert result.draw.questions


def test_a_lesson_that_plays_in_the_asked_language_is_never_mixed_with_the_original() -> (
    None
):
    # One set is ready in pl, the other only in en: the lesson is pl, from the pl set alone.
    pages = _pages({ADD: {"pl": _ids(ADD)}, NUMBER_LINE: {"en": _ids(NUMBER_LINE)}})
    result = draw_or_original(
        _pointed([ADD, NUMBER_LINE]), pages, kind="practice", today=TODAY, language="pl"
    )
    assert (result.language, result.fallback_from) == ("pl", None)
    assert {q.set_id for q in result.draw.questions} == {ADD}
    assert (NUMBER_LINE, "no item is lesson-ready in pl") in [
        (x.id, x.reason) for x in result.draw.left_out
    ]


def test_nothing_in_either_language_stays_the_asked_languages_empty_draw() -> None:
    pages = _pages({NUMBER_LINE: {"pl": [], "en": []}})
    result = draw_or_original(
        _pointed([NUMBER_LINE]), pages, kind="practice", today=TODAY, language="pl"
    )
    assert (result.language, result.fallback_from, result.draw.questions) == (
        "pl",
        None,
        [],
    )


def test_a_source_whose_original_is_not_known_is_not_offered(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(draw_module, "ORIGINAL_LANGUAGE", {})
    pages = _pages({NUMBER_LINE: {"en": _ids(NUMBER_LINE)}})
    result = draw_or_original(
        _pointed([NUMBER_LINE]), pages, kind="practice", today=TODAY, language="pl"
    )
    assert (result.language, result.fallback_from, result.draw.questions) == (
        "pl",
        None,
        [],
    )


def test_the_draft_loads_every_item_in_the_language_the_draw_took(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    asked_in: list[str] = []

    def load_item(item_id: str, language: str) -> dict[str, Any]:
        asked_in.append(language)
        return {"id": item_id}

    monkeypatch.setattr(lesson.items, "load_item", load_item)
    pages = _pages({NUMBER_LINE: {"en": _ids(NUMBER_LINE)}})
    drawn, loaded, refused = lesson._draw_loading(
        _pointed([NUMBER_LINE]),
        pages,
        kind="practice",
        language="pl",
        count=None,
        today=TODAY,
    )
    assert (drawn.language, drawn.fallback_from, refused) == ("en", "pl", {})
    assert loaded and set(asked_in) == {"en"}
    assert "offered in en" in lesson._fallback_reason("pl", "en")
