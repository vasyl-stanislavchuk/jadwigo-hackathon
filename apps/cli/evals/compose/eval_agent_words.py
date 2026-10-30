"""The compose workflow run by a real agent, checked by hand (dl-u1y5.32). Opt-in, never in CI.

The agent's own words need a model to write them, so this eval is run by the owner, not by
`pytest -q` (its file name does not start with `test_`):

1. In Claude Code (or Muse Code) with the `jadwigo` MCP server registered (README, "Registering
   it"), in an empty folder, run `/jadwigo-lesson-compose` and ask the canonical request with
   made-up names:

       Przygotuj lekcję dla Zosi: 6 zadań z mnożenia, klasa 3. Tomek i Anna też będą ćwiczyć.

   Answer its questions, and let it run lesson_check until it shows the card.
2. Take the `lesson_file` path the card names, and run:

       cd apps/cli
       JW_EVAL_LESSON_FILE=<lesson_file> uv run --frozen pytest -q -s evals/compose/eval_agent_words.py

It fails with every finding `words_check.findings` has on the agent's words (an unkind word, a
twin out of its question's representation or fact family, a lost question mark, one card for all,
a card on an untaught fact or printing the answer), and prints the lesson's child-facing words
so the owner can read them as the card does. It is skipped when the variable names no file.
Nothing is written: it only reads the lesson file.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest
import words_check

LESSON_FILE = os.environ.get("JW_EVAL_LESSON_FILE", "")

pytestmark = pytest.mark.skipif(
    not LESSON_FILE or not Path(LESSON_FILE).is_file(),
    reason="JW_EVAL_LESSON_FILE names no lesson file from a real lesson_check",
)


def test_the_agents_words_have_no_finding() -> None:
    lesson_file = json.loads(Path(LESSON_FILE).read_text(encoding="utf-8"))
    for part in lesson_file["script"]["parts"]:
        for step in part["steps"]:
            help_ = step["question"].get("help") or {}
            print(f"\n{step['id']}: {step['say']}")
            print(f"   twin: {(help_.get('twin') or {}).get('say')}")
            for rung in ("look", "boost"):
                if help_.get(rung):
                    print(f"   {rung}: {help_[rung]['text']}")
            for cls, card in (help_.get("boost_by_mistake") or {}).items():
                print(f"   {cls}: {card['text']}")
    problems = words_check.findings(lesson_file)
    assert problems == [], "\n".join(problems)
