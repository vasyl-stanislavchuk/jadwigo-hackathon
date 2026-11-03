"""Experiment E2 (dl-5ssh.90.53.4): the next lesson for each E1 learner.

Reads the cohort in apps/docs/src/data/experiments/e1.json (detail.learners),
turns each learner's brief into needs, finds real bank sets by skill code in a
jadwigo-bank checkout and draws with jw.draw. With --judge, a panel of 3
muse-spark-1.3-contributor judges rates each draw for fit. Every model call
goes through the Meta API via jw.muse.ask and its ledger (owner decision,
2026-11-03). The first run's muse-wonder panel, made before that rule, is kept
under detail.wonder_comparison: its recorded extract is committed beside this
script (e2-wonder-panel.json) and read by default, or named with --wonder-panel.
Writes apps/docs/src/data/experiments/e2.json.

Run:
  JADWIGO_BANK_DIR=~/projects/jadwigo-bank JADWIGO_MUSE_CAP_USD=500 uv run python experiments/e2.py --judge

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
COHORT = ROOT / "apps/docs/src/data/experiments/e1.json"
OUT = ROOT / "apps/docs/src/data/experiments/e2.json"
TODAY = dt.date(2026, 11, 2)  # E1 start 2026-10-12 plus 21 days
KIND_FOR = {"reteach": "practice", "new": "practice", "review": "review", "recheck": "check"}
MAX_ENTRIES = 3  # one next lesson: the first 3 brief entries that draw questions
JUDGE_MODEL = "muse-spark-1.3-contributor"


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
    from jw import muse
    from jw.pii import guard

    try:
        text = str(muse.ask(guard(prompt), tag="e2:judge", effort="low"))
    except Exception as error:  # a failed judge is recorded, not fatal
        return {"fit": None, "reason": f"judge failed: {error}"[:300]}
    match = re.search(r"\{.*\}", text, re.S)
    if match is None:
        return {"fit": None, "reason": "judge reply had no JSON"}
    try:
        got = json.loads(match.group(0))
        return {"fit": got.get("fit"), "reason": str(got.get("reason", ""))}
    except json.JSONDecodeError:
        return {"fit": None, "reason": "judge reply was not JSON"}


def panel_mean(panel: list[dict[str, Any]]) -> float | None:
    """The panel's mean fit, ignoring judges that gave none; None when none did."""
    fits = [p["fit"] for p in panel if isinstance(p.get("fit"), (int, float))]
    return round(sum(fits) / len(fits), 2) if fits else None


def ledger_spend(since: str) -> dict[str, Any]:
    """This run's ledger rows only: e2-tagged, completed, at or after `since` (an ISO instant)."""
    total = {"calls": 0, "usd": 0.0, "input_tokens": 0, "output_tokens": 0}
    for path in sorted((ROOT / "apps/cli/logs/muse").glob("*.jsonl")):
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if (
                str(row.get("tag", "")).startswith("e2:")
                and row.get("terminal") == "completed"
                and str(row.get("at", "")) >= since
            ):
                usage = row.get("usage") or {}
                total["calls"] += 1
                total["usd"] += float(usage.get("usd") or 0)
                total["input_tokens"] += int(usage.get("input_tokens") or 0)
                total["output_tokens"] += int(usage.get("output_tokens") or 0)
    total["usd"] = round(total["usd"], 4)
    return total


RUN_STARTED = ""


def main() -> int:
    global RUN_STARTED
    import datetime as dt

    RUN_STARTED = dt.datetime.now(dt.timezone.utc).isoformat()
    judge = "--judge" in sys.argv
    t0 = time.time()
    cohort = json.loads(COHORT.read_text(encoding="utf-8"))["detail"]
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
            result["panel"] = panel
            result["panel_mean_fit"] = panel_mean(panel)
    ledger = ledger_spend(RUN_STARTED)
    drawn = sum(r["questions_drawn"] for r in results)
    empty = sum(1 for r in results if r["questions_drawn"] == 0)
    fits = [r["panel_mean_fit"] for r in results if r.get("panel_mean_fit") is not None]
    out = {
        "id": "e2",
        "title": "The next lesson drawn for each invented learner",
        "status": "done",
        "model": JUDGE_MODEL if judge else "none",
        "calls": ledger["calls"],
        "tokens": {"input": ledger["input_tokens"], "output": ledger["output_tokens"]},
        "usd": ledger["usd"],
        "cost_source": "ledger",
        "wall_s": round(time.time() - t0, 2),
        "commit": subprocess.run(
            ["git", "rev-parse", "HEAD"], capture_output=True, text=True, cwd=ROOT
        ).stdout.strip(),
        "commands": [
            "cd apps/cli && JADWIGO_BANK_DIR=~/projects/jadwigo-bank JADWIGO_MUSE_CAP_USD=500 uv run python experiments/e2.py --judge"
        ],
        "results": [
            {"label": "Learners", "value": len(results)},
            {"label": "Questions drawn", "value": drawn},
            {"label": "Learners with an empty lesson", "value": empty},
            {"label": "Bank pages scanned", "value": len(pages)},
            {
                "label": "Panel mean fit (of 5)",
                "value": round(sum(fits) / len(fits), 2) if fits else 0,
            },
        ],
        "detail": {
            "cost_note": (
                "Draw $0: a local page scan of a jadwigo-bank checkout, no hosted search. "
                "Judges through the Meta API on muse-spark-1.3-contributor via jw.muse.ask; "
                "tokens and USD from apps/cli/logs/muse rows tagged e2:*."
            ),
            "today": TODAY.isoformat(),
            "max_brief_entries_per_lesson": MAX_ENTRIES,
            "ledger": ledger,
            "results": results,
        },
    }
    wonder = (
        Path(sys.argv[sys.argv.index("--wonder-panel") + 1])
        if "--wonder-panel" in sys.argv
        else Path(__file__).resolve().parent / "e2-wonder-panel.json"
    )
    if wonder.exists():
        out["detail"]["wonder_comparison"] = json.loads(wonder.read_text(encoding="utf-8"))
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT}: {len(results)} learners, {judge_calls} judge calls")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
