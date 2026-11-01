"""dl-hin8.17: jw reads the converted items file of the language asked for. The jadwigo MCP's
config names converted-pl.json in JW_KHAN_CONVERTED, and an English lesson must still load its
items from converted.json beside it."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from jw import items, refusals
from jw.settings_keys import (
    JADWIGO_KHAN_DIR,
    JW_KHAN_CONVERTED,
    JW_KHAN_CONVERTED_EN,
    JW_KHAN_CONVERTED_PL,
)

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "items" / "converted.json"
SETTINGS = (
    JW_KHAN_CONVERTED,
    JW_KHAN_CONVERTED_PL,
    JW_KHAN_CONVERTED_EN,
    JADWIGO_KHAN_DIR,
)


@pytest.fixture(autouse=True)
def _unset(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in SETTINGS:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr(items.settings_keys, "read_env_file", lambda path=None: {})
    items.clear_cache()


def _split(folder: Path) -> tuple[Path, Path]:
    """The fixture split as the bank's sync writes it: Polish items in converted-pl.json, the
    rest in converted.json beside it."""
    raw: dict[str, Any] = json.loads(FIXTURE.read_text(encoding="utf-8"))
    folder.mkdir(parents=True, exist_ok=True)
    out = []
    for name, keep in (
        ("converted-pl.json", lambda lang: lang == "pl"),
        ("converted.json", lambda lang: lang != "pl"),
    ):
        path = folder / name
        path.write_text(
            json.dumps(
                {**raw, "items": [i for i in raw["items"] if keep(i.get("language"))]}
            ),
            encoding="utf-8",
        )
        out.append(path)
    return out[0], out[1]


def test_the_mcps_polish_setting_still_loads_english_items_from_beside_it(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    polish, english = _split(tmp_path / "khan")
    monkeypatch.setenv(JW_KHAN_CONVERTED, str(polish))
    assert items.converted_path("pl") == polish
    assert items.converted_path("en") == english
    assert items.load_item("item_e1", language="en")["language"] == "en"
    assert items.load_item("item_a1", language="pl")["language"] == "pl"


def test_each_language_has_its_own_override(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    polish, english = _split(tmp_path / "khan")
    monkeypatch.setenv(JW_KHAN_CONVERTED, str(tmp_path / "old-pl.json"))
    monkeypatch.setenv(JW_KHAN_CONVERTED_PL, str(polish))
    monkeypatch.setenv(JW_KHAN_CONVERTED_EN, str(english))
    assert (items.converted_path("pl"), items.converted_path("en")) == (polish, english)
    assert items.load_item("item_e1", language="en")["language"] == "en"


def test_the_old_name_on_a_file_with_every_language_serves_both_for_one_release(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(JW_KHAN_CONVERTED, str(FIXTURE))
    assert items.converted_path("pl") == items.converted_path("en") == FIXTURE


def test_with_nothing_set_each_language_reads_the_synced_copys_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv(JADWIGO_KHAN_DIR, str(tmp_path / "khan"))
    assert items.converted_path("pl") == tmp_path / "khan" / "converted-pl.json"
    assert items.converted_path("en") == tmp_path / "khan" / "converted.json"


@pytest.mark.parametrize("language", ["pl", "en"])
def test_the_refusals_read_the_same_file_as_the_items(
    language: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    polish, _ = _split(tmp_path / "khan")
    monkeypatch.setenv(JW_KHAN_CONVERTED, str(polish))
    assert refusals.converted_file(language) == items.converted_path(language)
