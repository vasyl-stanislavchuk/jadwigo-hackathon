"""dl-e8ov.5.38.2: `jw.items.load_item` and `jw question item` read converted items by id.

Every test points JW_KHAN_CONVERTED or DEFAULT_KHAN_DIR at a fixture, so none reads the real copy.
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from click.testing import CliRunner

from jw import items, settings_keys
from jw.cli import main as cli
from jw.errors import JwError
from jw.settings_keys import JADWIGO_BANK_DIR, JW_KHAN_CONVERTED

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "items" / "converted.json"


@pytest.fixture(autouse=True)
def _fixture_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """The fixture file, an empty default dir, and a fresh cache for each test."""
    monkeypatch.setenv(JW_KHAN_CONVERTED, str(FIXTURE))
    monkeypatch.setattr(settings_keys, "DEFAULT_KHAN_DIR", tmp_path / "khan")
    items._read.cache_clear()
    yield
    items._read.cache_clear()


def _write(path: Path, payload: dict[str, Any]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def _fixture() -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(FIXTURE.read_text(encoding="utf-8"))
    return loaded


def test_a_polish_item_loads_with_its_key_help_credit_and_based_on() -> None:
    view = items.load_item("item_a1")

    assert view["id"] == "item_a1"
    assert view["language"] == "pl"
    assert view["family"] == "enter"
    assert view["question_type"] == "production"
    assert view["say"] == "Ile to jest sześć razy cztery?"
    assert view["question"]["family"] == "enter"
    assert view["question"]["data"]["figure"]["text"] == "6 × 4 = ?"
    assert view["question"]["key"] == {
        "accept": ["24"],
        "near": {"10": "add_for_multiply"},
    }
    assert view["question"]["help"]["hint"] == "Policz 4 cztery razy po 6."
    assert view["based_on"] == {"question": "khan:item_a1", "changes": []}
    assert view["course"] == {
        "exercise_title": "Mnożenie do 50",
        "lesson_title": "Tabliczka mnożenia",
        "unit_title": "Mnożenie",
        "order": "0001",
    }
    # No licence on the item: the file's licence_note fills it.
    assert view["credit"] == {
        "source": "bank",
        "ref": "item_a1",
        "url": "https://example.test/items/item_a1",
        "licence": "Fixture licence note: our own small bank, written for these tests.",
        "original_lang": "pl",
        "checked": "2026-10-29",
    }


def test_the_items_own_licence_wins_and_a_missing_url_stays_out() -> None:
    view = items.load_item("item_a2")

    assert view["question"]["key"]["accept"] == ["42"]
    assert view["credit"]["licence"] == "Fixture item licence"
    assert "url" not in view["credit"]


def test_an_english_item_loads_when_english_is_asked_for() -> None:
    view = items.load_item("item_e1", language="en")

    assert view["language"] == "en"
    assert view["question"]["key"] == {"accept": ["7"]}
    assert view["credit"]["original_lang"] == "en"


@pytest.mark.parametrize("language", ["pl", "en"])
def test_a_multi_item_plays_in_the_language_asked_for(language: str) -> None:
    view = items.load_item("item_m1", language=language)

    assert view["language"] == language
    assert view["question"]["key"] == {"accept": ["7"]}


def test_a_missing_file_raises_with_the_setting_in_the_hint(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv(JW_KHAN_CONVERTED, str(tmp_path / "nowhere.json"))

    with pytest.raises(JwError) as caught:
        items.load_item("item_a1")

    assert "nowhere.json" in str(caught.value)
    assert JW_KHAN_CONVERTED in caught.value.hint
    assert "tools.khan.sync down" in caught.value.hint


def test_a_missing_id_names_the_file_its_count_and_the_setting() -> None:
    with pytest.raises(JwError) as caught:
        items.load_item("item_zz")

    assert "item_zz" in str(caught.value)
    assert str(FIXTURE) in caught.value.hint
    assert "4 items" in caught.value.hint
    assert JW_KHAN_CONVERTED in caught.value.hint


def test_the_wrong_language_raises_with_the_setting_in_the_hint() -> None:
    with pytest.raises(JwError) as caught:
        items.load_item("item_e1", language="pl")

    assert "'en'" in str(caught.value) and "'pl'" in str(caught.value)
    assert JW_KHAN_CONVERTED in caught.value.hint


def test_no_licence_anywhere_is_an_error(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    payload = _fixture()
    del payload["licence_note"]
    monkeypatch.setenv(JW_KHAN_CONVERTED, str(_write(tmp_path / "c.json", payload)))

    assert items.load_item("item_a2")["credit"]["licence"] == "Fixture item licence"
    with pytest.raises(JwError) as caught:
        items.load_item("item_a1")

    assert "licence" in str(caught.value)


def test_a_waiting_item_with_no_family_step_says_why(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    payload = _fixture()
    payload["items"][0]["spec"] = None
    payload["items"][0]["status"] = {
        "kind": "waiting",
        "reason": "its parts mix families",
    }
    monkeypatch.setenv(JW_KHAN_CONVERTED, str(_write(tmp_path / "c.json", payload)))

    with pytest.raises(JwError) as caught:
        items.load_item("item_a1")

    assert "its parts mix families" in str(caught.value)


def test_the_setting_overrides_the_default_dir(tmp_path: Path) -> None:
    payload = _fixture()
    payload["items"][0]["spec"]["say"] = "from the default dir"
    _write(tmp_path / "khan" / "converted-pl.json", payload)

    assert items.converted_path() == FIXTURE
    assert items.load_item("item_a1")["say"] == "Ile to jest sześć razy cztery?"


def test_unset_reads_converted_pl_json_in_the_default_khan_dir(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv(JW_KHAN_CONVERTED)
    khan = tmp_path / "khan"
    polish = _fixture()
    polish["items"][0]["spec"]["say"] = "from converted-pl.json"
    _write(khan / "converted-pl.json", polish)

    assert items.converted_path() == khan / "converted-pl.json"
    assert items.load_item("item_a1")["say"] == "from converted-pl.json"


def test_the_file_is_read_once_per_process(monkeypatch: pytest.MonkeyPatch) -> None:
    reads: list[Path] = []
    real = Path.read_text

    def counting(self: Path, *args: Any, **kwargs: Any) -> str:
        reads.append(self)
        return real(self, *args, **kwargs)

    monkeypatch.setattr(Path, "read_text", counting)
    items.load_item("item_a1")
    items.load_item("item_a2")

    assert reads == [FIXTURE]


def test_the_verb_prints_what_item_view_returns() -> None:
    result = CliRunner().invoke(cli, ["question", "item", "item_a1", "--json"])

    assert result.exit_code == 0, result.output
    assert json.loads(result.output) == items.load_item("item_a1")


def test_the_verb_prints_the_error_envelope_with_the_hint() -> None:
    result = CliRunner().invoke(cli, ["question", "item", "item_zz", "--json"])

    assert result.exit_code == 1
    envelope = json.loads(result.output)
    assert envelope["ok"] is False
    assert JW_KHAN_CONVERTED in envelope["error"]["hint"]


def test_the_verb_without_json_prints_a_summary() -> None:
    result = CliRunner().invoke(cli, ["question", "item", "item_a1"])

    assert result.exit_code == 0, result.output
    assert result.output.startswith("item_a1  enter / production  (pl)")


# ------------------------------------- dl-a38n.32.9: only a lesson-ready item loads ----

READY = Path(__file__).resolve().parent / "fixtures" / "ready" / "converted-pl.json"
LEFT_OUT = {
    "fxr2": "renders wrong: render-raw-tex",
    "fxr3": "renders wrong: key-grades",
    "fxr4": "renders wrong: render-picture-missing",
    "fxr5": "not checked",
}


@pytest.fixture
def planted(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """The planted fixture copied into tmp_path, and an empty bank checkout (JADWIGO_BANK_DIR)
    beside it, so a test may write its refusals/."""
    path = _write(tmp_path / "ready" / "converted-pl.json", json.loads(READY.read_text("utf-8")))
    monkeypatch.setenv(JW_KHAN_CONVERTED, str(path))
    monkeypatch.setenv(JADWIGO_BANK_DIR, str(tmp_path / "bank"))
    return path


def test_a_stamped_plays_item_loads(planted: Path) -> None:
    view = items.load_item("fxr1")

    assert view["family"] == "choose"
    assert view["question"]["key"] == {"correct": ["o1", "o3"]}


@pytest.mark.parametrize(("item_id", "reason"), sorted(LEFT_OUT.items()))
def test_an_item_that_is_not_lesson_ready_is_refused_with_its_reason(
    planted: Path, item_id: str, reason: str
) -> None:
    with pytest.raises(items.NotReady) as caught:
        items.load_item(item_id)

    assert caught.value.reason == reason
    assert str(caught.value) == f"item {item_id} is not lesson-ready: {reason}"


@pytest.mark.parametrize(
    ("status", "reason"),
    [
        (None, "not checked"),
        ({"kind": "plays", "rules_version": "fixture-1"}, "not checked"),
        ({"kind": "something new"}, "not checked"),
        (
            {"kind": "flagged", "by": "lead", "reason": "the picture shows 5 dots", "on": "x"},
            "flagged: the picture shows 5 dots",
        ),
        ({"kind": "waiting", "issue": "dl-x", "reason": "its parts mix families"},
         "its parts mix families"),
    ],
)
def test_every_other_status_says_why(
    planted: Path, status: dict[str, Any] | None, reason: str
) -> None:
    payload = json.loads(planted.read_text("utf-8"))
    if status is None:
        del payload["items"][0]["status"]
    else:
        payload["items"][0]["status"] = status
    _write(planted, payload)
    items._read.cache_clear()

    with pytest.raises(items.NotReady) as caught:
        items.load_item("fxr1")

    assert caught.value.reason == reason


def test_a_flag_in_the_refusals_file_holds_before_the_next_conversion(planted: Path) -> None:
    assert items.load_item("fxr1")["id"] == "fxr1"
    flag = {"id": "fxr1", "by": "lead", "reason": "the options repeat", "on": "2026-10-30"}
    refusals = planted.parent.parent / "bank" / "refusals"
    _write(refusals / "pl.json", {"shapes": [], "flags": [flag]})

    with pytest.raises(items.NotReady) as caught:
        items.load_item("fxr1")

    assert caught.value.reason == "flagged: the options repeat"
    assert items.refusals_path("pl") == refusals / "pl.json"
    # The English file is another language's: it does not pull the Polish variant.
    _write(refusals / "pl.json", {"shapes": [], "flags": []})
    _write(refusals / "en.json", {"shapes": [], "flags": [flag]})
    assert items.load_item("fxr1")["id"] == "fxr1"


def test_with_no_bank_checkout_there_is_no_refusals_file(
    planted: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv(JADWIGO_BANK_DIR)

    assert items.refusals_path("pl") is None
    assert items.refusals("pl") == {"shapes": [], "flags": []}
    assert items.load_item("fxr1")["id"] == "fxr1"


def test_items_keyed_by_id_read_like_a_list(planted: Path) -> None:
    payload = json.loads(planted.read_text("utf-8"))
    payload["items"] = {item["id"]: item for item in payload["items"]}
    _write(planted, payload)
    items._read.cache_clear()

    assert items.load_item("fxr1")["id"] == "fxr1"
