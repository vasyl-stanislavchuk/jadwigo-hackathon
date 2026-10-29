"""dl-n9fr.47: `settings_keys.setting` is the one loader for every key jw takes.

Each test writes its own mode-600 file in tmp_path with invented values; conftest points
JW_BANK_ENV_FILE at a path that does not exist, so none reads the operator's real file.
"""

from __future__ import annotations

import logging
from pathlib import Path

import pytest

from jw import bank_client, items, settings_keys
from jw.errors import JwError
from jw.settings_keys import (
    JADWIGO_BANK_DIR,
    JADWIGO_KHAN_DIR,
    JW_API_URL,
    JW_BANK_ENV_FILE,
    JW_BANK_TIMEOUT_SECS,
    JW_BANK_TOKEN,
    JW_KHAN_CONVERTED,
    KEYS,
    setting,
)

HIDDEN = "plum-harbour-lantern"  # a made-up value; no test may see it in an error or a log


def _env_file(tmp_path: Path, text: str, mode: int = 0o600) -> Path:
    path = tmp_path / "bank.env"
    path.write_text(text, encoding="utf-8")
    path.chmod(mode)
    return path


@pytest.fixture
def file_with(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    def make(text: str, mode: int = 0o600) -> Path:
        path = _env_file(tmp_path, text, mode)
        monkeypatch.setenv(JW_BANK_ENV_FILE, str(path))
        return path

    return make


@pytest.fixture(autouse=True)
def _fresh_items_cache():
    items._read.cache_clear()
    yield
    items._read.cache_clear()


def test_every_key_goes_through_the_loader(file_with) -> None:
    file_with("".join(f"{name}=from-file-{name}\n" for name in KEYS))
    for name in KEYS:
        assert setting(name) == f"from-file-{name}"


def test_the_environment_beats_the_file(file_with, monkeypatch: pytest.MonkeyPatch) -> None:
    file_with(f"{JADWIGO_BANK_DIR}=/from/file\n")
    monkeypatch.setenv(JADWIGO_BANK_DIR, "/from/env")
    assert setting(JADWIGO_BANK_DIR) == "/from/env"


def test_the_file_beats_the_default(file_with, tmp_path: Path) -> None:
    file_with(f"export {JADWIGO_KHAN_DIR}='{tmp_path / 'synced'}'\n{JW_BANK_TIMEOUT_SECS}=3.5\n")
    assert settings_keys.khan_dir() == tmp_path / "synced"
    assert settings_keys.bank_timeout() == 3.5


def test_unset_everywhere_gives_the_default(file_with) -> None:
    file_with(f"{JADWIGO_KHAN_DIR}=\n")  # an empty value counts as unset
    assert setting(JADWIGO_KHAN_DIR) is None
    assert settings_keys.khan_dir() == settings_keys.DEFAULT_KHAN_DIR
    assert settings_keys.bank_timeout() == settings_keys.DEFAULT_BANK_TIMEOUT_SECS


def test_the_file_feeds_the_bank_dir_and_the_timeout(file_with, tmp_path: Path) -> None:
    file_with(f"{JADWIGO_BANK_DIR}={tmp_path / 'bank'}\n")
    with pytest.raises(bank_client.SetNotFound, match=str(tmp_path / "bank" / "sets")):
        bank_client.show_set("set_khan_1")


def test_a_copy_of_the_example_reads_as_unset(file_with) -> None:
    example = Path(__file__).resolve().parents[1] / ".env.example"
    file_with(example.read_text(encoding="utf-8"))
    assert {name: setting(name) for name in KEYS} == dict.fromkeys(KEYS)


def test_a_trailing_comment_is_not_part_of_the_value(file_with) -> None:
    file_with(f"{JADWIGO_BANK_DIR}=/a/b  # the checkout\n{JW_BANK_TOKEN}='x # y'  # quoted\n")
    assert setting(JADWIGO_BANK_DIR) == "/a/b"
    assert setting(JW_BANK_TOKEN) == "x # y"


def test_a_world_readable_file_is_refused(file_with) -> None:
    path = file_with(f"{JW_BANK_TOKEN}={HIDDEN}\n{JADWIGO_BANK_DIR}=/x\n", 0o644)
    with pytest.raises(JwError, match="can be read by other users") as raised:
        setting(JADWIGO_BANK_DIR)
    assert str(path) in str(raised.value)
    assert HIDDEN not in str(raised.value) and HIDDEN not in raised.value.hint


def test_the_environment_skips_a_refused_file(file_with, monkeypatch: pytest.MonkeyPatch) -> None:
    file_with(f"{JADWIGO_BANK_DIR}=/x\n", 0o644)
    monkeypatch.setenv(JADWIGO_BANK_DIR, "/from/env")
    assert setting(JADWIGO_BANK_DIR) == "/from/env"


def test_an_unknown_name_is_a_programming_error() -> None:
    with pytest.raises(ValueError, match="not a jw setting"):
        setting("JW_SOMETHING_ELSE")


def test_no_value_reaches_a_log_or_an_error(
    file_with, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.DEBUG, logger="jw")
    file_with(f"{JW_BANK_TOKEN}={HIDDEN}\n{JW_BANK_TIMEOUT_SECS}={HIDDEN}\n")
    monkeypatch.setenv(JW_API_URL, f"http://{HIDDEN}.example")

    assert setting(JW_BANK_TOKEN) == HIDDEN
    assert setting(JW_API_URL) == f"http://{HIDDEN}.example"
    with pytest.raises(JwError) as raised:
        settings_keys.bank_timeout()

    assert JW_BANK_TIMEOUT_SECS in str(raised.value)
    assert HIDDEN not in str(raised.value) and HIDDEN not in raised.value.hint
    assert caplog.records, "the loader logs where each key came from"
    assert all(HIDDEN not in record.getMessage() for record in caplog.records)


def test_the_converted_default_is_pl_json_in_the_synced_copy(file_with, tmp_path: Path) -> None:
    assert items.converted_path() == settings_keys.DEFAULT_KHAN_DIR / "converted" / "pl.json"
    file_with(f"{JADWIGO_KHAN_DIR}={tmp_path / 'synced'}\n")
    assert items.converted_path() == tmp_path / "synced" / "converted" / "pl.json"
    file_with(f"{JADWIGO_KHAN_DIR}={tmp_path / 'synced'}\n{JW_KHAN_CONVERTED}=~/elsewhere.json\n")
    assert items.converted_path() == Path("~/elsewhere.json").expanduser()


def test_the_real_defaults_name_the_cache_and_the_config_dir() -> None:
    # conftest swaps DEFAULT_KHAN_DIR for each test, so read the module's own line.
    source = Path(settings_keys.__file__).read_text(encoding="utf-8")
    assert 'DEFAULT_KHAN_DIR = Path.home() / ".cache" / "jadwigo-bank" / "khan"' in source
    assert settings_keys.DEFAULT_BANK_ENV_FILE == Path.home() / ".config/jadwigo-bank/bank.env"


def test_an_absent_converted_file_names_the_setting_and_the_sync() -> None:
    with pytest.raises(JwError) as raised:
        items.load_item("item_a1")
    assert str(settings_keys.DEFAULT_KHAN_DIR / "converted" / "pl.json") in str(raised.value)
    assert JW_KHAN_CONVERTED in raised.value.hint
    assert JADWIGO_KHAN_DIR in raised.value.hint
    assert "uv run python -m tools.khan.sync down" in raised.value.hint
