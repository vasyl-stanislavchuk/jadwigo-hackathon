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


def test_panel_mean_ignores_judges_that_gave_no_fit():
    from e2 import panel_mean

    assert panel_mean([{"fit": 2}, {"fit": None}, {"fit": 4}]) == 3.0
    assert panel_mean([{"fit": None}, {"fit": None}]) is None
    assert panel_mean([]) is None


def test_ledger_spend_counts_only_this_runs_rows(tmp_path, monkeypatch):
    import e2

    log_dir = tmp_path / "apps/cli/logs/muse"
    log_dir.mkdir(parents=True)
    rows = [
        {"tag": "e2:judge", "terminal": "completed", "at": "2026-11-03T10:00:00+00:00",
         "usage": {"usd": 0.5, "input_tokens": 100, "output_tokens": 10}},
        {"tag": "e2:judge", "terminal": "completed", "at": "2026-11-03T12:00:00+00:00",
         "usage": {"usd": 0.25, "input_tokens": 50, "output_tokens": 5}},
        {"tag": "e3:judge", "terminal": "completed", "at": "2026-11-03T12:30:00+00:00",
         "usage": {"usd": 9, "input_tokens": 9, "output_tokens": 9}},
    ]
    (log_dir / "2026-11-03.jsonl").write_text(
        "".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8"
    )
    monkeypatch.setattr(e2, "ROOT", tmp_path)
    got = e2.ledger_spend("2026-11-03T11:00:00+00:00")
    assert got == {"calls": 1, "usd": 0.25, "input_tokens": 50, "output_tokens": 5}


def test_the_committed_wonder_extract_matches_the_result_shape():
    extract = json.loads(
        (Path(__file__).resolve().parent / "e2-wonder-panel.json").read_text(encoding="utf-8")
    )
    assert extract["model"] == "muse-wonder-full-1.0"
    assert len(extract["learners"]) == 12
    assert all("panel_mean_fit" in learner for learner in extract["learners"])
