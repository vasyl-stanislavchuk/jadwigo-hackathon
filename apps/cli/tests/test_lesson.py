"""dl-e8ov.5.38.4: lesson_draft and lesson_check, the card, and the compose eval on fixtures.

The request "6 zadań z mnożenia, klasa 3" goes to a fake bank that answers with
tests/fixtures/lesson/envelope.json: one row on the fixture page set_khan_fx0003 (Mnożenie przez 6)
and one row with no page. The items are tests/fixtures/lesson/converted.json, our own small bank
written for these tests (no Khan text), one of them waiting. The rungs a composing agent would
write are tests/fixtures/lesson/rungs.json, Polish fixture text written by hand. `check` runs on a
stub in the unit tests and on the real check.ts in the one test marked for bun.
"""

from __future__ import annotations

import copy
import datetime as dt
import json
import re
import shutil
import sys
from collections.abc import Iterator
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import anyio
import fake_bank
import pytest
from click.testing import CliRunner
from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client

from jw import lesson, settings_keys
from jw.cli import main as cli
from jw.commands.mcp import TOOLS
from jw.errors import JwError
from jw.settings_keys import (
    JADWIGO_BANK_DIR,
    JADWIGO_REPO_DIR,
    JW_API_URL,
    JW_BANK_ENV_FILE,
    JW_KHAN_CONVERTED,
)

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
BANK_DIR = ROOT / "tests" / "fixtures" / "bank"
LESSON = ROOT / "tests" / "fixtures" / "lesson"
ITEMS_FILE = LESSON / "converted.json"
JW = Path(sys.executable).with_name("jw")
REQUEST = "6 zadań z mnożenia, klasa 3"
TODAY = dt.date(2026, 10, 29)
STEP_KEYS = {"id", "question_type", "skill_ids", "based_on", "say", "question", "credit"}


class LessonBank(fake_bank.FakeBank):
    """The fake bank, answering with the lesson fixture's envelope."""

    def answer(self, need: Any, query: dict[str, str]) -> dict[str, Any]:
        envelope: dict[str, Any] = json.loads(
            (LESSON / "envelope.json").read_text(encoding="utf-8")
        )
        envelope["need"] = need
        return envelope


@pytest.fixture
def bank(monkeypatch: pytest.MonkeyPatch) -> Iterator[LessonBank]:
    fake = LessonBank().start()
    monkeypatch.setenv(JW_API_URL, fake.url)
    monkeypatch.setenv(JADWIGO_BANK_DIR, str(BANK_DIR))
    monkeypatch.setenv(JW_KHAN_CONVERTED, str(ITEMS_FILE))
    yield fake
    fake.stop()


def _rungs() -> dict[str, Any]:
    rungs: dict[str, Any] = json.loads((LESSON / "rungs.json").read_text(encoding="utf-8"))
    return rungs["rungs"]


def _filled(draft: dict[str, Any]) -> dict[str, Any]:
    """The draft with every question's help written, as a composing agent would."""
    filled = copy.deepcopy(draft)
    rungs = _rungs()
    for q in filled["questions"]:
        q["help"] = copy.deepcopy(rungs[q["item_id"]])
    return filled


def _stub(answer: dict[str, Any], seen: list[Any]) -> Any:
    def run(argv: list[str]) -> Any:
        seen.append((argv, json.loads(Path(argv[2]).read_text(encoding="utf-8"))))
        return SimpleNamespace(returncode=0 if answer["ok"] else 1, stdout=json.dumps(answer),
                               stderr="")

    return run


OK = {
    "ok": True,
    "errors": [],
    "play_path": "/play/asg_fixture",
    "lesson_id": "les_fixture",
    "questions": 6,
}


# ---------------------------------------------------------------- draft ------


def test_draft_draws_6_questions_with_credit_and_empty_help(bank: LessonBank) -> None:
    draft = lesson.draft(REQUEST, "3", today=TODAY)

    assert bank.requests[-1].body["words"] == REQUEST
    assert draft["need"] == {"language": "pl", "grade": "3", "words": REQUEST}
    assert draft["rule_settled"] is False
    assert draft["rule"]["count"] == 6
    questions = draft["questions"]
    assert len(questions) == 6
    assert [q["step_id"] for q in questions] == [f"q{n}" for n in range(1, 7)]
    assert "fxc201" not in {q["item_id"] for q in questions}
    for q in questions:
        assert q["credit"]["source"] and q["credit"]["licence"]
        assert q["based_on"] == {"question": f"khan:{q['item_id']}", "changes": []}
        assert q["why_drawn"].startswith("unseen")
        assert q["help"] == {"look": None, "boost": None, "boost_by_mistake": {}, "almost": None,
                             "worked": None, "twin": None}
        assert q["question"]["key"]["accept"]
        assert q["material"]["hints"] and q["material"]["worked"]
        assert set(q["question"]) == {"family", "data", "key"}
    # Varied: the draw took turns across the set's problem types.
    assert len({q["item_id"][:4] for q in questions}) == 3

    left = {item["id"]: item["reason"] for item in draft["left_out"]}
    assert "waits for its family step" in left["fxc201"]
    assert "no page" in left["set_khan_xj1k2l3"]
    assert all(left.values())

    skeleton = draft["lesson_file_skeleton"]
    assert skeleton["id"] == "6-zadan-z-mnozenia-klasa-3-2026-10-29"
    assert (skeleton["title"], skeleton["language"], skeleton["kind"]) == (REQUEST, "pl", "practice")
    assert (skeleton["category"], skeleton["subject"]) == ("child", "math")
    assert REQUEST in skeleton["reasoning"] and "set_khan_fx0003" in skeleton["reasoning"]
    assert [s["id"] for s in skeleton["script"]["parts"][0]["steps"]] == [
        q["step_id"] for q in questions
    ]


def test_the_proposed_mark_is_stripped_from_skill_ids(bank: LessonBank) -> None:
    draft = lesson.draft(REQUEST, "3", count=1, today=TODAY)
    (q,) = draft["questions"]
    assert q["skill"] == "proposed:fixture.times-6"  # the draw's skill, as the bank wrote it
    assert q["skill_ids"] == ["fixture.times-6"] and "skill_note" not in q
    step = draft["lesson_file_skeleton"]["script"]["parts"][0]["steps"][0]
    assert step["skill_ids"] == ["fixture.times-6"]


def test_a_skill_that_is_no_skill_id_is_left_out_with_a_note() -> None:
    assert lesson._skill_ids("maths.add.within100") == (["maths.add.within100"], None)
    ids, note = lesson._skill_ids("set_khan_fx0003")  # the draw's fallback when a set names none
    assert ids == [] and note is not None and "set_khan_fx0003" in note
    ids, note = lesson._skill_ids("proposed:Not An Id")
    assert ids == [] and note is not None


def test_a_count_overrides_the_rule(bank: LessonBank) -> None:
    draft = lesson.draft(REQUEST, "3", count=3, today=TODAY)
    assert len(draft["questions"]) == 3
    assert draft["rule"]["count"] == 3


def test_the_draft_verb_prints_the_draft(bank: LessonBank) -> None:
    result = CliRunner().invoke(cli, ["lesson", "draft", REQUEST, "--grade", "3", "--json"])
    assert result.exit_code == 0, result.output
    assert json.loads(result.output) == lesson.draft(REQUEST, "3")


# ---------------------------------------------------------------- check ------


def test_check_turns_a_filled_draft_into_a_lesson_file_and_a_card(
    bank: LessonBank, tmp_path: Path
) -> None:
    filled = _filled(lesson.draft(REQUEST, "3", today=TODAY))
    seen: list[Any] = []
    result = lesson.check(filled, runner=_stub(OK, seen), out_dir=tmp_path)

    assert result["ok"] is True
    (argv, file), = seen
    assert argv[0] == "bun" and argv[1].endswith("packages/lesson-import/src/check.ts")
    assert argv[3] == "--json"
    assert Path(result["lesson_file"]) == tmp_path / "6-zadan-z-mnozenia-klasa-3-2026-10-29.json"
    assert (result["play_path"], result["lesson_id"], result["questions"]) == (
        "/play/asg_fixture", "les_fixture", 6
    )

    # The shape parseLessonFile accepts (packages/lesson-import/src/lesson-file.ts).
    assert set(file) == {"id", "title", "language", "category", "subject", "reasoning", "kind",
                         "script"}
    assert re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", file["id"])
    assert file["category"] in ("child", "adult") and file["subject"] == "math"
    (part,) = file["script"]["parts"]
    assert part["part"] == "practice" and len(part["steps"]) == 6
    for step in part["steps"]:
        assert set(step) == STEP_KEYS
        assert step["skill_ids"] == ["fixture.times-6"]
        assert set(step["question"]) == {"family", "data", "key", "help"}
        help_ = step["question"]["help"]
        assert set(help_) == {"hints", "look", "boost", "boost_by_mistake", "almost", "worked",
                              "twin"}
        assert set(help_["look"]) == {"text"} and set(help_["boost"]) == {"text"}
        assert all(isinstance(line, str) for line in help_["worked"] + help_["almost"])
        assert help_["almost"][-1].endswith("= ") and help_["almost"][:-1] == help_["worked"][:-1]
        assert {"say", "family", "data", "key"} <= set(help_["twin"])
        assert step["credit"]["licence"]

    card = result["card"]
    assert len(card["questions"]) == 6
    first = card["questions"][0]
    assert set(first) == {"n", "step_id", "skill", "prompt", "key", "rungs", "twin", "source",
                          "licence", "why_drawn"}
    assert first["skill"] == "fixture.times-6 (proposed)"
    assert first["n"] == 1 and first["prompt"].startswith(filled["questions"][0]["say"])
    item = filled["questions"][0]["item_id"]
    assert first["source"] == f"bank {item} https://fixture.invalid/jw/items/{item}"
    assert all(q["licence"] and q["why_drawn"] for q in card["questions"])
    assert all(q["rungs"]["look"] and q["twin"]["key"] for q in card["questions"])
    assert {item["id"] for item in card["left_out"]} >= {"fxc201", "set_khan_xj1k2l3"}

    text = lesson.card_text(card)
    assert text.startswith("1. ") and "left out:" in text and "fxc201" in text
    assert "skill: fixture.times-6 (proposed)" in text


def test_check_accepts_bare_strings_for_rungs(bank: LessonBank, tmp_path: Path) -> None:
    filled = _filled(lesson.draft(REQUEST, "3", count=1, today=TODAY))
    help_ = filled["questions"][0]["help"]
    help_["look"] = help_["look"]["text"]
    help_["worked"] = "\n".join(help_["worked"])
    twin = help_["twin"]
    help_["twin"] = {"say": twin["say"], "question": {k: twin[k] for k in ("data", "key")}}
    seen: list[Any] = []
    lesson.check(filled, runner=_stub(OK, seen), out_dir=tmp_path)
    step = seen[0][1]["script"]["parts"][0]["steps"][0]
    assert step["question"]["help"]["look"] == {"text": help_["look"]}
    assert step["question"]["help"]["worked"] == help_["worked"].splitlines()
    assert step["question"]["help"]["twin"]["family"] == "enter"
    assert "question" not in step["question"]["help"]["twin"]


def test_an_answer_with_errors_comes_back_by_step_id(bank: LessonBank, tmp_path: Path) -> None:
    filled = _filled(lesson.draft(REQUEST, "3", today=TODAY))
    errors = [{"step_id": "q2", "message": "lesson file x, step q2 help: no field for help.y"}]
    answer = {"ok": False, "errors": errors, "play_path": "/play/asg_x", "lesson_id": "les_x",
              "questions": 0}
    result = lesson.check(filled, runner=_stub(answer, []), out_dir=tmp_path)
    assert result["ok"] is False
    assert result["errors"] == errors
    assert Path(result["lesson_file"]).is_file()


def test_empty_rungs_are_errors_before_check_ts_runs(bank: LessonBank, tmp_path: Path) -> None:
    filled = _filled(lesson.draft(REQUEST, "3", today=TODAY))
    filled["questions"][1]["help"]["boost"] = None
    filled["questions"][3]["help"]["twin"] = {}
    seen: list[Any] = []
    result = lesson.check(filled, runner=_stub(OK, seen), out_dir=tmp_path)
    assert result["ok"] is False
    assert seen == []
    assert [(e["step_id"], e["message"]) for e in result["errors"]] == [
        ("q2", "help.boost is empty; write it"),
        ("q4", "help.twin is empty; write it"),
    ]


def test_check_ts_that_prints_no_json_is_an_error(bank: LessonBank, tmp_path: Path) -> None:
    filled = _filled(lesson.draft(REQUEST, "3", count=1, today=TODAY))

    def broken(argv: list[str]) -> Any:
        return SimpleNamespace(returncode=1, stdout="", stderr="error: Cannot find module 'zod'")

    with pytest.raises(JwError, match="Cannot find module"):
        lesson.check(filled, runner=broken, out_dir=tmp_path)


def test_the_repo_dir_defaults_to_this_checkout_and_names_its_setting(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    assert settings_keys.repo_dir() == REPO
    monkeypatch.setenv(JADWIGO_REPO_DIR, str(tmp_path))
    assert settings_keys.repo_dir() == tmp_path
    with pytest.raises(JwError) as caught:
        lesson.check_script()
    assert JADWIGO_REPO_DIR in caught.value.hint


# ---------------------------------------------------------------- MCP --------


def test_lesson_draft_over_mcp_returns_the_draft(bank: LessonBank) -> None:
    assert len(TOOLS) == 6 and {"lesson_draft", "lesson_check"} <= set(TOOLS)

    async def call() -> tuple[list[str], Any]:
        params = StdioServerParameters(
            command=str(JW),
            args=["mcp", "serve"],
            env={
                JW_API_URL: bank.url,
                JADWIGO_BANK_DIR: str(BANK_DIR),
                JW_KHAN_CONVERTED: str(ITEMS_FILE),
                JW_BANK_ENV_FILE: str(ROOT / "tests" / "no-bank.env"),
            },
            cwd=str(ROOT),
        )
        async with stdio_client(params) as (read, write), ClientSession(read, write) as session:
            await session.initialize()
            names = sorted(t.name for t in (await session.list_tools()).tools)
            return names, await session.call_tool(
                "lesson_draft", {"request": REQUEST, "grade": "3"}
            )

    names, result = anyio.run(call)
    assert names == sorted(TOOLS)
    assert not result.is_error, result.content
    answer = json.loads("".join(getattr(c, "text", "") for c in result.content))
    assert answer == lesson.draft(REQUEST, "3")


# ---------------------------------------------------------------- the real check.ts --


@pytest.mark.skipif(shutil.which("bun") is None, reason="bun is not on PATH")
def test_the_real_check_ts_accepts_the_filled_fixture_draft(
    bank: LessonBank, tmp_path: Path
) -> None:
    filled = _filled(lesson.draft(REQUEST, "3", today=TODAY))
    result = lesson.check(filled, out_dir=tmp_path)
    assert result["ok"] is True, result
    assert result["play_path"].startswith("/play/")
    assert result["lesson_id"].startswith("les_")
    assert result["questions"] == 6
    assert all(q["source"] and q["licence"] for q in result["card"]["questions"])


@pytest.mark.skipif(shutil.which("bun") is None, reason="bun is not on PATH")
def test_the_real_check_ts_names_the_step_it_refuses(bank: LessonBank, tmp_path: Path) -> None:
    filled = _filled(lesson.draft(REQUEST, "3", today=TODAY))
    filled["questions"][2]["question_type"] = "recognition"  # a choose type on an enter step
    result = lesson.check(filled, out_dir=tmp_path)
    assert result["ok"] is False
    assert [e["step_id"] for e in result["errors"]] == ["q3"]
