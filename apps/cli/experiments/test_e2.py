"""E2's draw step on the fixture bank pages (no real bank, no model call)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from e2 import KIND_FOR, draw_for_learner  # noqa: E402

FIXTURES = Path(__file__).resolve().parent.parent / "tests/fixtures/bank/sets"


def _pages():
    return [json.loads(p.read_text(encoding="utf-8")) for p in sorted(FIXTURES.glob("*.json"))]


def _learner(skill: str):
    return {
        "label": "Learner A",
        "profile": "steady",
        "blurb": "synthetic",
        "mastery": [{"skill_code": skill, "level": "attempted"}],
        "brief": {
            "entries": [
                {"skill_code": skill, "list": "reteach", "why": "needs_attention"},
                {"skill_code": "x.unknown-skill", "list": "new", "why": "prerequisites_met"},
            ]
        },
    }


def test_brief_lists_map_to_lesson_kinds():
    assert KIND_FOR == {
        "reteach": "practice",
        "new": "practice",
        "review": "review",
        "recheck": "check",
    }


def test_a_skill_with_no_set_is_left_out_with_its_reason():
    result = draw_for_learner(_learner("maths.multiplication.row-2"), _pages())
    unknown = result["entries"][1]
    assert unknown["sets_found"] == 0
    assert "no bank set" in unknown["left_out"][0]["reason"]
    assert result["brief_entries_total"] == 2
