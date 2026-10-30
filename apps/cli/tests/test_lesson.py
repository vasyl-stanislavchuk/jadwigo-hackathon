"""dl-e8ov.5.38.4 and dl-e8ov.5.38.10: lesson_draft copies each question whole and keeps the
draft under a draft_id, lesson_check takes the agent's words by step id, and the card.

The request "6 zadań z mnożenia, klasa 3" goes to a fake bank that answers with
tests/fixtures/lesson/envelope.json: one row on the fixture page set_khan_fx0003 (Mnożenie przez 6)
and one row with no page. The items are tests/fixtures/lesson/converted.json, our own small bank
written for these tests (no Khan text), one of them waiting; each playing item has 2 hints and 1
worked line. The words a composing agent would write are taken from tests/fixtures/lesson/rungs.json,
Polish fixture text written by hand. check.ts runs on a stub in the unit tests and for real in the
tests marked for bun. Drafts and lesson files go to the test's tmp_path.
"""

from __future__ import annotations

import copy
import datetime as dt
import json
import re
import shutil
from collections.abc import Iterator
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import fake_bank
import pytest
from click.testing import CliRunner

from jw import lesson, pii, settings_keys
from jw.cli import main as cli
from jw.errors import JwError
from jw.settings_keys import (
    JADWIGO_BANK_DIR,
    JADWIGO_REPO_DIR,
    JW_API_URL,
    JW_KHAN_CONVERTED,
)

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
BANK_DIR = ROOT / "tests" / "fixtures" / "bank"
LESSON = ROOT / "tests" / "fixtures" / "lesson"
ITEMS_FILE = LESSON / "converted.json"
REQUEST = "6 zadań z mnożenia, klasa 3"
TOPIC = "mnożenie"  # what the calling agent distils from REQUEST (dl-e8ov.5.38.12)
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




CLASSES = ["added_instead", "off_by_small"]
OK = {
    "ok": True,
    "errors": [],
    "play_path": "/play/asg_fixture",
    "lesson_id": "les_fixture",
    "questions": 6,
    "mistake_classes": {f"q{n}": CLASSES for n in range(1, 7)},
}


class CheckTs:
    """check.ts stubbed: each lesson file it was given, and the answer it gives."""

    def __init__(self) -> None:
        self.seen: list[tuple[list[str], dict[str, Any]]] = []
        self.answer: dict[str, Any] = copy.deepcopy(OK)

    def run(self, argv: list[str]) -> Any:
        self.seen.append((argv, json.loads(Path(argv[2]).read_text(encoding="utf-8"))))
        return SimpleNamespace(
            returncode=0 if self.answer["ok"] else 1, stdout=json.dumps(self.answer), stderr=""
        )


@pytest.fixture(autouse=True)
def _folders(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(lesson, "drafts_dir", lambda: tmp_path / "drafts")
    monkeypatch.setattr(lesson, "_out_dir", lambda: tmp_path / "lessons")


@pytest.fixture
def check_ts(monkeypatch: pytest.MonkeyPatch) -> CheckTs:
    stub = CheckTs()
    monkeypatch.setattr(lesson.shutil, "which", lambda _name: "bun")
    monkeypatch.setattr(lesson, "_run", lambda _repo: stub.run)
    return stub


def _draft(**kwargs: Any) -> dict[str, Any]:
    return lesson.draft(REQUEST, "3", names=[], topic=TOPIC, today=TODAY, **kwargs)


def _stored(view: dict[str, Any]) -> dict[str, Any]:
    return lesson.load_draft(view["draft_id"])


def _undated(view: dict[str, Any]) -> dict[str, Any]:
    """A view made in another call without what differs between calls: its draft id and file."""
    return {k: v for k, v in view.items() if k not in ("draft_id", "draft_file")}


def _words(view: dict[str, Any]) -> dict[str, Any]:
    """What a composing agent writes for each step: what its you_write lists, from rungs.json."""
    rungs: dict[str, Any] = json.loads((LESSON / "rungs.json").read_text(encoding="utf-8"))
    return {
        q["step_id"]: {k: copy.deepcopy(rungs["rungs"][q["item_id"]][k]) for k in q["you_write"]}
        for q in view["questions"]
    }


def _rule(a: int, b: int) -> dict[str, Any]:
    return {"rule": "times_table", "a": a, "b": b, "recent": []}


def _rule_change(rule: dict[str, Any]) -> dict[str, Any]:
    return {
        "change": "tutor_notes",
        "why": f"jw added the multiplication rule ({rule['a']} × {rule['b']}) to the key by code, "
        "so a miss names its mistake class",
        "reviewed": False,
    }


def _converted(item_id: str) -> dict[str, Any]:
    raw = json.loads(ITEMS_FILE.read_text(encoding="utf-8"))
    return next(i for i in raw["items"] if i["id"] == item_id)


# ---------------------------------------------------------------- draft ------


def test_draft_copies_6_questions_whole_and_keeps_them_by_draft_id(
    bank: LessonBank, check_ts: CheckTs
) -> None:
    view = _draft()

    # The bank is asked for the topic; the request is kept as the draft's record.
    assert bank.requests[-1].body["words"] == TOPIC
    assert view["need"] == {"language": "pl", "grade": "3", "words": TOPIC}
    assert view["request"] == REQUEST
    assert re.fullmatch(r"draft_[0-9a-f]{12}", view["draft_id"])
    assert view["rule_settled"] is False and view["rule"]["count"] == 6
    assert (view["title"], view["plays_as_copied"], view["copy_errors"]) == (REQUEST, True, [])
    questions = view["questions"]
    assert [q["step_id"] for q in questions] == [f"q{n}" for n in range(1, 7)]
    assert "fxc201" not in {q["item_id"] for q in questions}
    # Varied: the draw took turns across the set's problem types.
    assert len({q["item_id"][:4] for q in questions}) == 3
    for q in questions:
        source = _converted(q["item_id"])["spec"]
        assert q["say"] == source["say"] and q["data"] == source["data"]
        # The copy's key, with the multiplication rule jw adds to a plainly a×b question.
        a, b = (int(n) for n in source["data"]["figure"]["text"].split(" = ")[0].split(" · "))
        assert q["key"] == {**source["key"], "rule": _rule(a, b)}
        # The worked line differs from the hints' text, so it is shown too.
        assert q["copied_help"] == source["help"]
        assert q["rungs"] == {"look": "hint 1", "boost": None, "almost": None,
                              "worked": "worked lines and hint 2"}
        assert q["you_write"] == ["twin", "boost", "boost_by_mistake"]
        assert q["mistake_classes"] == CLASSES
        assert q["why_drawn"].startswith("unseen")

    left = {item["id"]: item["reason"] for item in view["left_out"]}
    assert "waits for its family step" in left["fxc201"]
    assert "no page" in left["set_khan_xj1k2l3"]

    # The draft kept on this machine holds each question whole, help and credit included.
    stored = _stored(view)
    assert Path(view["draft_file"]) == lesson.drafts_dir() / f"{view['draft_id']}.json"
    assert stored["lesson"]["id"] == "6-zadan-z-mnozenia-klasa-3-2026-10-29"
    assert (stored["lesson"]["category"], stored["lesson"]["subject"]) == ("child", "math")
    assert "set_khan_fx0003" in stored["lesson"]["reasoning"]
    for q in stored["questions"]:
        source = _converted(q["item_id"])["spec"]
        assert {k: q["question"][k] for k in ("family", "data", "help")} == {
            k: source[k] for k in ("family", "data", "help")
        }
        assert q["based_on"]["question"] == f"khan:{q['item_id']}"
        assert q["based_on"]["changes"] == [_rule_change(q["question"]["key"]["rule"])]
        assert q["credit"]["source"] and q["credit"]["licence"]

    # check.ts ran once on the lesson as copied: every step, its copied help, no twin yet.
    ((argv, file),) = check_ts.seen
    assert argv[3] == "--json" and argv[2].endswith(f"{view['draft_id']}.copied.json")
    steps = file["script"]["parts"][0]["steps"]
    assert [s["id"] for s in steps] == [q["step_id"] for q in questions]
    assert all(set(s) == STEP_KEYS and "twin" not in s["question"]["help"] for s in steps)


def test_the_slim_view_leaves_picture_labels_and_duplicate_worked_lines_out() -> None:
    picture = {"src": "/media/a.svg", "alt": "Pięć grup", "width": 3, "height": 2,
               "labels": {"range": [[0, 1], [0, 1]], "items": []}}
    data = {"stem": {"pictures": [picture]}, "template": "{g1}"}
    assert lesson._slim_pictures(data) == {
        "stem": {"pictures": [{k: v for k, v in picture.items() if k != "labels"}]},
        "template": "{g1}",
    }
    q = {
        "step_id": "q1", "item_id": "i", "set_id": "s", "skill": "maths.x", "why_drawn": "w",
        "question_type": "production", "say": "Ile?",
        "question": {"family": "enter", "data": {}, "key": {"accept": ["9"]},
                     "help": {"hints": [{"text": "a", "pictures": [picture]}, {"text": "b"}],
                              "worked": ["a", "b"]}},
    }
    slim = lesson._slim(q)
    assert slim["copied_help"] == {"hints": [{"text": "a", "picture_alts": ["Pięć grup"]},
                                             {"text": "b"}]}
    assert slim["mistake_classes"] is None and slim["you_write"] == ["twin", "boost"]


def test_the_copy_maps_hints_onto_rungs_as_the_player_does() -> None:
    def spec(*hints: str, worked: list[str] | None = None) -> dict[str, Any]:
        help_: dict[str, Any] = {"hints": [{"text": h} for h in hints]}
        if worked is not None:
            help_["worked"] = worked
        return {"family": "enter", "data": {}, "key": {"accept": ["18"]}, "help": help_}

    four = spec("Ile grup?", "Po 6.", "6 + 6 + 6", "6 · 3 = 18")
    assert lesson._hints_on_ladder(four) == {1: [0], 2: [1], 3: [2], 4: [3]}
    # A hint that prints the answer waits for rung 3, and so does every hint after it.
    early = spec("To 18 kropek.", "Po 6.", "6 · 3 = 18")
    assert lesson._hints_on_ladder(early) == {1: [], 2: [], 3: [0, 1], 4: [2]}
    assert lesson._copied_rungs(early)["look"] is None
    # 118 is not 18.
    assert lesson._hints_on_ladder(spec("Nie 118.", "18")) == {1: [0], 2: [], 3: [], 4: [1]}

    # No hint on rung 3: almost is worked with its last line blank.
    two = spec("Po 6.", "6 · 3 = 18", worked=["6 + 6 = 12", "12 + 6 = 18", "6 · 3 = 18"])
    assert lesson._copied_help(two)["almost"] == ["6 + 6 = 12", "12 + 6 = 18", ""]
    copied = {**two, "help": lesson._copied_help(two)}
    assert lesson._copied_rungs(copied)["almost"] == "worked, its last line blank"
    assert "almost" not in lesson._copied_help(four | {"help": {**four["help"], "worked": ["a", "b"]}})
    assert "almost" not in lesson._copied_help(spec("a", "b", worked=["b"]))
    assert lesson._copied_help({"family": "enter", "data": {}, "key": {}}) == {}


def test_only_a_plainly_a_times_b_question_gets_the_rule() -> None:
    def q(figure: str, accept: list[str], family: str = "enter", **key: Any) -> dict[str, Any]:
        return {
            "question": {"family": family, "data": {"figure": {"kind": "expression",
                                                              "text": figure}},
                         "key": {"accept": accept, **key}},
            "based_on": {"question": "khan:x", "changes": []},
        }

    khan = q("$\\huge\\blueD{6} \\cdot \\greenD{6} = {?}$", ["36"])
    lesson._add_times_rule(khan)
    assert khan["question"]["key"]["rule"] == _rule(6, 6)
    assert khan["based_on"]["changes"] == [_rule_change(_rule(6, 6))]
    bare = q("$4 \\times 6 = $", ["24"])
    lesson._add_times_rule(bare)
    assert bare["question"]["key"]["rule"] == _rule(4, 6)

    for other in (
        q("6 · 3 = ?", ["19"]),  # the key is not the product
        q("6 · 3 = ?", ["18", "18,0"]),  # more than one accepted form
        q("6 + 3 = ?", ["9"]),  # not a product
        q("6 · 3 · 2 = ?", ["36"]),
        q("$\\text{Ile to} 6 \\cdot 3$", ["18"]),  # words around it
        q("6 · 3 = ?", ["18"], family="slots"),
        q("6 · 3 = ?", ["18"], rule={"rule": "times_table", "a": 3, "b": 6, "recent": [12]}),
    ):
        before = copy.deepcopy(other)
        lesson._add_times_rule(other)
        assert other == before
    unfigured = {"question": {"family": "enter", "data": {}, "key": {"accept": ["18"]}},
                 "based_on": {"question": "khan:x", "changes": []}}
    lesson._add_times_rule(unfigured)
    assert "rule" not in unfigured["question"]["key"]


def test_a_name_in_the_request_never_leaves_the_machine(bank: LessonBank, check_ts: CheckTs) -> None:
    named = "6 zadań z mnożenia dla Kasi, klasa 3"  # Kasia: an invented name, as tests/test_pii.py
    view = lesson.draft(named, "3", names=["Kasia"], topic="mnożenie dla Kasi", today=TODAY)

    sent = bank.requests[-1].body["words"]
    assert pii.leaks(sent, ["Kasia"]) == [] and "[NAME_1]" in sent
    stored = _stored(view)
    for text in (view["request"], stored["lesson"]["id"], stored["lesson"]["title"],
                 stored["lesson"]["reasoning"]):
        assert pii.leaks(text, ["Kasia"]) == [], text
    assert pii.leaks(json.dumps(view, ensure_ascii=False), ["Kasia"]) == []
    assert pii.leaks(Path(view["draft_file"]).read_text(encoding="utf-8"), ["Kasia"]) == []
    assert len(view["questions"]) == 6


def test_a_draft_without_names_is_refused(bank: LessonBank) -> None:
    with pytest.raises(JwError, match="names"):
        lesson.draft(REQUEST, "3", names=None, topic=TOPIC, today=TODAY)
    with pytest.raises(TypeError):
        lesson.draft(REQUEST, "3", topic=TOPIC, today=TODAY)  # type: ignore[call-arg]
    assert bank.requests == []


def test_a_draft_without_a_topic_is_refused(bank: LessonBank) -> None:
    with pytest.raises(JwError, match="topic") as caught:
        lesson.draft(REQUEST, "3", names=[], topic="  ", today=TODAY)
    assert "mnożenie" in caught.value.hint
    with pytest.raises(TypeError):
        lesson.draft(REQUEST, "3", names=[], today=TODAY)  # type: ignore[call-arg]
    assert bank.requests == []


def test_the_proposed_mark_is_stripped_from_skill_ids(bank: LessonBank, check_ts: CheckTs) -> None:
    view = _draft(count=1)
    (q,) = view["questions"]
    assert q["skill"] == "proposed:fixture.times-6"  # the draw's skill, as the bank wrote it
    assert "skill_note" not in q
    assert _stored(view)["questions"][0]["skill_ids"] == ["fixture.times-6"]
    step = check_ts.seen[0][1]["script"]["parts"][0]["steps"][0]
    assert step["skill_ids"] == ["fixture.times-6"]


def test_an_item_of_several_skills_names_them_all() -> None:
    ids, note = lesson._skills_ids(["proposed:maths.multiplication.row-3", "maths.x.y", "set_x"])
    assert ids == ["maths.multiplication.row-3", "maths.x.y"]
    assert note is not None and "set_x" in note
    assert lesson._skill_label("proposed:maths.a.b, maths.c.d") == "maths.a.b (proposed), maths.c.d"


def test_a_skill_that_is_no_skill_id_is_left_out_with_a_note() -> None:
    assert lesson._skill_ids("maths.add.within100") == (["maths.add.within100"], None)
    ids, note = lesson._skill_ids("set_khan_fx0003")  # the draw's fallback when a set names none
    assert ids == [] and note is not None and "set_khan_fx0003" in note
    ids, note = lesson._skill_ids("proposed:Not An Id")
    assert ids == [] and note is not None


def test_a_count_overrides_the_rule(bank: LessonBank, check_ts: CheckTs) -> None:
    view = _draft(count=3)
    assert len(view["questions"]) == 3
    assert view["rule"]["count"] == 3


def test_without_check_ts_the_draft_says_its_classes_are_unknown(
    bank: LessonBank, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv(JADWIGO_REPO_DIR, str(tmp_path / "no-checkout"))
    view = _draft()
    assert view["plays_as_copied"] is None
    assert all(q["mistake_classes"] is None for q in view["questions"])
    assert all(q["you_write"] == ["twin", "boost"] for q in view["questions"])


def test_before_check_ts_sends_classes_they_are_unknown(bank: LessonBank, check_ts: CheckTs) -> None:
    del check_ts.answer["mistake_classes"]  # check.ts before dl-e8ov.5.38.11
    view = _draft()
    assert view["plays_as_copied"] is True
    assert all(q["mistake_classes"] is None for q in view["questions"])


def test_a_step_with_no_mistake_classes_is_not_asked_for_mistake_cards(
    bank: LessonBank, check_ts: CheckTs
) -> None:
    # check.ts lists only the classes a step can emit (dl-e8ov.5.38.15): it may be none.
    check_ts.answer["mistake_classes"] = {"q1": [], "q2": CLASSES}
    view = _draft(count=2)
    q1, q2 = view["questions"]
    assert q1["mistake_classes"] == [] and "boost_by_mistake" not in q1["you_write"]
    assert "boost_by_mistake" in q2["you_write"]
    words = _words(view)
    assert "boost_by_mistake" not in words["q1"]
    assert lesson.check(view["draft_id"], words)["ok"] is True
    del words["q2"]["boost_by_mistake"]
    assert lesson.check(view["draft_id"], words)["errors"] == [
        {"step_id": "q2", "message": "help.boost_by_mistake is empty; write it"}
    ]


def test_the_draft_verb_prints_the_draft(bank: LessonBank, check_ts: CheckTs) -> None:
    args = ["lesson", "draft", REQUEST, "--grade", "3", "--topic", TOPIC, "--json"]
    result = CliRunner().invoke(cli, [*args, "--no-names"])
    assert result.exit_code == 0, result.output
    printed = json.loads(result.output)
    assert printed["draft_id"] != (view := _draft())["draft_id"]
    assert _undated(printed) | {"title": REQUEST} == _undated(view)
    refused = CliRunner().invoke(cli, args)
    assert refused.exit_code == 2 and "--name" in refused.output
    untopical = CliRunner().invoke(cli, ["lesson", "draft", REQUEST, "--grade", "3", "--no-names"])
    assert untopical.exit_code == 2 and "--topic" in untopical.output


# ---------------------------------------------------------------- check ------


def test_check_puts_the_agents_words_on_the_copy_and_returns_the_card(
    bank: LessonBank, check_ts: CheckTs
) -> None:
    view = _draft()
    words = _words(view)
    result = lesson.check(view["draft_id"], words)

    assert result["ok"] is True, result
    assert len(check_ts.seen) == 2  # the copy at draft time, then the lesson
    argv, file = check_ts.seen[-1]
    assert argv[0] == "bun" and argv[1].endswith("packages/lesson-import/src/check.ts")
    assert Path(result["lesson_file"]) == lesson._out_dir() / (
        "6-zadan-z-mnozenia-klasa-3-2026-10-29.json"
    )
    assert Path(argv[2]) == Path(result["lesson_file"])
    assert (result["play_path"], result["lesson_id"], result["questions"]) == (
        "/play/asg_fixture", "les_fixture", 6
    )

    # The shape parseLessonFile accepts (packages/lesson-import/src/lesson-file.ts).
    assert set(file) == {"id", "title", "language", "category", "subject", "reasoning", "kind",
                         "script"}
    (part,) = file["script"]["parts"]
    assert part["part"] == "practice" and len(part["steps"]) == 6
    for step, q in zip(part["steps"], view["questions"], strict=True):
        assert set(step) == STEP_KEYS and step["skill_ids"] == ["fixture.times-6"]
        source = _converted(q["item_id"])["spec"]
        help_ = step["question"]["help"]
        # The copy whole, and only the agent's words added.
        assert help_["hints"] == source["help"]["hints"]
        assert help_["worked"] == source["help"]["worked"]
        assert set(help_) == {"hints", "worked", "boost", "boost_by_mistake", "twin"}
        assert help_["boost"] == words[q["step_id"]]["boost"]
        assert set(help_["boost_by_mistake"]) == {"added_instead"}
        assert {"say", "family", "data", "key"} <= set(help_["twin"])
        assert step["based_on"]["changes"] == [_rule_change(step["question"]["key"]["rule"])]
        assert step["credit"]["licence"]

    card = result["card"]
    first = card["questions"][0]
    assert set(first) == {"n", "step_id", "skill", "prompt", "key", "rungs", "twin", "source",
                          "licence", "changes", "why_drawn"}
    assert first["skill"] == "fixture.times-6 (proposed)"
    hints = view["questions"][0]["copied_help"]["hints"]
    assert first["rungs"] == {
        "look": hints[0]["text"],
        "boost": words["q1"]["boost"]["text"],
        "almost": None,
        "worked": [*_converted(view["questions"][0]["item_id"])["spec"]["help"]["worked"],
                   hints[1]["text"]],
    }
    item = view["questions"][0]["item_id"]
    assert first["source"] == f"bank {item} https://fixture.invalid/jw/items/{item}"
    assert all(q["licence"] and q["why_drawn"] and q["twin"]["key"] for q in card["questions"])
    assert {item["id"] for item in card["left_out"]} >= {"fxc201", "set_khan_xj1k2l3"}

    text = lesson.card_text(card)
    assert text.startswith("1. ") and "left out:" in text and "fxc201" in text
    assert "skill: fixture.times-6 (proposed)" in text

    # The import comes before the play path, which does not exist until it has run.
    command = f"make lesson-import FILE={result['lesson_file']} ENV=dev"
    assert result["import_command"] == command
    assert card["next"] == {
        "command": command,
        "run_in": str(REPO),
        "then_play": "/play/asg_fixture",
        "says": f"Import the lesson first: {command}, from the jadwigo checkout ({REPO}). Only "
        "then does it play at /play/asg_fixture; before the import that path does not exist.",
    }
    assert list(result).index("import_command") < list(result).index("play_path")
    assert text.endswith(f"next: {card['next']['says']}")


def test_check_accepts_bare_strings_and_a_nested_twin(bank: LessonBank, check_ts: CheckTs) -> None:
    view = _draft(count=1)
    words = _words(view)["q1"]
    words["boost"] = words["boost"]["text"]
    twin = words["twin"]
    words["twin"] = {"say": twin["say"], "question": {k: twin[k] for k in ("data", "key")}}
    lesson.check(view["draft_id"], {"q1": words})
    help_ = check_ts.seen[-1][1]["script"]["parts"][0]["steps"][0]["question"]["help"]
    assert help_["boost"] == {"text": words["boost"]}
    assert help_["twin"]["family"] == "enter" and "question" not in help_["twin"]


def test_title_and_reasoning_replace_the_drafts(bank: LessonBank, check_ts: CheckTs) -> None:
    view = _draft(count=1)
    lesson.check(view["draft_id"], _words(view), title="Mnożenie przez 6", reasoning="Na środę.")
    file = check_ts.seen[-1][1]
    assert (file["title"], file["reasoning"]) == ("Mnożenie przez 6", "Na środę.")
    assert file["id"] == "6-zadan-z-mnozenia-klasa-3-2026-10-29"


def test_a_change_to_a_copied_part_is_recorded_in_based_on(
    bank: LessonBank, check_ts: CheckTs
) -> None:
    view = _draft(count=1)
    words = _words(view)
    words["q1"]["changes"] = [
        {"change": "wording", "why": "Rodzic prosi o prostsze słowa.",
         "set": {"hints.0.text": "Policz grupy.", "say": "Ile razem?"}},
    ]
    result = lesson.check(view["draft_id"], words)
    assert result["ok"] is True, result
    step = check_ts.seen[-1][1]["script"]["parts"][0]["steps"][0]
    assert step["say"] == "Ile razem?"
    assert step["question"]["help"]["hints"][0]["text"] == "Policz grupy."
    assert step["based_on"]["changes"] == [
        _rule_change(step["question"]["key"]["rule"]),
        {"change": "wording", "why": "Rodzic prosi o prostsze słowa.", "reviewed": False},
    ]
    assert result["card"]["questions"][0]["changes"] == step["based_on"]["changes"]
    assert "changed (wording): Rodzic prosi" in lesson.card_text(result["card"])
    # The draft kept is the bank's copy still.
    assert len(_stored(view)["questions"][0]["based_on"]["changes"]) == 1


def test_the_agents_words_are_refused_by_step_id_before_check_ts_runs(
    bank: LessonBank, check_ts: CheckTs
) -> None:
    view = _draft()
    words = _words(view)
    del words["q2"]["boost"]
    words["q4"]["twin"] = {}
    words["q5"]["look"] = {"text": "Przeczytaj jeszcze raz."}  # rung 1 is the copy's hint 1
    words["q6"]["changes"] = [{"change": "style", "why": "", "set": {"stem.text": "x"}}]
    words["q9"] = {"twin": {}}
    result = lesson.check(view["draft_id"], words)
    assert result == {"ok": False, "errors": result["errors"], "lesson_file": None}
    assert len(check_ts.seen) == 1  # the draft's own run only
    messages = [(e["step_id"], e["message"]) for e in result["errors"]]
    assert messages[0] == ("q9", "no step q9 in " + view["draft_id"] + "; its steps are "
                           "q1, q2, q3, q4, q5, q6")
    assert ("q2", "help.boost is empty; write it") in messages
    assert ("q4", "help.twin is empty; write it") in messages
    assert any(s == "q5" and m.startswith("look: rung 1 is copied from the bank (hint 1)")
               for s, m in messages)
    q6 = [m for s, m in messages if s == "q6"]
    assert q6 == [
        "changes[1].change is one of numbers, context, wording, tutor_notes",
        "changes[1].why says what the parent asked for",
        "changes[1].set stem.text: a change sets one of say, data, key, hints, worked, almost, "
        "or a part under one",
    ]


def test_a_change_names_a_part_the_copy_has(bank: LessonBank, check_ts: CheckTs) -> None:
    view = _draft(count=1)
    words = _words(view)
    words["q1"]["changes"] = [
        {"change": "numbers", "why": "x", "set": {"hints.7.text": "a", "key.accept": ["2"]}}
    ]
    words["q1"]["tone"] = "kind"
    result = lesson.check(view["draft_id"], words)
    assert [e["message"] for e in result["errors"]] == [
        "tone is not a part a step takes; it takes look, boost, almost, worked, "
        "boost_by_mistake, twin, changes",
        "changes[1].set hints.7.text: the copy has no hints.7",
    ]


def test_an_unknown_draft_id_is_an_error(bank: LessonBank) -> None:
    with pytest.raises(JwError, match="no draft draft_000000000000") as caught:
        lesson.check("draft_000000000000", {})
    assert "lesson_draft" in caught.value.hint
    with pytest.raises(JwError, match="is not a draft id"):
        lesson.check("../secrets", {})


def test_an_answer_with_errors_comes_back_by_step_id(bank: LessonBank, check_ts: CheckTs) -> None:
    view = _draft()
    errors = [{"step_id": "q2", "message": "lesson file x, step q2 help: no field for help.y"}]
    check_ts.answer = {"ok": False, "errors": errors, "play_path": "/play/asg_x",
                       "lesson_id": "les_x", "questions": 0}
    result = lesson.check(view["draft_id"], _words(view))
    assert result["ok"] is False
    assert result["errors"] == errors
    assert Path(result["lesson_file"]).is_file()


def test_check_ts_that_prints_no_json_is_an_error(bank: LessonBank, check_ts: CheckTs) -> None:
    view = _draft(count=1)
    broken = SimpleNamespace(returncode=1, stdout="", stderr="error: Cannot find module 'zod'")
    with pytest.raises(JwError, match="Cannot find module"):
        lesson.check(view["draft_id"], _words(view), runner=lambda _argv: broken)


def test_the_check_verb_reads_the_words_from_a_file(
    bank: LessonBank, check_ts: CheckTs, tmp_path: Path
) -> None:
    view = _draft()
    words = tmp_path / "words.json"
    words.write_text(json.dumps(_words(view), ensure_ascii=False), encoding="utf-8")
    result = CliRunner().invoke(cli, ["lesson", "check", view["draft_id"], str(words), "--json"])
    assert result.exit_code == 0, result.output
    assert json.loads(result.output) == lesson.check(view["draft_id"], _words(view))
    plain = CliRunner().invoke(cli, ["lesson", "check", view["draft_id"], str(words)])
    assert plain.output.startswith("1. ") and "next: Import the lesson first: make" in plain.output
    assert plain.output.index("make lesson-import") < plain.output.index("/play/asg_fixture")


def test_the_repo_dir_defaults_to_this_checkout_and_names_its_setting(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    assert settings_keys.repo_dir() == REPO
    monkeypatch.setenv(JADWIGO_REPO_DIR, str(tmp_path))
    assert settings_keys.repo_dir() == tmp_path
    with pytest.raises(JwError) as caught:
        lesson.check_script()
    assert JADWIGO_REPO_DIR in caught.value.hint


# ---------------------------------------------------------------- the real check.ts --


@pytest.mark.skipif(shutil.which("bun") is None, reason="bun is not on PATH")
def test_the_real_check_ts_plays_the_copy_and_the_agents_words(bank: LessonBank) -> None:
    view = _draft()
    assert view["plays_as_copied"] is True, view["copy_errors"]
    result = lesson.check(view["draft_id"], _words(view))
    assert result["ok"] is True, result
    assert result["play_path"].startswith("/play/")
    assert result["lesson_id"].startswith("les_")
    assert result["questions"] == 6
    assert all(q["source"] and q["licence"] for q in result["card"]["questions"])


@pytest.mark.skipif(shutil.which("bun") is None, reason="bun is not on PATH")
def test_the_real_check_ts_names_the_step_it_refuses(bank: LessonBank) -> None:
    view = _draft()
    words = _words(view)
    words["q3"]["changes"] = [
        {"change": "numbers", "why": "x", "set": {"key.accept": "18"}}  # a string, not a list
    ]
    result = lesson.check(view["draft_id"], words)
    assert result["ok"] is False
    assert [e["step_id"] for e in result["errors"]] == ["q3"]
