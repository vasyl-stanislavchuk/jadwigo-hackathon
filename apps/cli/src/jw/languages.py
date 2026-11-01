"""The languages jw speaks: the codes of packages/config/src/languages.ts, which
tests/test_languages.py compares with this list (apps/cli imports nothing of ours). No Ukrainian
(decision 2026-10-26-jadwigo-carries-no-ukrainian-the-tables-stay-in-david-learns-and)."""

from __future__ import annotations

from typing import Final

LANGUAGES: Final = ("pl", "en")
NAMES: Final = {"pl": "Polish", "en": "English"}
DEFAULT: Final = "pl"
