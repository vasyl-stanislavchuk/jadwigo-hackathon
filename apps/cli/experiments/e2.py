"""Experiment E2 (dl-5ssh.90.53.4): the next lesson for each E1 learner.

Reads apps/docs/src/data/experiments/e1-cohort.json, turns each learner's brief
into needs, finds real bank sets by skill code in a jadwigo-bank checkout and
draws with jw.draw. With --judge, a panel of 3 muse-wonder judges (muse exec)
rates each learner's draw for fit. Writes apps/docs/src/data/experiments/e2.json.

Run:
  JADWIGO_BANK_DIR=~/projects/jadwigo-bank uv run python experiments/e2.py [--judge]

Only item ids, set ids, skills and reasons are written out: no bank question
text enters this repo. Bank search here is a local page scan by skill code, so
its spend is $0; the hosted search (OpenAI/Voyage embeddings) is not called.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from jw.draw import draw  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
COHORT = ROOT / "apps/docs/src/data/experiments/e1-cohort.json"
OUT = ROOT / "apps/docs/src/data/experiments/e2.json"
TODAY = dt.date(2026, 11, 2)  # E1 start 2026-10-12 plus 21 days
KIND_FOR = {"reteach": "practice", "new": "practice", "review": "review", "recheck": "check"}
MAX_ENTRIES = 3  # one next lesson: the first 3 brief entries that draw questions
JUDGE_MODEL = "muse-wonder-full-1.0"


def bank_dir() -> Path:
    return Path(os.environ.get("JADWIGO_BANK_DIR", "~/projects/jadwigo-bank")).expanduser()


def load_pages(root: Path) -> list[dict[str, Any]]:
    pages = []
    for path in sorted(root.glob("sets/**/set_*.json")):
        pages.append(json.loads(path.read_text(encoding="utf-8")))
    return pages


def page_skills(page: dict[str, Any]) -> list[str]:
    return list(((page.get("enrichment") or {}).get("skill_ids") or {}).get("value") or [])


def sets_for(pages: list[dict[str, Any]], skill: str) -> list[dict[str, Any]]:
    return [p for p in pages if skill in page_skills(p)]


def draw_for_learner(learner: dict[str, Any], pages: list[dict[str, Any]]) -> dict[str, Any]:
    entries = []
    seen_items: set[str] = set()
    total = 0
    with_questions = 0
    for entry in learner["brief"]["entries"]:
        if with_questions >= MAX_ENTRIES:
            break
        skill = entry["skill_code"]
        kind = KIND_FOR.get(entry["list"], "practice")
        found = sets_for(pages, skill)
        if not found:
            entries.append(
                {
                    "skill_code": skill,
                    "list": entry["list"],
                    "why": entry["why"],
                    "kind": kind,
                    "sets_found": 0,
                    "questions": [],
                    "left_out": [{"id": skill, "reason": "no bank set carries this skill code"}],
                }
            )
            continue
        envelope = {
            "rows": [
                {"id": p["id"], "rank": i + 1, "skill_ids": page_skills(p)}
                for i, p in enumerate(found)
            ]
        }
        result = draw(
            envelope, {p["id"]: p for p in found}, kind=kind, language="pl", today=TODAY
        )
        questions = []
        for q in result.questions:
            if q.item_id in seen_items:
                continue
            seen_items.add(q.item_id)
            questions.append(
                {
                    "item_id": q.item_id,
                    "set_id": q.set_id,
                    "problem_type": q.problem_type,
                    "skills": list(q.skills),
                    "reason": q.reason,
                }
            )
        total += len(questions)
        if questions:
            with_questions += 1
        entries.append(
            {
                "skill_code": skill,
                "list": entry["list"],
                "why": entry["why"],
                "kind": kind,
                "rule_settled": result.rule_settled,
                "sets_found": len(found),
                "questions": questions,
                "left_out": [{"id": left.id, "reason": left.reason} for left in result.left_out],
            }
        )
    return {
        "label": learner["label"],
        "profile": learner["profile"],
        "blurb": learner["blurb"],
        "mastery": learner["mastery"],
        "brief_entries_considered": len(entries),
        "brief_entries_total": len(learner["brief"]["entries"]),
        "questions_drawn": total,
        "entries": entries,
    }


def judge_prompt(result: dict[str, Any]) -> str:
    mastery = ", ".join(f"{m['skill_code']}={m['level']}" for m in result["mastery"])
    drawn = "; ".join(
        f"{e['skill_code']} ({e['list']}): {len(e['questions'])} questions from "
        f"{e['sets_found']} sets"
        for e in result["entries"]
    )
    return (
        "You judge whether a drawn next lesson fits one invented learner. "
        "Answer with one JSON object only: {\"fit\": <1-5>, \"reason\": \"<one sentence>\"}.\n"
        f"Learner profile: {result['profile']} - {result['blurb']}\n"
        f"Mastery: {mastery}\n"
        f"Drawn: {drawn}\n"
        f"Total questions: {result['questions_drawn']}"
    )


def run_judge(prompt: str) -> dict[str, Any]:
    proc = subprocess.run(
        ["muse", "exec", "--model", JUDGE_MODEL, prompt],
        capture_output=True,
        text=True,
        timeout=600,
    )
    match = re.search(r"\{.*\}", proc.stdout, re.S)
    if proc.returncode != 0 or match is None:
        return {"fit": None, "reason": f"judge failed: {proc.stderr[-300:]}"}
    try:
        got = json.loads(match.group(0))
        return {"fit": got.get("fit"), "reason": str(got.get("reason", ""))}
    except json.JSONDecodeError:
        return {"fit": None, "reason": "judge reply was not JSON"}


def main() -> int:
    judge = "--judge" in sys.argv
    t0 = time.time()
    cohort = json.loads(COHORT.read_text(encoding="utf-8"))
    pages = load_pages(bank_dir())
    results = [draw_for_learner(learner, pages) for learner in cohort["learners"]]
    judge_calls = 0
    if judge:
        from concurrent.futures import ThreadPoolExecutor

        prompts = [(r, judge_prompt(r)) for r in results for _ in range(3)]
        with ThreadPoolExecutor(max_workers=6) as pool:
            verdicts = list(pool.map(lambda pair: run_judge(pair[1]), prompts))
        judge_calls = len(verdicts)
        for i, result in enumerate(results):
            panel = verdicts[i * 3 : i * 3 + 3]
            fits = [p["fit"] for p in panel if isinstance(p.get("fit"), (int, float))]
            result["panel"] = panel
            result["panel_mean_fit"] = round(sum(fits) / len(fits), 2) if fits else None
    out = {
        "id": "e2",
        "title": "The next lesson drawn for each invented learner",
        "model": JUDGE_MODEL if judge else None,
        "calls": judge_calls,
        "tokens": {"input": None, "output": None},
        "usd": 0,
        "cost_source": (
            "bank draw $0 (local page scan of a jadwigo-bank checkout, no hosted "
            "search); judge calls on the Muse subscription via muse exec, token "
            "counts not exported per call - see commands"
        ),
        "wall_s": round(time.time() - t0, 2),
        "commit": subprocess.run(
            ["git", "rev-parse", "HEAD"], capture_output=True, text=True, cwd=ROOT
        ).stdout.strip(),
        "commands": [
            "JADWIGO_BANK_DIR=~/projects/jadwigo-bank uv run python experiments/e2.py --judge"
        ],
        "bank_pages_scanned": len(pages),
        "today": TODAY.isoformat(),
        "max_brief_entries_per_lesson": MAX_ENTRIES,
        "results": results,
    }
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT}: {len(results)} learners, {judge_calls} judge calls")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
