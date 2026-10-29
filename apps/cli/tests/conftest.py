"""Every test starts with no bank settings, and no test reads the real ~/.config/jadwigo-bank/bank.env.

The tests directory is on sys.path (pytest's prepend import mode), so tests import `fake_bank`.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from jw.settings_keys import (
    JW_API_URL,
    JW_BANK_ENV_FILE,
    JW_BANK_READ_TOKEN,
    JW_BANK_TOKEN,
    JW_BANK_URL,
)


@pytest.fixture(autouse=True)
def _no_bank_settings(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (JW_API_URL, JW_BANK_READ_TOKEN, JW_BANK_URL, JW_BANK_TOKEN):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv(JW_BANK_ENV_FILE, str(tmp_path / "no-bank.env"))
