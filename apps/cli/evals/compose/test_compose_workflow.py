"""The compose workflow's eval on the canonical request (dl-u1y5.32). Runs with `pytest -q`, no model.

    cd apps/cli && uv run --frozen pytest -q evals/compose/test_compose_workflow.py

Three parts:

1. The workflow itself, `workflows/jadwigo-lesson-compose/SKILL.md`: it cites both decisions in
   force, names the 2 tools and the steps run A (dl-e8ov.5.38.5) needed, carries the rules run A
   broke, and sends the agent to nothing an empty folder lacks (source, grep, jq, a shell).
2. The words a composing agent writes, checked by `words_check.findings`: "6 zadań z mnożenia,
   klasa 3", with the made-up names Zosia, Tomek and Anna, is drafted on the fixture bank of
   tests/fixtures/lesson (the search stubbed with its envelope, so no bank URL or token is read),
   the hand-written words of fixtures/words.json go through lesson_check, and the lesson file has
   no finding. The same draft with run A's words, one template for every question, has every
   finding run A earned, and each rule is planted once more on its own.
3. check.ts: stubbed here, and the real one when `bun` is on PATH.

Whether the words are good Polish for a child needs a reader. That is the hand-run eval,
`eval_agent_words.py`, on a lesson file a real session wrote.
"""

from __future__ import annotations

import copy
import datetime as dt
import json
import re
import shutil
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
import words_check

from jw import lesson, settings_keys
from jw.commands import question

HERE = Path(__file__).resolve().parent
CLI = HERE.parents[1]
REPO = CLI.parents[1]
SKILL = REPO / "workflows" / "jadwigo-lesson-compose" / "SKILL.md"
LESSON = CLI / "tests" / "fixtures" / "lesson"
REQUEST = "6 zadań z mnożenia, klasa 3, dla Zosi. Tomek i Anna też chcą."
TOPIC = "mnożenie"  # what the workflow distils from the request
NAMES = ["Zosia", "Tomek", "Anna"]  # made up; never a real family's names
TODAY = dt.date(2026, 10, 30)
REAL_RUN = lesson._run  # check.ts for real, before the fixture stubs it
DECISIONS = (
    "jadwigo-ai-workflows/decisions/2026-10-30-lesson-from-the-bank-copies-the-bank-question-whole-then-adapts",
    "jadwigo-ai-workflows/decisions/2026-10-30-jw-adds-the-multiplication-mistake-rule-by-code-to-a-copied-axb",
)


# ---------------------------------------------------------------- the workflow -----


def _skill() -> str:
    return SKILL.read_text(encoding="utf-8")


def test_the_workflow_names_itself_and_cites_both_decisions() -> None:
    text = _skill()
    head = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    assert head and "name: jadwigo-lesson-compose\n" in head[1] and "description:" in head[1]
    for slug in DECISIONS:
        assert slug in text, slug
    assert "Bank is the most high quality source" in text and "help text including" in text


def test_the_workflow_has_the_steps_run_a_needed() -> None:
    text = _skill()
    steps = re.findall(r"^## (\d)\. (.+)$", text, re.M)
    assert steps == [
        ("1", "Ask what is missing"),
        ("2", "Draft"),
        ("3", "Read the slim view"),
        ("4", "Write each question's words"),
        ("5", "Check"),
        ("6", "Fix what the check finds"),
        ("7", "Show the parent the card"),
        ("8", "Hand over the import"),
    ]
    for must in ("you_write", "mistake_classes", "dictionary form", "`changes`", "`topic`", "`import_command`",
                 "write no cards", "Do not run the import"):
        assert must in text, must


def test_the_workflow_carries_the_rules_run_a_broke() -> None:
    text = _skill()
    for rule in (
        "one question at a time",  # one template script for all 6
        "`łatwe`, `proste`",  # 'To łatwe'
        "Same representation",  # the twins dropped the array, groups and number line
        "Same fact family",  # 3 · 10 got 3 · 9
        "a question ends with `?`",  # a twin's say had no question mark
        "a fact the lesson never teaches",  # a boost on 5 · 6 = 30
        "Pass each name once",  # declined forms passed by hand
        "never invent a mistake class",
    ):
        assert rule in text, rule


def test_the_workflow_needs_nothing_an_empty_folder_lacks() -> None:
    body = _skill().lower()
    for word in ("grep", " jq", "ripgrep", "sed ", "cat ", ".py", ".ts`", "src/", "packages/"):
        assert word not in body, word
    assert "do not look for source code" in body and "do not run shell commands" in body


# ---------------------------------------------------------------- the words --------


@pytest.fixture
def drafted(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> dict[str, Any]:
    """The canonical request drafted on the fixture bank, with check.ts stubbed."""
    for name in settings_keys.KEYS:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv(settings_keys.JW_BANK_ENV_FILE, str(tmp_path / "no-bank.env"))
    monkeypatch.setenv(settings_keys.JADWIGO_BANK_DIR, str(CLI / "tests" / "fixtures" / "bank"))
    monkeypatch.setenv(settings_keys.JW_KHAN_CONVERTED, str(LESSON / "converted.json"))
    envelope = json.loads((LESSON / "envelope.json").read_text(encoding="utf-8"))
    monkeypatch.setattr(question, "search_envelope", lambda **_: envelope)
    monkeypatch.setattr(lesson, "drafts_dir", lambda: tmp_path / "drafts")
    monkeypatch.setattr(lesson, "_out_dir", lambda: tmp_path / "lessons")
    monkeypatch.setattr(lesson.shutil, "which", lambda _name: "bun")
    monkeypatch.setattr(lesson, "_run", lambda _repo: _check_ts)
    return lesson.draft(REQUEST, "3", names=NAMES, topic=TOPIC, today=TODAY)


def _check_ts(argv: list[str]) -> Any:
    """check.ts stubbed: ok, with each step's mistake classes, its key's near table's (the per-step
    list of dl-e8ov.5.38.15)."""
    file = json.loads(Path(argv[2]).read_text(encoding="utf-8"))
    classes = {
        s["id"]: sorted(set((s["question"]["key"].get("near") or {}).values()))
        for s in file["script"]["parts"][0]["steps"]
    }
    answer = {"ok": True, "errors": [], "play_path": "/play/asg_fixture", "lesson_id": "les_fixture",
              "questions": len(classes), "mistake_classes": classes}
    return SimpleNamespace(returncode=0, stdout=json.dumps(answer), stderr="")


def _words(view: dict[str, Any]) -> dict[str, Any]:
    """fixtures/words.json by step id: each question's own words."""
    by_item = json.loads((HERE / "fixtures" / "words.json").read_text(encoding="utf-8"))["words"]
    return {q["step_id"]: copy.deepcopy(by_item[q["item_id"]]) for q in view["questions"]}


def _run_a(view: dict[str, Any]) -> dict[str, Any]:
    """Run A's words: one template script for all 6, the twin a copy of the question with the
    next number, no figure and no question mark."""
    words: dict[str, Any] = {}
    stored = lesson.load_draft(view["draft_id"])
    for q, kept in zip(view["questions"], stored["questions"], strict=True):
        a, b = (int(n) for n in re.findall(r"\d+", q["data"]["figure"]["text"])[:2])
        words[q["step_id"]] = {
            "twin": {
                "say": f"Ile to jest {a} razy {b + 1}",
                "data": {k: v for k, v in kept["question"]["data"].items() if k != "figure"},
                "key": {"accept": [str(a * (b + 1))]},
            },
            "boost": {"text": "To łatwe! Policz jeszcze raz."},
            "boost_by_mistake": {
                cls: {"text": "Pamiętaj, że mnożenie to nie dodawanie."} for cls in q["mistake_classes"]
            },
        }
    return words


def _lesson_file(result: dict[str, Any]) -> dict[str, Any]:
    assert result["ok"] is True, result["errors"]
    return json.loads(Path(result["lesson_file"]).read_text(encoding="utf-8"))


def test_the_canonical_request_is_drafted_without_a_name(drafted: dict[str, Any]) -> None:
    assert len(drafted["questions"]) == 6 and drafted["plays_as_copied"] is True
    assert all(q["you_write"] == ["twin", "boost", "boost_by_mistake"] for q in drafted["questions"])
    shown = json.dumps(drafted, ensure_ascii=False)
    for form in ("Zosia", "Zosi", "Tomek", "Anna"):
        assert form not in shown, form


def test_the_workflows_words_check_and_have_no_finding(drafted: dict[str, Any]) -> None:
    result = lesson.check(drafted["draft_id"], _words(drafted))
    assert words_check.findings(_lesson_file(result)) == []
    assert result["lesson_file"] in result["import_command"]
    # The card shows each question's own twin. The agent changed no copied part: the only change is
    # the multiplication rule jw adds by code to a plainly a×b question (dl-e8ov.5.38.14).
    twins = [q["twin"]["prompt"] for q in result["card"]["questions"]]
    assert len(set(twins)) == 6
    changes = [c for q in result["card"]["questions"] for c in q["changes"]]
    assert all(c["why"].startswith("jw added the multiplication rule") for c in changes), changes


def test_run_as_words_earn_every_finding_run_a_did(drafted: dict[str, Any]) -> None:
    result = lesson.check(drafted["draft_id"], _run_a(drafted))
    found = "\n".join(words_check.findings(_lesson_file(result)))
    for finding in (
        "a child reads 'łatwe'",
        "twin's data is not in its question's shape",
        "twin's say ends",
        "word for word",
        "names none of its question's numbers",
    ):
        assert finding in found, finding


def _step(say: str, figure: str, key: str, skill: str = "maths.times-6", **help_: Any) -> dict[str, Any]:
    data = {"stem": {"text": figure.replace("?", "").strip()}, "input": "number", "entry": "keypad",
            "figure": {"kind": "expression", "text": figure}}
    return {"id": "q1", "skill_ids": [skill], "say": say,
            "question": {"family": "enter", "data": data, "key": {"accept": [key]}, "help": help_}}


def _twin(say: str, figure: str, key: str) -> dict[str, Any]:
    return _step(say, figure, key)["question"] | {"say": say}


def _found(step: dict[str, Any]) -> str:
    return "\n".join(words_check.findings({"script": {"parts": [{"steps": [step]}]}}))


def test_a_twin_of_times_10_stays_on_10() -> None:
    off = _step("Ile to 3 razy 10?", "3 · 10 = ?", "30", skill="maths.times-table",
                twin=_twin("Ile to 3 razy 9?", "3 · 9 = ?", "27"))
    assert "left the fact family of 3 · 10" in _found(off)
    on = _step("Ile to 3 razy 10?", "3 · 10 = ?", "30", skill="maths.times-table",
               twin=_twin("Ile to 4 razy 10?", "4 · 10 = ?", "40"))
    assert _found(on) == ""


def test_a_twin_of_a_times_6_skill_keeps_6() -> None:
    step = _step("Ile to 10 razy 6?", "10 · 6 = ?", "60",
                 twin=_twin("Ile to 10 razy 7?", "10 · 7 = ?", "70"))
    assert "left the fact family of 10 · 6" in _found(step)


def test_a_twin_keeps_its_questions_pictures_and_its_own_key() -> None:
    step = _step("Ile kropek?", "6 · 7 = ?", "42", twin=_twin("Ile kropek?", "6 · 8 = ?", "42"))
    step["question"]["data"]["stem"]["pictures"] = [{"src": "/media/a.svg", "alt": "6 rzędów"}]
    found = _found(step)
    assert "twin dropped its question's pictures" in found
    assert "twin's key ['42'] is not 6 · 8" in found


def test_a_card_leans_only_on_what_the_question_shows() -> None:
    twin = _twin("Ile to 6 razy 8?", "6 · 8 = ?", "48")
    leans = _step("Ile to 6 razy 7?", "6 · 7 = ?", "42", twin=twin,
                  boost={"text": "Pamiętasz, że 5 · 6 = 30? Dodaj jeszcze dwa razy 6."})
    assert "boost leans on 5 · 6" in _found(leans)
    row = _step("Ile to 6 razy 7?", "6 · 7 = ?", "42", twin=twin,
                boost_by_mistake={"neighbour_row": {"text": "48 to 6 · 8. Tu jest 7 rzędów, nie 8."}})
    assert _found(row) == ""


def test_a_card_never_prints_the_answer_and_ends_with_a_stop() -> None:
    step = _step("Ile to 6 razy 7?", "6 · 7 = ?", "42", twin=_twin("Ile to 6 razy 8?", "6 · 8 = ?", "48"),
                 look={"text": "Wynik to 42"})
    found = _found(step)
    assert "look prints the answer" in found and "look ends without" in found


@pytest.mark.skipif(shutil.which("bun") is None, reason="bun is not on PATH")
def test_the_real_check_ts_takes_the_workflows_words(
    drafted: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(lesson.shutil, "which", shutil.which)
    monkeypatch.setattr(lesson, "_run", REAL_RUN)
    result = lesson.check(drafted["draft_id"], _words(drafted))
    assert words_check.findings(_lesson_file(result)) == []
    assert result["play_path"].startswith("/play/") and result["questions"] == 6
