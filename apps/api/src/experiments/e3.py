"""Experiment E3 (dl-5ssh.90.53.5): dream over each E1 learner, write the narrative
with muse-spark-1.3-contributor, score it with narrative_check, then 3 blind
judges on the same contributor model.

Every model call goes through the Meta API via jw's product client and its
ledger (owner decision, 2026-11-03: all scripted experiment calls run through
the contributor models on the API). The first run's muse-wonder narratives and
panel, made before that rule, are kept under detail.wonder_comparison when the
recorded extract is passed as the second argument, for a brief comparison; no
new wonder call is made.

Prereq: the loader has run and printed the learner ids:
  DATABASE_URL=postgresql://localhost:5433/jadwigo bun apps/api/src/experiments/e3-load.ts > /tmp/e3-learners.json

Run:
  DATABASE_URL=postgresql://localhost:5433/jadwigo JADWIGO_MUSE_CAP_USD=500 \
    uv run --project apps/cli python apps/api/src/experiments/e3.py /tmp/e3-learners.json

Writes apps/docs/src/data/experiments/e3.json. Work files (reports, narratives)
land in /tmp/e3-work and are reused on a re-run. The spark calls use purpose
"bank" with a guarded prompt: the digests are synthetic and hold no learner
name, while the product's "learner" purpose refuses the contributor model by
design (it trains). That choice and its reason go in the result JSON.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve()
ROOT = HERE.parents[4]
sys.path.insert(0, str(ROOT / "apps/cli/src"))
sys.path.insert(0, str(ROOT / "apps/cli/evals/report"))

from jw import muse  # noqa: E402
from jw.pii import guard  # noqa: E402
from narrative_check import findings  # noqa: E402

OUT = ROOT / "apps/docs/src/data/experiments/e3.json"
WORK = Path("/tmp/e3-work")
SKILL = ROOT / "workflows/jadwigo-report-write/SKILL.md"
SPARK = "muse-spark-1.3-contributor"
DB = os.environ.get("DATABASE_URL", "postgresql://localhost:5433/jadwigo")


def dream(learner_id: str) -> dict[str, Any]:
    path = WORK / f"report-{learner_id}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    proc = subprocess.run(
        ["bun", "apps/api/src/dream.ts", learner_id],
        cwd=ROOT,
        env={**os.environ, "DATABASE_URL": DB},
        capture_output=True,
        text=True,
        timeout=600,
    )
    if proc.returncode != 0:
        raise SystemExit(f"dream failed for {learner_id}: {proc.stderr[-400:]}")
    path.write_text(proc.stdout, encoding="utf-8")
    return json.loads(proc.stdout)


def narrative_prompt(report: dict[str, Any]) -> str:
    rules = SKILL.read_text(encoding="utf-8")
    return (
        "Follow the workflow below exactly. The report file it names is the JSON "
        "after the workflow. Do not run any command and do not save anything: "
        "reply with the narrative JSON object only, no code fence.\n\n"
        f"{rules}\n\nREPORT JSON:\n{json.dumps(report, ensure_ascii=False)}"
    )


def parse_narrative(text: str, model: str) -> dict[str, Any] | None:
    match = re.search(r"\{.*\}", text, re.S)
    if match is None:
        return None
    try:
        got = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    got["made_by"] = f"jadwigo-report-write/{model}"
    got.setdefault("language", "pl")
    return got


def spark_narrative(prompt: str) -> str:
    return str(muse.ask(guard(prompt), tag="e3:report-write", effort="medium"))


def spark_judge(prompt: str) -> str:
    return str(muse.ask(guard(prompt), tag="e3:judge", effort="low"))


def judge_prompt(digest: dict[str, Any], narrative: dict[str, Any]) -> str:
    return (
        "You judge a parent report narrative against the code-computed digest it "
        "was written from. You do not know which model wrote it. Reply with one "
        'JSON object only: {"accuracy": <1-5>, "warmth": <1-5>, '
        '"usefulness": <1-5>, "reason": "<one sentence>"}.\n'
        f"DIGEST:\n{json.dumps(digest, ensure_ascii=False)}\n"
        f"NARRATIVE:\n{json.dumps(narrative, ensure_ascii=False)}"
    )


def parse_judge(text: str) -> dict[str, Any]:
    match = re.search(r"\{.*\}", text, re.S)
    if match is None:
        return {"accuracy": None, "warmth": None, "usefulness": None, "reason": "no JSON"}
    try:
        got = json.loads(match.group(0))
        return {
            "accuracy": got.get("accuracy"),
            "warmth": got.get("warmth"),
            "usefulness": got.get("usefulness"),
            "reason": str(got.get("reason", "")),
        }
    except json.JSONDecodeError:
        return {"accuracy": None, "warmth": None, "usefulness": None, "reason": "bad JSON"}


RUN_STARTED = ""


def ledger_spend(since: str = "") -> dict[str, Any]:
    """Ledger rows tagged e3:*, completed, at or after `since`: this run's calls only."""
    total = {"calls": 0, "usd": 0.0, "input_tokens": 0, "output_tokens": 0}
    log_dir = ROOT / "apps/cli/logs/muse"
    for path in sorted(log_dir.glob("*.jsonl")):
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if (
                str(row.get("tag", "")).startswith("e3:")
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


def one_learner(entry: dict[str, Any]) -> dict[str, Any]:
    report = dream(entry["learner_id"])
    digest = report["digest"]
    prompt = narrative_prompt(report)
    cache = WORK / f"narrative-{entry['learner_id']}-spark.json"
    if cache.exists():
        narrative = json.loads(cache.read_text(encoding="utf-8"))
    else:
        narrative = parse_narrative(spark_narrative(prompt), SPARK)
        if narrative is None:  # one retry, then the empty result stands as a finding
            narrative = parse_narrative(spark_narrative(prompt), SPARK)
        cache.write_text(json.dumps(narrative, ensure_ascii=False), encoding="utf-8")
    if narrative is None:
        found = ["no JSON narrative"]
    else:
        try:
            found = findings(digest, narrative)
        except Exception as error:  # a malformed narrative is a finding, not a crash
            found = [f"malformed narrative: {error}"]
    return {
        "label": entry["label"],
        "profile": entry["profile"],
        "learner_id": entry["learner_id"],
        "digest": digest,
        "narrative": narrative,
        "findings": found,
    }


def main() -> int:
    global RUN_STARTED
    import datetime as dt

    RUN_STARTED = dt.datetime.now(dt.timezone.utc).isoformat()
    t0 = time.time()
    WORK.mkdir(parents=True, exist_ok=True)
    learners = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(one_learner, learners))
    # Blind panel: 3 contributor judges per narrative; the writer is never named.
    def judged(job: tuple[dict[str, Any], int]) -> dict[str, Any]:
        result, nth = job
        cache = WORK / f"judge2-{result['learner_id']}-{nth}.json"
        if cache.exists():
            return json.loads(cache.read_text(encoding="utf-8"))
        verdict = parse_judge(spark_judge(judge_prompt(result["digest"], result["narrative"])))
        cache.write_text(json.dumps(verdict, ensure_ascii=False), encoding="utf-8")
        return verdict

    with_panel = [r for r in results if r["narrative"] is not None]
    jobs = [(r, nth) for r in with_panel for nth in range(3)]
    with ThreadPoolExecutor(max_workers=4) as pool:
        verdicts = list(pool.map(judged, jobs))
    for i, r in enumerate(with_panel):
        panel = verdicts[i * 3 : i * 3 + 3]
        means = {}
        for key in ("accuracy", "warmth", "usefulness"):
            vals = [p[key] for p in panel if isinstance(p.get(key), (int, float))]
            means[key] = round(sum(vals) / len(vals), 2) if vals else None
        r["panel"] = panel
        r["panel_mean"] = means
    spark_ledger = ledger_spend(RUN_STARTED)
    clean = sum(1 for r in results if r["findings"] == [])
    panel_totals = {}
    for key in ("accuracy", "warmth", "usefulness"):
        vals = [r["panel_mean"][key] for r in with_panel if r.get("panel_mean", {}).get(key) is not None]
        panel_totals[key] = round(sum(vals) / len(vals), 2) if vals else None
    out = {
        "id": "e3",
        "title": "Dreaming over each invented learner: a contributor writes, contributors judge blind",
        "status": "done",
        "model": SPARK,
        "calls": spark_ledger["calls"],
        "tokens": {"input": spark_ledger["input_tokens"], "output": spark_ledger["output_tokens"]},
        "usd": spark_ledger["usd"],
        "cost_source": "ledger",
        "wall_s": round(time.time() - t0, 1),
        "commit": subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True
        ).stdout.strip(),
        "commands": [
            "DATABASE_URL=postgresql://localhost:5433/jadwigo bun apps/api/src/experiments/e3-load.ts > /tmp/e3-learners.json",
            "DATABASE_URL=postgresql://localhost:5433/jadwigo JADWIGO_MUSE_CAP_USD=500 uv run --project apps/cli python apps/api/src/experiments/e3.py /tmp/e3-learners.json",
        ],
        "results": [
            {"label": "Reports dreamed", "value": len(results)},
            {"label": "Narratives with no findings", "value": clean},
            {"label": "Panel accuracy (of 5)", "value": panel_totals["accuracy"]},
            {"label": "Panel warmth (of 5)", "value": panel_totals["warmth"]},
            {"label": "Panel usefulness (of 5)", "value": panel_totals["usefulness"]},
        ],
        "detail": {
            "judge_calls": len(jobs),
            "spark_ledger": spark_ledger,
            "cost_note": "Every call through the Meta API on muse-spark-1.3-contributor via jw.muse.ask; tokens and USD from apps/cli/logs/muse rows tagged e3:*.",
            "totals": {"narratives_with_no_findings": clean, "panel_mean": panel_totals},
            "results": results,
        },
    }
    wonder = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else Path(__file__).resolve().parent / "e3-wonder-legacy.json"
    )
    if wonder.exists():
        out["detail"]["wonder_comparison"] = json.loads(wonder.read_text(encoding="utf-8"))
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
