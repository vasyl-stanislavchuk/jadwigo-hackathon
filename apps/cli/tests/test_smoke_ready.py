"""dl-a38n.41 (folds dl-a38n.32.25): scripts/smoke_ready.py draws 3 different items for its 3 needs on
tests/fixtures/smoke, fails at its own ready check when a draw hands it an item that is not
lesson-ready, prints the seconds per stage, and calls jw only through what the tools return.

check.ts is the stub and the in-memory import is stubbed; the script itself runs both for real.
"""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest
from test_lesson import CheckTs, check_ts  # noqa: F401  (the check.ts stub and its fixture)

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "smoke_ready.py"


@pytest.fixture
def smoke(monkeypatch: pytest.MonkeyPatch, check_ts: CheckTs) -> ModuleType:  # noqa: F811
    spec = importlib.util.spec_from_file_location("smoke_ready", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    imported: list[str] = []

    def fake_import(lesson_file: str) -> dict[str, Any]:
        imported.append(lesson_file)
        return {"lesson_id": "les_fixture", "version": 1, "play": f"asg_{len(imported)}"}

    monkeypatch.setattr(module, "_import", fake_import)
    return module


def test_the_3_needs_draw_3_items_and_print_seconds_per_stage(
    smoke: ModuleType, capsys: pytest.CaptureFixture[str]
) -> None:
    assert smoke.main([]) == 0
    lines = capsys.readouterr().out.splitlines()
    assert lines[-1] == "3 of 3 needs reached the store"
    drawn = [re.search(r"questions \(([^)]+)\)", line)[1] for line in lines[:3]]  # type: ignore[index]
    assert sorted(drawn) == ["fxr1", "fxs1", "fxs2"]
    assert all(re.search(r"; draft \d+\.\d\d s, check \d+\.\d\d s$", line) for line in lines[:3])


def test_a_draw_of_an_item_that_is_not_ready_fails_at_the_scripts_own_check(
    smoke: ModuleType, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    # The planted miss: the converted file, read apart from jw's gate, says fxs1 never passed.
    real = smoke._converted

    def planted() -> dict[str, dict[str, Any]]:
        by_id = real()
        by_id["fxs1"] = {**by_id["fxs1"], "status": {"kind": "refused", "rule": "render-raw-tex"}}
        return by_id

    monkeypatch.setattr(smoke, "_converted", planted)
    assert smoke.main([]) == 1
    out = capsys.readouterr().out
    assert "MISS  mnożenie (grade 3): q1 is based on an item that is not lesson-ready: fxs1" in out
    assert out.splitlines()[-1] == "2 of 3 needs reached the store"


def test_the_script_calls_no_private_jw_function() -> None:
    text = SCRIPT.read_text(encoding="utf-8")
    assert not re.search(r"\b(lesson|items|lesson_edit|lesson_publish)\._[a-z]", text), (
        "smoke_ready reaches into jw's private functions"
    )
