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
from jw.settings_keys import JW_KHAN_CONVERTED

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
    _write(tmp_path / "khan" / "converted" / "pl.json", payload)

    assert items.converted_path() == FIXTURE
    assert items.load_item("item_a1")["say"] == "Ile to jest sześć razy cztery?"


def test_unset_reads_converted_pl_in_the_default_khan_dir(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv(JW_KHAN_CONVERTED)
    khan = tmp_path / "khan"
    polish = _fixture()
    polish["items"][0]["spec"]["say"] = "from converted/pl.json"
    _write(khan / "converted" / "pl.json", polish)

    assert items.converted_path() == khan / "converted" / "pl.json"
    assert items.load_item("item_a1")["say"] == "from converted/pl.json"


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
