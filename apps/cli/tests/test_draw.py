"""dl-e8ov.5.2.17: the draw on the fixture envelope and 3 set pages copied from the bank.

The fixture envelope's rows name made-up set ids, so it is used twice: as it is (rows without a
page are left out, with that reason) and with its rows pointed at the copied pages.
"""

from __future__ import annotations

import copy
import datetime as dt
import itertools
import json
from pathlib import Path
from typing import Any

import pytest

from jw import draw as draw_module
from jw.draw import DRAW_RULES, RULES_SETTLED, DrawRule, History, draw

BANK = Path(__file__).resolve().parent / "fixtures" / "bank"
TODAY = dt.date(2026, 10, 28)
ADD, NUMBER_LINE, TIMES_7 = "set_khan_2002", "set_khan_x94f7921f", "set_khan_x59551e61"


def _pages() -> dict[str, dict[str, Any]]:
    return {
        p.stem: json.loads(p.read_text(encoding="utf-8")) for p in (BANK / "sets").glob("*.json")
    }


def _envelope() -> dict[str, Any]:
    return json.loads((BANK / "envelope.json").read_text(encoding="utf-8"))


def _pointed(ids: list[str]) -> dict[str, Any]:
    """The fixture envelope with its rows pointed at copied pages, in this rank order."""
    envelope = _envelope()
    template = envelope["rows"][0]
    rows = []
    for rank, set_id in enumerate(ids, start=1):
        row = copy.deepcopy(template)
        row.update(id=set_id, rank=rank)
        row.pop("skill_ids")
        rows.append(row)
    envelope["rows"] = rows
    return envelope


def test_the_table_has_the_four_kinds_and_is_not_settled() -> None:
    assert set(DRAW_RULES) == {"practice", "review", "check", "diagnostic"}
    assert RULES_SETTLED is False
    assert all(rule.source for rule in DRAW_RULES.values())
    result = draw(_pointed([ADD]), _pages(), kind="practice", today=TODAY)
    assert result.rule_settled is False
    assert result.rule == {**DRAW_RULES["practice"].__dict__}


def test_rows_without_a_page_are_left_out_with_the_reason() -> None:
    result = draw(_envelope(), {}, kind="practice", today=TODAY)
    assert result.questions == []
    assert {left.id for left in result.left_out} == {"set_khan_xd4e5f6", "set_khan_xj1k2l3"}
    assert all("no page" in left.reason for left in result.left_out)


def test_practice_draws_unseen_varied_questions_each_with_a_reason() -> None:
    result = draw(_pointed([NUMBER_LINE, ADD]), _pages(), kind="practice", today=TODAY)
    questions = result.questions
    assert len(questions) == DRAW_RULES["practice"].count
    assert all(q.reason.startswith("unseen") for q in questions)
    assert all(q.text for q in questions)  # Polish sample text is on the page
    # Varied: taking turns across the problem types of both sets, never the same type twice running.
    types = [q.problem_type for q in questions]
    assert all(a != b for a, b in itertools.pairwise(types))
    assert {q.set_id for q in questions} == {NUMBER_LINE, ADD}
    assert len(set(types)) >= 4


def test_seen_items_are_not_drawn_and_spacing_says_why() -> None:
    pages = _pages()
    first = draw(_pointed([ADD]), pages, kind="practice", today=TODAY).questions
    seen = {first[0].item_id: TODAY, first[1].item_id: TODAY - dt.timedelta(days=10)}
    again = draw(_pointed([ADD]), pages, kind="practice", today=TODAY, history=History(seen=seen))
    drawn = {q.item_id for q in again.questions}
    assert not drawn & set(seen)
    reasons = {left.id: left.reason for left in again.left_out}
    assert "spacing" in reasons[first[0].item_id]
    assert "already seen" in reasons[first[1].item_id]


def test_a_set_without_the_lesson_language_does_not_play() -> None:
    pages = _pages()
    pages[ADD] = {**pages[ADD], "languages": {"pl": False, "en": True}}
    result = draw(_pointed([ADD, TIMES_7]), pages, kind="practice", today=TODAY, language="pl")
    assert all(q.set_id == TIMES_7 for q in result.questions)
    assert any(left.id == ADD and "no pl version" in left.reason for left in result.left_out)


def test_flagged_media_keeps_a_question_out() -> None:
    pages = _pages()
    item = pages[TIMES_7]["problem_types"][0]["samples"][0]["item_id"]
    result = draw(_pointed([TIMES_7]), pages, kind="practice", today=TODAY, flagged=[item])
    assert item not in {q.item_id for q in result.questions}
    assert any(left.id == item and "flagged" in left.reason for left in result.left_out)


def test_check_takes_one_per_skill() -> None:
    result = draw(_pointed([ADD, NUMBER_LINE, TIMES_7]), _pages(), kind="check", today=TODAY)
    skills = [q.skill for q in result.questions]
    assert len(skills) == 3 and len(set(skills)) == 3


def test_diagnostic_takes_two_per_skill_easy_first() -> None:
    pages = _pages()
    result = draw(_pointed([ADD, NUMBER_LINE, TIMES_7]), pages, kind="diagnostic", today=TODAY)
    per_skill: dict[str, int] = {}
    for q in result.questions:
        per_skill[q.skill] = per_skill.get(q.skill, 0) + 1
    assert set(per_skill.values()) == {2}
    orders = [pages[q.set_id]["source_place"].get("order", 0) for q in result.questions]
    assert orders == sorted(orders)


def test_review_draws_due_items_and_twins_for_due_items_that_do_not_play() -> None:
    pages = _pages()
    arrays = pages[TIMES_7]["problem_types"][0]
    due_plays, due_flagged = arrays["samples"][0]["item_id"], arrays["samples"][1]["item_id"]
    history = History(
        seen={due_plays: TODAY - dt.timedelta(days=7), due_flagged: TODAY - dt.timedelta(days=7)},
        due={due_plays: TODAY, due_flagged: TODAY - dt.timedelta(days=1)},
    )
    result = draw(
        _pointed([TIMES_7]),
        pages,
        kind="review",
        today=TODAY,
        history=history,
        flagged=[due_flagged],
    )
    by_item = {q.item_id: q for q in result.questions}
    assert due_plays in by_item and by_item[due_plays].reason.startswith("due by FSRS")
    twins = [q for q in result.questions if q.reason.startswith(f"twin of {due_flagged}")]
    assert len(twins) == 1 and twins[0].problem_type == arrays["name"]


def test_review_with_nothing_due_draws_nothing_and_says_so() -> None:
    result = draw(_pointed([TIMES_7]), _pages(), kind="review", today=TODAY)
    assert result.questions == []
    assert any("nothing in these sets is due" in left.reason for left in result.left_out)


def test_the_owner_edits_the_table_and_the_draw_follows() -> None:
    rules = {**DRAW_RULES, "practice": DrawRule(**{**DRAW_RULES["practice"].__dict__, "count": 2})}
    result = draw(_pointed([ADD]), _pages(), kind="practice", today=TODAY, rules=rules)
    assert len(result.questions) == 2


def test_an_unknown_kind_is_refused() -> None:
    with pytest.raises(ValueError, match="unknown lesson kind"):
        draw(_envelope(), {}, kind="exam", today=TODAY)


def test_the_module_docstring_says_the_table_is_the_owners() -> None:
    assert "owner's to settle" in (draw_module.__doc__ or "")
