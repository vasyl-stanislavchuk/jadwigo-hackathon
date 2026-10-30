"""dl-e8ov.5.2.17: the draw on the fixture envelope and 3 made-up set pages in the bank's shape.

The fixture envelope's rows name set ids with no page, so it is used twice: as it is (rows without
a page are left out, with that reason) and with its rows pointed at the fixture pages. The pages
are invented, because no bank data enters this repo; they are Khan-shaped because the pinned set
schema takes only Khan pages.
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
ADD, NUMBER_LINE, TIMES_6 = "set_khan_fx0001", "set_khan_fx0002", "set_khan_fx0003"


def _pages() -> dict[str, dict[str, Any]]:
    return {
        p.stem: json.loads(p.read_text(encoding="utf-8")) for p in (BANK / "sets").glob("*.json")
    }


def _envelope() -> dict[str, Any]:
    return json.loads((BANK / "envelope.json").read_text(encoding="utf-8"))


def _pointed(ids: list[str]) -> dict[str, Any]:
    """The fixture envelope with its rows pointed at the fixture pages, in this rank order."""
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
    result = draw(_pointed([ADD, TIMES_6]), pages, kind="practice", today=TODAY, language="pl")
    assert all(q.set_id == TIMES_6 for q in result.questions)
    assert any(left.id == ADD and "no pl version" in left.reason for left in result.left_out)


def test_flagged_media_keeps_a_question_out() -> None:
    pages = _pages()
    item = pages[TIMES_6]["problem_types"][0]["samples"][0]["item_id"]
    result = draw(_pointed([TIMES_6]), pages, kind="practice", today=TODAY, flagged=[item])
    assert item not in {q.item_id for q in result.questions}
    assert any(left.id == item and "flagged" in left.reason for left in result.left_out)


def test_check_takes_one_per_skill() -> None:
    result = draw(_pointed([ADD, NUMBER_LINE, TIMES_6]), _pages(), kind="check", today=TODAY)
    skills = [q.skill for q in result.questions]
    assert len(skills) == 3 and len(set(skills)) == 3


def test_diagnostic_takes_two_per_skill_easy_first() -> None:
    pages = _pages()
    result = draw(_pointed([ADD, NUMBER_LINE, TIMES_6]), pages, kind="diagnostic", today=TODAY)
    per_skill: dict[str, int] = {}
    for q in result.questions:
        per_skill[q.skill] = per_skill.get(q.skill, 0) + 1
    assert set(per_skill.values()) == {2}
    orders = [pages[q.set_id]["source_place"].get("order", 0) for q in result.questions]
    assert orders == sorted(orders)


def test_review_draws_due_items_and_twins_for_due_items_that_do_not_play() -> None:
    pages = _pages()
    arrays = pages[TIMES_6]["problem_types"][0]
    due_plays, due_flagged = arrays["samples"][0]["item_id"], arrays["samples"][1]["item_id"]
    history = History(
        seen={due_plays: TODAY - dt.timedelta(days=7), due_flagged: TODAY - dt.timedelta(days=7)},
        due={due_plays: TODAY, due_flagged: TODAY - dt.timedelta(days=1)},
    )
    result = draw(
        _pointed([TIMES_6]),
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
    result = draw(_pointed([TIMES_6]), _pages(), kind="review", today=TODAY)
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


def _two_rows(pages: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """The times-6 page made a set of 2 skills, as a real `Mnożenie przez 3 i 6` set is: rows of
    3 and hops of 6 by their names, and bags named by neither."""
    page = copy.deepcopy(pages[TIMES_6])
    page["enrichment"]["skill_ids"]["value"] = ["fixture.row-3", "fixture.row-6"]
    names = ["Mult by 3, first factor", "Bags of apples", "Mult by 6, second factor"]
    for ptype, name in zip(page["problem_types"], names, strict=True):
        ptype["name"] = name
    return {**pages, TIMES_6: page}


def test_a_set_of_several_skills_tags_each_problem_type_by_its_own() -> None:
    # dl-n9fr.55: every item of such a set read the first skill, row-3, a 6·6 one too.
    result = draw(_pointed([TIMES_6]), _two_rows(_pages()), kind="practice", today=TODAY)
    by_type = {q.problem_type: (q.skill, q.skills) for q in result.questions}
    assert by_type["Mult by 3, first factor"] == ("fixture.row-3", ("fixture.row-3",))
    assert by_type["Mult by 6, second factor"] == ("fixture.row-6", ("fixture.row-6",))
    # A name that names no one skill carries them all, never only the first.
    assert by_type["Bags of apples"] == (
        "fixture.row-3, fixture.row-6", ("fixture.row-3", "fixture.row-6")
    )


def test_a_problem_types_own_skill_ids_win() -> None:
    pages = _two_rows(_pages())
    pages[TIMES_6]["problem_types"][1]["skill_ids"] = ["fixture.row-6"]
    result = draw(_pointed([TIMES_6]), pages, kind="practice", today=TODAY)
    assert {q.skill for q in result.questions if q.problem_type == "Bags of apples"} == {
        "fixture.row-6"
    }


def test_a_number_two_skills_carry_names_neither() -> None:
    assert draw_module._type_skills(["m.row-6", "m.times-6"], {"name": "Mult by 6"}) == (
        "m.row-6", "m.times-6"
    )
    assert draw_module._type_skills(["m.row-3"], None) == ("m.row-3",)


# --------------------------- dl-a38n.32.10: the draw takes the page's ready ids ----


def _stamped(ready: list[str], language: str = "pl") -> dict[str, dict[str, Any]]:
    """The fixture pages, the number-line set stamped with `ready` as its lesson-ready ids."""
    pages = _pages()
    page_items = pages[NUMBER_LINE]["items"]
    page_items["ready_ids"] = {language: ready}
    page_items["count"]["ready"] = {language: len(ready)}
    return pages


def test_a_stamped_page_draws_only_its_ready_ids() -> None:
    pages = _pages()
    ids = pages[NUMBER_LINE]["items"]["ids"]
    ready = ids[::2]

    result = draw(_pointed([NUMBER_LINE]), _stamped(ready), kind="practice", today=TODAY)

    assert result.questions
    assert {q.item_id for q in result.questions} <= set(ready)
    held = {left.id: left.reason for left in result.left_out}
    assert set(held) == set(ids) - set(ready)
    assert set(held.values()) == {draw_module.NOT_READY_ITEM}


def test_a_page_built_before_the_stamp_falls_back_to_its_ids() -> None:
    pages = _pages()
    assert "ready_ids" not in pages[NUMBER_LINE]["items"]

    result = draw(_pointed([NUMBER_LINE]), pages, kind="practice", today=TODAY)

    assert len(result.questions) == DRAW_RULES["practice"].count
    assert draw_module.ready_ids(pages[NUMBER_LINE], "pl") is None
    assert not any(left.reason == draw_module.NOT_READY_ITEM for left in result.left_out)


@pytest.mark.parametrize("language", ["pl", "en"])
def test_a_set_with_none_ready_in_the_lessons_language_is_left_out(language: str) -> None:
    # Ready in the other language only: nothing here plays as a lesson in this one.
    other = "en" if language == "pl" else "pl"
    pages = _stamped(_pages()[NUMBER_LINE]["items"]["ids"], other)

    result = draw(
        _pointed([NUMBER_LINE]), pages, kind="practice", today=TODAY, language=language
    )

    assert result.questions == []
    assert [(left.id, left.reason) for left in result.left_out] == [
        (NUMBER_LINE, f"no item is lesson-ready in {language}")
    ]


def test_count_ready_zero_leaves_the_set_out_even_without_ids() -> None:
    pages = _pages()
    pages[NUMBER_LINE]["items"]["count"]["ready"] = {"pl": 0, "en": 3}

    result = draw(_pointed([NUMBER_LINE, ADD]), pages, kind="practice", today=TODAY)

    assert (NUMBER_LINE, "no item is lesson-ready in pl") in [
        (left.id, left.reason) for left in result.left_out
    ]
    assert {q.set_id for q in result.questions} == {ADD}
