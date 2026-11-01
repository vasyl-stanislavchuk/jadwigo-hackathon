"""The review checklists and the reviewer workflow (dl-r772.34). Runs with `pytest -q`, no model.

    cd apps/cli && uv run --frozen pytest -q evals/review/test_review_workflow.py

Three parts:

1. The checklists, `workflows/_lang/{pl,en}/checklist.md`: every item cites its source, the Polish
   one names the 2026 spelling reform with its PWN pages (dl-r772.16), the English one is US
   English (decision draft dl-rok6).
2. The reviewer, `workflows/jadwigo-lesson-review/SKILL.md`, loads the language's checklist,
   style and glossary, and each of them exists for both languages.
3. The first sample batch per language, `fixtures/batch-{pl,en}.json`, and the verdicts a
   separate reviewer session gave it, `fixtures/verdicts-{pl,en}.json`: every planted line is
   flagged with the item it breaks, a line written to the old Polish spelling rules among them,
   and `_lang/<lang>/examples/` holds only lines that passed.

Whether a reviewer still flags them needs a model: give a fresh session the workflow and the
batch without its `planted` keys, and compare its answer with the recorded verdicts.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import pytest

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
WORKFLOWS = REPO / "workflows"
SKILL = WORKFLOWS / "jadwigo-lesson-review" / "SKILL.md"
LANGUAGES = ("pl", "en")
PARTS = ("checklist.md", "style.md", "glossary.md")
REFORM = "https://sjp.pwn.pl/zasady/zasady-podlegajace-zmianom-w-zwiazku-z-reforma-ortografii-2026;9395528.html"
OLD_RULE_LINES = ("old.participle", "old.by", "old.comparative", "old.inhabitants")


def _text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _items(language: str) -> dict[str, str]:
    """The checklist's items by id, each the text up to the next item or heading."""
    text = _text(WORKFLOWS / "_lang" / language / "checklist.md")
    body = text.split("## Items", 1)[1].split("\n## ", 1)[0]
    found = re.split(rf"\n(?=\*\*{language}-\d+ )", "\n" + body)
    return {
        m[1]: chunk
        for chunk in found
        if (m := re.match(rf"\*\*({language}-\d+) ", chunk.strip())) is not None
    }


def _json(path: Path) -> Any:
    return json.loads(_text(path))


# ---------------------------------------------------------------- the checklists ---


@pytest.mark.parametrize("language", LANGUAGES)
def test_every_checklist_item_cites_its_source(language: str) -> None:
    items = _items(language)
    assert len(items) >= 10, sorted(items)
    for item, text in items.items():
        assert "Category:" in text, item
        source = text.split("Source:", 1)
        assert len(source) == 2, f"{item} cites no source"
        # "the decision above" is the Polish checklist decision, which each checklist cites first.
        cited = r"https://|decisions/|`dl-|`workflows/|`AGENTS.md`|the (Polish )?decision above"
        assert re.search(cited, source[1]) or "https://" in text, item
    head = _text(WORKFLOWS / "_lang" / language / "checklist.md").split("## Items", 1)[
        0
    ]
    assert (
        "2026-10-04-polish-lines-are-reviewed-by-an-ai-skill-against-a-cited-checkli"
        in head
    )


def test_the_polish_checklist_carries_the_2026_spelling_reform() -> None:
    rule = _items("pl")["pl-9"]
    assert "1 January 2026" in rule and REFORM in rule
    for word in ("niepoliczone", "czy by", "żeby", "Warszawianin", "niemilszy"):
        assert word in rule, word
    for pwn in ("170-46-2", "167-45-3", "67-18-8"):
        assert pwn in rule, pwn


def test_the_polish_checklist_carries_the_decisions_six_criteria() -> None:
    text = _text(WORKFLOWS / "_lang" / "pl" / "checklist.md")
    assert (
        "2026-10-04-polish-lines-are-reviewed-by-an-ai-skill-against-a-cited-checkli"
        in text
    )
    for criterion in (
        "a nine-year-old's register",
        "grammar and case",
        "the profile's grammatical form or neutral",
        "no pressure words (score, time, failure)",
        "warm, not gushing",
        "question text spoken exactly as written",
    ):
        assert criterion in text, criterion


def test_the_english_checklist_is_us_english_and_the_ai_reviewers() -> None:
    text = _text(WORKFLOWS / "_lang" / "en" / "checklist.md")
    assert (
        "2026-11-01-english-text-is-checked-by-the-ai-reviewer-only-with-an-english"
        in text
    )
    rule = _items("en")["en-2"]
    assert "US English" in rule and "dl-rok6" in rule
    for us, uk in (("color", "colour"), ("practice", "practise"), ("math", "maths")):
        assert f"`{us}`" in rule and f"`{uk}`" in rule


# ---------------------------------------------------------------- the reviewer -----


def test_the_reviewer_names_itself_and_loads_the_languages_parts() -> None:
    text = _text(SKILL)
    head = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    assert (
        head
        and "name: jadwigo-lesson-review\n" in head[1]
        and "description:" in head[1]
    )
    assert "workflows/_lang/<language>/" in text
    for part in PARTS:
        assert f"`{part}`" in text, part
    for language in LANGUAGES:
        for part in PARTS:
            assert (WORKFLOWS / "_lang" / language / part).is_file(), (
                f"{language}/{part}"
            )
    assert "the writer never reviews its own lines" in text


# ---------------------------------------------------------------- the sample batch -


def _batch(language: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    batch = _json(HERE / "fixtures" / f"batch-{language}.json")
    verdicts = _json(HERE / "fixtures" / f"verdicts-{language}.json")
    assert batch["language"] == verdicts["language"] == language
    return batch["lines"], verdicts["verdicts"]


@pytest.mark.parametrize("language", LANGUAGES)
def test_the_reviewer_answered_every_line_of_the_batch_in_order(language: str) -> None:
    lines, verdicts = _batch(language)
    ids = [line["id"] for line in lines]
    answered = list(dict.fromkeys(v["id"] for v in verdicts))
    assert answered == ids
    items = _items(language)
    for v in verdicts:
        assert v["verdict"] in ("pass", "flag"), v
        if v["verdict"] == "flag":
            assert v["item"] in items and v["quote"] and v["reason"], v
            text = next(line for line in lines if line["id"] == v["id"])
            assert v["quote"] in text["text"] + " " + text.get("say", ""), v


@pytest.mark.parametrize("language", LANGUAGES)
def test_the_reviewer_flags_every_planted_line_with_its_item(language: str) -> None:
    lines, verdicts = _batch(language)
    planted = {line["id"]: line["planted"] for line in lines if "planted" in line}
    assert len(planted) >= 10
    flagged = {(v["id"], v.get("item")) for v in verdicts if v["verdict"] == "flag"}
    missed = [
        (id_, item) for id_, item in planted.items() if (id_, item) not in flagged
    ]
    assert missed == []


def test_the_reviewer_flags_a_line_written_to_the_old_polish_rules() -> None:
    lines, verdicts = _batch("pl")
    for id_ in OLD_RULE_LINES:
        assert next(line for line in lines if line["id"] == id_)["planted"] == "pl-9"
        assert any(v["id"] == id_ and v.get("item") == "pl-9" for v in verdicts), id_


@pytest.mark.parametrize("language", LANGUAGES)
def test_the_examples_hold_only_lines_that_passed(language: str) -> None:
    lines, verdicts = _batch(language)
    flagged = {v["id"] for v in verdicts if v["verdict"] == "flag"}
    passed = {line["text"] for line in lines if line["id"] not in flagged}
    passed |= {
        line["say"] for line in lines if line["id"] not in flagged and "say" in line
    }
    examples = sorted((WORKFLOWS / "_lang" / language / "examples").glob("*.md"))
    assert examples, f"{language} has no reviewed examples"
    shown = [
        m[1] for path in examples for m in re.finditer(r"^- `(.+)`$", _text(path), re.M)
    ]
    assert shown and set(shown) <= passed, set(shown) - passed
