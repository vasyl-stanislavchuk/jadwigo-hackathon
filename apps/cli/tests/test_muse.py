"""dl-e8ov.5.2.19: jw.muse against a fake muse binary.

The fake is a script named `muse` put first on PATH. It records its argv, its stdin and whether it
saw ANTHROPIC_API_KEY, writes the prompt it was given beside them, and answers with muse's own
`--json` records (run.output.delta, run.usage, run.terminal.completed), shaped as `muse exec
--provider echo --json` prints them. No test reaches the network or spends.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import stat
import sys
from pathlib import Path
from typing import Any

import pytest

from jw import explain, muse
from jw.draw import History, draw
from jw.pii import GuardedPrompt, guard, leaks

FAKE = r"""#!{python}
import json, os, sys
from pathlib import Path
out = Path(os.environ["FAKE_MUSE_DIR"])
argv = sys.argv[1:]
prompt = Path(argv[argv.index("--prompt-file") + 1]).read_text(encoding="utf-8")
stdin = sys.stdin.read() if "--api-key-stdin" in argv else ""
calls = out / "calls.jsonl"
n = len(calls.read_text().splitlines()) if calls.exists() else 0
with calls.open("a") as fh:
    fh.write(json.dumps({{"argv": argv, "stdin": stdin, "prompt": prompt,
                         "anthropic": "ANTHROPIC_API_KEY" in os.environ}}) + "\n")
mode = os.environ.get("FAKE_MUSE_MODE", "ok")
def emit(kind, payload):
    print(json.dumps({{"payload_type": kind, "payload": payload}}), flush=True)
if mode == "429" and n == 0:
    reason = "HTTP 429 Too Many Requests"
    emit("run.terminal.failed", {{"terminal": "failed", "text": "", "reason": reason}})
    sys.exit(1)
if mode == "fail":
    emit("run.terminal.failed", {{"terminal": "failed", "text": "", "reason": "model error"}})
    sys.exit(1)
for chunk in ["Dzisiaj [NA", "ME_1] ćwiczy dodawanie. ", "Brawo, [NAME_1]!"]:
    emit("run.output.delta", {{"text": chunk}})
emit("run.usage", {{"models": [{{"model": "muse-spark-1.3-contributor", "input_tokens": 1200,
     "cached_tokens": 200, "output_tokens": 300, "reasoning_tokens": 50, "calls": 1}}]}})
emit("run.terminal.completed", {{"terminal": "completed", "text": "full text", "reason": None}})
"""

# 1000 fresh input tokens at $0.10/M, 200 cached at $0.002/M, 300 output at $0.20/M.
USD = round((1000 * 0.10 + 200 * 0.002 + 300 * 0.20) / 1e6, 6)
KEY = "fake-meta-key-for-tests"


@pytest.fixture
def fake(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    script = bin_dir / "muse"
    script.write_text(FAKE.format(python=sys.executable), encoding="utf-8")
    script.chmod(script.stat().st_mode | stat.S_IEXEC)
    record = tmp_path / "record"
    record.mkdir()
    key_file = tmp_path / "muse.env"
    key_file.write_text(f"export META_API_KEY='{KEY}'\n", encoding="utf-8")
    monkeypatch.setenv("PATH", f"{bin_dir}{os.pathsep}{os.environ['PATH']}")
    monkeypatch.setenv("FAKE_MUSE_DIR", str(record))
    monkeypatch.setenv("ANTHROPIC_API_KEY", "must-never-reach-muse")
    monkeypatch.setenv(muse.SHARED_LOG_ENV, str(tmp_path / "shared"))
    monkeypatch.delenv(muse.LANE_CAP_ENV, raising=False)
    monkeypatch.setattr(muse, "LOG_DIR", tmp_path / "own")
    monkeypatch.setattr(muse, "KEY_FILE", key_file)
    monkeypatch.setattr(muse.time, "sleep", lambda _s: None)
    return record


def _calls(record: Path) -> list[dict[str, Any]]:
    path = record / "calls.jsonl"
    return [json.loads(line) for line in path.read_text().splitlines()] if path.exists() else []


def _ledger(directory: Path) -> list[dict[str, Any]]:
    return [
        json.loads(line) for p in directory.glob("*.jsonl") for line in p.read_text().splitlines()
    ]


def _seed(directory: Path, tag: str, usd: float) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    row = {"tag": tag, "model": muse.SPARK_CONTRIBUTOR, "usage": {"usd": usd}}
    (directory / "2026-10-28.jsonl").open("a").write(json.dumps(row) + "\n")


def test_a_lesson_explanation_streams_with_names_restored_and_the_ledger_row_lands(
    fake: Path, tmp_path: Path
) -> None:
    bank = Path(__file__).resolve().parent / "fixtures" / "bank"
    pages = {p.stem: json.loads(p.read_text()) for p in (bank / "sets").glob("*.json")}
    envelope = {"rows": [{"id": "set_khan_2002", "rank": 1}]}
    drawn = draw(envelope, pages, kind="practice", history=History(), today=dt.date(2026, 10, 28))

    chunks = list(
        explain.explain("Kasia", drawn, pages, names=["kasia"], parent_note="Kasia lubi zakupy.")
    )

    assert len(chunks) >= 2  # streamed, not one block
    assert "".join(chunks) == "Dzisiaj Kasia ćwiczy dodawanie. Brawo, Kasia!"
    (call,) = _calls(fake)
    assert leaks(call["prompt"], ["Kasia"]) == [] and "[NAME_1]" in call["prompt"]
    for directory in (tmp_path / "own", tmp_path / "shared"):
        (row,) = _ledger(directory)
        assert row["tag"] == "product:explain"
        assert row["model"] == muse.SPARK_CONTRIBUTOR
        assert row["terminal"] == "completed" and row["billing"] == "api"
        assert row["usage"]["usd"] == USD
        assert {"effort", "attempt", "seconds", "at", "id"} <= set(row)
    assert muse.spent("product") == USD  # one row in two ledgers counts once


def test_the_key_goes_on_stdin_never_argv_and_the_anthropic_key_is_stripped(fake: Path) -> None:
    assert muse.ask(guard("Policz 27 + 45."), tag="product:test") == (
        "Dzisiaj [NAME_1] ćwiczy dodawanie. Brawo, [NAME_1]!"
    )
    (call,) = _calls(fake)
    assert call["stdin"] == KEY
    assert KEY not in " ".join(call["argv"])
    assert call["anthropic"] is False
    argv = call["argv"]
    assert argv[argv.index("--model") + 1] == muse.SPARK_CONTRIBUTOR
    assert argv[argv.index("--contributor-mode") + 1] == "on"
    assert "--api-key-stdin" in argv and "--disable-shell" in argv


def test_without_a_key_file_the_call_bills_the_subscription(
    fake: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(muse, "KEY_FILE", tmp_path / "absent.env")
    muse.ask(guard("x"), tag="product:test")
    (call,) = _calls(fake)
    assert "--api-key-stdin" not in call["argv"]
    assert _ledger(tmp_path / "own")[0]["billing"] == "subscription"


def test_a_call_past_the_lane_cap_is_refused_with_the_lane_named(
    fake: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv(muse.LANE_CAP_ENV, "1")
    _seed(tmp_path / "shared", "product:earlier", 0.6)
    _seed(tmp_path / "own", "product:earlier2", 0.4)
    _seed(tmp_path / "shared", "enrich:set_x", 5.0)  # another lane's spend is not ours
    with pytest.raises(muse.BudgetExceeded, match=r"lane product has spent \$1.00 of its \$1.00"):
        muse.ask(guard("x"), tag="product:explain")
    assert _calls(fake) == []


def test_a_call_past_the_hackathon_total_is_refused(fake: Path, tmp_path: Path) -> None:
    _seed(tmp_path / "shared", "enrich:a", 100.0)
    _seed(tmp_path / "shared", "eval:b", 50.0)
    with pytest.raises(muse.BudgetExceeded, match=r"\$150 cap; lane product refused"):
        muse.ask(guard("x"), tag="product:explain")
    assert _calls(fake) == []


def test_only_a_sealed_prompt_and_only_the_contributor_model(fake: Path) -> None:
    with pytest.raises(muse.PromptNotGuarded):
        muse.ask("Kasia", tag="product:x")  # type: ignore[call-overload]
    with pytest.raises(muse.PromptNotGuarded):
        muse.ask(GuardedPrompt(text="Kasia", replacements={}), tag="product:x")
    with pytest.raises(muse.ModelNotAllowed):
        muse.ask(guard("x"), tag="product:x", model="muse-spark-1.3")
    assert _calls(fake) == []


def test_a_429_backs_off_longer_and_retries(
    fake: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    waits: list[float] = []
    monkeypatch.setattr(muse.time, "sleep", waits.append)
    monkeypatch.setenv("FAKE_MUSE_MODE", "429")
    assert "Brawo" in muse.ask(guard("x"), tag="product:test")
    assert [w for w in waits if w >= 1] == [15]  # subprocess also naps for a millisecond
    rows = _ledger(tmp_path / "own")
    assert [r["terminal"] for r in sorted(rows, key=lambda r: r["attempt"])] == [
        "failed",
        "completed",
    ]


def test_a_run_that_never_completes_raises(fake: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FAKE_MUSE_MODE", "fail")
    with pytest.raises(muse.MuseFailed, match="model error"):
        muse.ask(guard("x"), tag="product:test", retries=1)
    assert len(_calls(fake)) == 2
