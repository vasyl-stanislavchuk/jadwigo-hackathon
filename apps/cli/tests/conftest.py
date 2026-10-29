"""Every test starts with no jw settings, and no test reads the real ~/.config/jadwigo-bank/bank.env
or the real synced Khan copy in ~/.cache/jadwigo-bank/khan.

The tests directory is on sys.path (pytest's prepend import mode), so tests import `fake_bank`.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from jw import settings_keys
from jw.settings_keys import JW_BANK_ENV_FILE, KEYS


@pytest.fixture(autouse=True)
def _no_bank_settings(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    for name in KEYS:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv(JW_BANK_ENV_FILE, str(tmp_path / "no-bank.env"))
    monkeypatch.setattr(settings_keys, "DEFAULT_KHAN_DIR", tmp_path / "no-khan")
