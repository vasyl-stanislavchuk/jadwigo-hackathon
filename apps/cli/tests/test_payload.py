"""dl-a38n.41: what the model reads stays small (wave 3, lead decision 6), the card reads plain, and
each tool call is timed (decision 10).

The 12-question fixture is built here, in the test's tmp_path, from the lesson fixture's set page:
24 enter items in 4 problem types, shaped like a Khan multiplication item (a TeX stem, a figure, a
picture with labels, 2 hints with a picture, a worked line, a key with a near table), our own
words. The draw takes 12 and leaves 12 for the bank twins. check.ts is the stub; mistake classes
are the 6 the multiplication rule names.
"""

from __future__ import annotations

import copy
import datetime as dt
import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import fake_bank
import pytest
from click.testing import CliRunner
from test_lesson import CheckTs, check_ts  # noqa: F401  (the check.ts stub and its fixture)

from jw import lesson, lesson_edit
from jw.cli import main as cli
from jw.settings_keys import JADWIGO_BANK_DIR, JADWIGO_DRAFTS_DIR, JW_API_URL, JW_KHAN_CONVERTED

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "tests" / "fixtures" / "bank" / "sets" / "set_khan_fx0003.json"
ENVELOPE = ROOT / "tests" / "fixtures" / "lesson" / "envelope.json"
SET_ID = "set_khan_fx0012"
TYPES = ("Rows of dots", "Bags of apples", "Hops of six", "Boxes of pens")
CLASSES = ["neighbour_row", "add_for_multiply", "off_by_small", "digit_reversal", "same_decade",
           "added_instead"]
DRAFT_BUDGET = 8192
CHECK_BUDGET = 6144


def _picture(n: int) -> dict[str, Any]:
    """A picture as a Khan item carries one: the address, the alt, the size and the labels."""
    return {
        "src": f"/media/khan/{n:040x}.svg",
        "alt": f"Rysunek: {n} grup kropek ułożonych w rzędy.",
        "width": 320,
        "height": 180,
        "labels": {"range": [[0, 10], [0, 6]],
                   "items": [{"text": str(k), "at": [k, 1]} for k in range(8)]},
    }


def _item(t: int, k: int) -> dict[str, Any]:
    a, b = 6, k + 2 + t
    item_id = f"fxq{t}{k:02d}"
    spec = {
        "id": item_id,
        "family": "enter",
        "phase": "practice",
        "question_type": "production",
        "say": f"Ile to jest {a} razy {b}?",
        "data": {
            "stem": {"text": f"$\\Huge{{\\blue{{{a}}} \\cdot {b}}} = $",
                     "pictures": [_picture(t * 10 + k)]},
            "input": "number",
            "entry": "keypad",
            "figure": {"kind": "expression", "text": f"{a} · {b} = ?"},
        },
        "key": {"accept": [str(a * b)], "near": {str(a + b): "added_instead"}},
        # 4 hints fill every rung, and the bank's card pass wrote a card per class (wave 3, lead
        # decisions 3 and 4): the state the timed run drafts from.
        "help": {
            "hints": [{"text": f"To {b} grup po {a}.", "pictures": [_picture(500 + k)]},
                      {"text": f"Policz {a} w każdej z {b} grup."},
                      {"text": f"{a} + {a} + ... ({b} razy)"},
                      {"text": f"{a} · {b} = {a * b}"}],
            "worked": [f"{a} + {a} + ... ({b} razy)", f"{a} · {b} = {a * b}"],
            "boost_by_mistake": {c: {"text": f"Sprawdź jeszcze raz: {b} grup po {a}."}
                                 for c in CLASSES},
        },
    }
    return {
        "id": item_id,
        "family": "enter",
        "problem_type": TYPES[t],
        "grade": 3,
        "language": "pl",
        "spec": spec,
        "credit": {"source": "bank", "ref": item_id, "url": f"https://fixture.invalid/{item_id}",
                   "licence": "Fixture licence: our own small bank", "original_lang": "pl"},
        "status": {"kind": "plays", "rules_version": "fixture-1",
                   "checked_at": "2026-10-30T09:00:00Z"},
    }


@pytest.fixture
def twelve(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Iterator[list[dict[str, Any]]]:
    """The 24-item set, its page and a bank that finds it."""
    made = [_item(t, k) for t in range(len(TYPES)) for k in range(6)]
    ids = [i["id"] for i in made]
    page = json.loads(PAGE.read_text(encoding="utf-8"))
    page["id"] = SET_ID
    page["items"] = {"count": {"pl": len(ids), "en": 0, "shared": 0}, "ids": ids}
    page["problem_types"] = [
        {"name": name, "count": {"pl": 6, "en": 0},  # a page lists 3 samples of each
         "samples": [{"item_id": i["id"], "pl": i["spec"]["data"]["stem"]["text"]}
                     for i in made if i["problem_type"] == name][:3]}
        for name in TYPES
    ]
    (tmp_path / "bank" / "sets").mkdir(parents=True)
    (tmp_path / "bank" / "sets" / f"{SET_ID}.json").write_text(json.dumps(page), encoding="utf-8")
    converted = tmp_path / "converted-pl.json"
    converted.write_text(json.dumps({"licence_note": "fixture", "items": made}), encoding="utf-8")
    envelope = json.loads(ENVELOPE.read_text(encoding="utf-8"))
    envelope["rows"] = [{**envelope["rows"][0], "id": SET_ID}]

    class Bank(fake_bank.FakeBank):
        def answer(self, need: Any, query: dict[str, str]) -> dict[str, Any]:
            return {**copy.deepcopy(envelope), "need": need}

    bank = Bank().start()
    monkeypatch.setenv(JW_API_URL, bank.url)
    monkeypatch.setenv(JADWIGO_BANK_DIR, str(tmp_path / "bank"))
    monkeypatch.setenv(JW_KHAN_CONVERTED, str(converted))
    monkeypatch.setenv(JADWIGO_DRAFTS_DIR, str(tmp_path / "drafts"))
    lesson.items.clear_cache()
    yield made
    bank.stop()
    lesson.items.clear_cache()


def _size(value: Any) -> int:
    return len(json.dumps(value, ensure_ascii=False).encode())


def _words(view: dict[str, Any]) -> dict[str, Any]:
    """What a composing agent writes for what each step's you_write lists."""
    out: dict[str, Any] = {}
    for q in view["questions"]:
        given: dict[str, Any] = {}
        for need in q["you_write"]:
            if need == "twin":
                given["twin"] = {"say": "Ile to jest 6 razy 9?", "data": q["data"],
                                 "key": {"accept": ["54"]}}
            elif need == "boost_by_mistake":
                given["boost_by_mistake"] = {c: {"text": "Policz grupy jeszcze raz."}
                                             for c in q["cards_to_write"]}
            else:
                given[need] = {"text": "Policz po kolei."} if need in ("look", "boost") else [
                    "Krok po kroku."]
        out[q["step_id"]] = given
    return out


def test_the_draft_and_the_check_stay_within_their_budgets(
    twelve: list[dict[str, Any]], check_ts: CheckTs
) -> None:
    check_ts.answer["mistake_classes"] = {f"q{n}": CLASSES for n in range(1, 13)}
    view = lesson.draft("12 zadań z mnożenia, klasa 3", "3", names=[], topic="mnożenie",
                        count=12, today=dt.date(2026, 10, 31))
    assert len(view["questions"]) == 12
    assert sum("twin_source" in q for q in view["questions"]) == 12  # a sibling for every step
    assert _size(view) <= DRAFT_BUDGET, _size(view)
    # verbose has everything, and is far over: the budget is the slimming's doing.
    assert _size(lesson.draft("12 zadań z mnożenia, klasa 3", "3", names=[], topic="mnożenie",
                              count=12, verbose=True)) > DRAFT_BUDGET
    shown = json.dumps(view, ensure_ascii=False)
    assert '"labels"' not in shown and '"src"' not in shown

    check_ts.answer["findings"] = [
        {"step_id": f"q{n}", "path": "x", "level": "warn", "rule": "twin-same-picture",
         "text": "t", "fix": "f"} for n in range(1, 13)
    ]
    result = lesson.check(view["draft_id"], _words(view))
    assert result["ok"] is True, result
    assert _size(result) <= CHECK_BUDGET, _size(result)
    assert result["warns"] == {"twin-same-picture": 12} and result["findings"] == []
    card = result["card"]
    assert "left_out" not in card and "import_command" not in result
    # TeX made plain on the card, and the lesson file keeps it (dl-e8ov.5.38.6).
    assert "\\" not in json.dumps(card, ensure_ascii=False)
    assert " · " in card["questions"][0]["prompt"] and "$" not in card["questions"][0]["prompt"]
    assert "\\cdot" in Path(result["draft_path"]).read_text(encoding="utf-8")
    assert all(q["twin"]["source"].startswith("bank khan:fxq") for q in card["questions"])


@pytest.mark.parametrize(
    ("tex", "plain"),
    [
        ("$\\Huge{\\blue{60} \\cdot 4} = $", "60 · 4 ="),
        ("$\\dfrac{3}{4}$ z $12$", "3/4 z 12"),
        ("\\huge\\blueD{3}", "3"),
        ("$4 \\times 6 = $", "4 × 6 ="),
        ("$5\\text{ cm}$", "5 cm"),
        ("$12 \\div 3 \\neq 5$", "12 : 3 ≠ 5"),
        ("Ile kropek?", "Ile kropek?"),
    ],
)
def test_tex_on_the_card_reads_plain(tex: str, plain: str) -> None:
    assert lesson.tex_plain(tex) == plain


def test_a_bank_copy_out_of_step_with_its_pages_warns_the_setup(
    twelve: list[dict[str, Any]], check_ts: CheckTs, tmp_path: Path
) -> None:
    converted = tmp_path / "converted-pl.json"
    kept = [i for i in twelve if not i["id"].endswith(("00", "01", "02"))]  # 12 of 24 gone
    converted.write_text(json.dumps({"licence_note": "fixture", "items": kept}), encoding="utf-8")
    lesson.items.clear_cache()
    view = lesson.draft("12 zadań z mnożenia, klasa 3", "3", names=[], topic="mnożenie",
                        count=12)
    assert "jw doctor" in view["setup_warning"] and "jw bank pull" in view["setup_warning"]
    causes = {c["cause"]: c for c in view["left_out"]["by_cause"]}
    missing = next(c for cause, c in causes.items() if cause.startswith("no item "))
    assert len(missing["examples"]) <= 3


def test_every_tool_call_is_timed_and_the_split_names_the_models_time(
    twelve: list[dict[str, Any]], check_ts: CheckTs
) -> None:
    view = lesson.draft("12 zadań z mnożenia, klasa 3", "3", names=[], topic="mnożenie",
                        count=12)
    lesson.check(view["draft_id"], _words(view))
    lesson_edit.edit(view["draft_id"], "q2", {"question": {"help": {"boost": "Krok."}}})
    split = lesson.timing(view["draft_id"])
    assert [c["tool"] for c in split["calls"]] == ["lesson_draft", "lesson_check", "lesson_edit"]
    assert split["calls"][0]["model_s"] is None
    assert all(c["s"] >= 0 and c["over_budget"] is False for c in split["calls"])
    assert all(c["model_s"] >= 0 for c in split["calls"][1:])
    assert split["wall_s"] >= split["tools_s"]

    printed = CliRunner().invoke(cli, ["lesson", "timing", view["draft_id"]])
    assert printed.exit_code == 0, printed.output
    lines = printed.output.splitlines()
    assert lines[0] == view["draft_id"] and "lesson_check" in printed.output
    assert sum(line.strip().startswith("model") for line in lines) == 2
    assert lines[-1].startswith("tools ") and "model" in lines[-1] and "wall" in lines[-1]
    as_json = json.loads(CliRunner().invoke(cli, ["lesson", "timing", view["draft_id"],
                                                  "--json"]).output)
    assert [c["tool"] for c in as_json["calls"]] == [c["tool"] for c in split["calls"]]
