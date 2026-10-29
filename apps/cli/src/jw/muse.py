"""The product's one way to call a model: the contributor model through muse (dl-e8ov.5.2.19).

Mirrors jadwigo-bank tools/muse_call.py, which the bank lanes call, so the two sides behave alike:

- **One model** (jadwigo-question-bank/decisions/2026-10-28-one-model-spark-contributor-for-every-
  bank-and-product-call-user). `ask` refuses any model but `muse-spark-1.3-contributor`, and runs
  it with contributor mode on.
- **The key on stdin.** The Meta key is read from ~/.config/jadwigo-bank/muse.env and handed to
  muse with `--api-key-stdin`. It is never on argv, in a log or in an error. Without the file the
  call falls back to the subscription, and the ledger row says so. The child process never sees
  the Anthropic key.
- **One budget** (2026-10-28-the-muse-budget-is-150-dollars-for-the-hackathon-capped-per-lane).
  Each call writes the bank's ledger record (tag, model, effort, attempt, terminal, billing,
  seconds, usage with tokens and USD, at) to logs/muse/<day>.jsonl, and to JADWIGO_MUSE_LOG_DIR
  when it is set, so the bank's `muse_call.py --spent` sums product calls with its own. Before each
  call both ledgers are read: a call is refused with BudgetExceeded once the lane (the tag's first
  segment, `product` in `product:explain`) has reached JADWIGO_MUSE_CAP_USD, or every lane together
  has reached $150.
- **Only guarded prompts.** `ask` takes a `jw.pii.GuardedPrompt` sealed by `jw.pii.guard`, never a
  string, because the contributor model trains on what it is sent.
- **Streaming.** `stream=True` returns an iterator over the model's text as muse emits it
  (`run.output.delta` records), so a page can show model text after the search rows.

Flags follow the bank's `argv`: no shell, no write, no web tools, untrusted approval with the judge
off (without it a headless run waits on an approval nobody gives), restricted network.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import subprocess
import tempfile
import time
import uuid
from collections.abc import Iterator
from pathlib import Path
from typing import Any, Literal, overload

from jw.errors import JwError
from jw.pii import GuardedPrompt

# apps/cli in this repo; jw runs from the checkout through uv.
APP_ROOT = Path(__file__).resolve().parents[2]
# jw's own ledger (apps/cli/.gitignore lists logs/).
LOG_DIR = APP_ROOT / "logs" / "muse"
# The hackathon ledger every lane writes to (the bank's main checkout runs/muse).
SHARED_LOG_ENV = "JADWIGO_MUSE_LOG_DIR"
LANE_CAP_ENV = "JADWIGO_MUSE_CAP_USD"

SPARK_CONTRIBUTOR = "muse-spark-1.3-contributor"
DEFAULT_MODEL = SPARK_CONTRIBUTOR
ALLOWED_MODELS = frozenset({SPARK_CONTRIBUTOR})
KEY_FILE, KEY_NAME = Path.home() / ".config" / "jadwigo-bank" / "muse.env", "META_API_KEY"
TOTAL_CAP_USD = 150.0

# USD per 1M tokens, the bank's PRICES (the Spark 1.3 Contributor model card, 2026-10-28).
PRICES = {SPARK_CONTRIBUTOR: {"input": 0.10, "cached": 0.002, "output": 0.20}}


class MuseFailed(JwError):
    default_hint = "The model run did not complete; the ledger row in logs/muse says why."


class ModelNotAllowed(JwError):
    default_hint = f"Every product call runs on {SPARK_CONTRIBUTOR}."


class BudgetExceeded(JwError):
    default_hint = "The call was not made. Raise the lane's cap only with the owner's say-so."


class PromptNotGuarded(JwError):
    default_hint = "Pass the prompt through jw.pii.guard() first."


# ---------------------------------------------------------------- key -------


def api_key() -> str:
    """The Meta key from the private key file, or "" (then muse bills the subscription)."""
    if not KEY_FILE.exists():
        return ""
    for line in KEY_FILE.read_text(encoding="utf-8").splitlines():
        name, _, value = line.strip().removeprefix("export ").partition("=")
        if name == KEY_NAME:
            return value.strip().strip("'\"")
    return ""


def child_env() -> dict[str, str]:
    """The environment muse runs in: ours, less the Anthropic key."""
    return {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}


def argv(
    prompt_file: Path, model: str, effort: str, steps: int, key_on_stdin: bool = False
) -> list[str]:
    """The bank's muse_call.argv without --output-schema: the product asks for text."""
    cmd = ["muse", "exec", "--prompt-file", str(prompt_file), "--model", model]
    cmd += ["--reasoning-effort", effort]
    if model.endswith("-contributor"):
        cmd += ["--contributor-mode", "on"]
    if key_on_stdin:
        cmd += ["--api-key-stdin"]
    return [
        *cmd,
        "--json",
        "--no-session-log",
        "--disable-web-tools",
        "--no-foreign-personal-context",
        "--disable-shell",
        "--disable-write",
        "--approval-mode",
        "untrusted",
        "--approval-judge",
        "off",
        "--sandbox-network",
        "restricted",
        "--max-model-steps",
        str(steps),
    ]


# ---------------------------------------------------------------- parse -----


def _priced(models: list[dict[str, Any]]) -> dict[str, Any]:
    """Sum token counts across the run's models and price the ones PRICES knows (bank `_priced`)."""
    out: dict[str, Any] = {
        "input_tokens": 0,
        "cached_tokens": 0,
        "output_tokens": 0,
        "reasoning_tokens": 0,
        "usd": 0.0,
    }
    for m in models:
        for k in ("input_tokens", "cached_tokens", "output_tokens", "reasoning_tokens"):
            out[k] += int(m.get(k) or 0)
        price = PRICES.get(m.get("model") or "")
        if price:
            cached = int(m.get("cached_tokens") or 0)
            fresh = int(m.get("input_tokens") or 0) - cached
            out["usd"] += (
                fresh * price["input"]
                + cached * price["cached"]
                + int(m.get("output_tokens") or 0) * price["output"]
            ) / 1e6
    out["usd"] = round(out["usd"], 6)
    return out


class _Run:
    """What one muse run said, read record by record from its `--json` stdout."""

    def __init__(self) -> None:
        self.terminal = ""
        self.text = ""
        self.usage: dict[str, Any] = {}

    def feed(self, line: str) -> str:
        """Take one stdout line; return the text it adds to the answer ("" for most records)."""
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            return ""
        if not isinstance(record, dict):
            return ""
        kind = record.get("payload_type", "")
        payload = record.get("payload") or {}
        if kind == "run.usage" and payload.get("models"):
            self.usage = _priced(payload["models"])
        elif kind == "run.output.delta":
            return str(payload.get("text") or "")
        elif "terminal" in kind:
            self.terminal = payload.get("terminal") or ""
            self.text = payload.get("text") or ""
            if self.terminal != "completed":
                self.text = payload.get("reason") or self.text
        return ""


# ---------------------------------------------------------------- ledger ----


def lane_of(tag: str) -> str:
    """The lane a tag belongs to: its first `:`-separated segment, or "" for an untagged call."""
    return (tag or "").split(":", 1)[0]


def log_dirs() -> list[Path]:
    """The ledgers this client writes and reads: its own, then the shared one when set."""
    dirs = [LOG_DIR]
    shared = os.environ.get(SHARED_LOG_ENV)
    if shared and Path(shared).resolve() != LOG_DIR.resolve():
        dirs.append(Path(shared))
    return dirs


def _rows() -> Iterator[dict[str, Any]]:
    """Every ledger row once: a product row is in both ledgers, under one `id`."""
    seen: set[str] = set()
    for directory in log_dirs():
        for path in sorted(directory.glob("*.jsonl")):
            for line in path.read_text(encoding="utf-8").splitlines():
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if not isinstance(row, dict):
                    continue
                rid = row.get("id")
                if rid:
                    if rid in seen:
                        continue
                    seen.add(rid)
                yield row


def spent(lane: str | None = None) -> float:
    """USD logged so far in both ledgers, for one lane or (None) for every call."""
    total = 0.0
    for row in _rows():
        if lane is not None and lane_of(row.get("tag", "")) != lane:
            continue
        total += float((row.get("usage") or {}).get("usd") or 0.0)
    return round(total, 6)


def lane_cap() -> float | None:
    raw = os.environ.get(LANE_CAP_ENV, "").strip()
    return float(raw) if raw else None


def check_budget(tag: str) -> None:
    """Raise BudgetExceeded when the lane's cap or the hackathon total is already reached."""
    lane = lane_of(tag) or "(untagged)"
    total = spent()
    if total >= TOTAL_CAP_USD:
        raise BudgetExceeded(
            f"hackathon total ${total:.2f} has reached the ${TOTAL_CAP_USD:.0f} cap; "
            f"lane {lane} refused"
        )
    cap = lane_cap()
    if cap is not None:
        used = spent(lane_of(tag))
        if used >= cap:
            raise BudgetExceeded(
                f"lane {lane} has spent ${used:.2f} of its ${cap:.2f} cap ({LANE_CAP_ENV}); "
                f"call refused, total ${total:.2f}"
            )


def _log(row: dict[str, Any]) -> None:
    row["id"] = uuid.uuid4().hex
    row["at"] = dt.datetime.now(dt.UTC).isoformat(timespec="seconds")
    line = json.dumps(row, ensure_ascii=False) + "\n"
    for directory in log_dirs():
        directory.mkdir(parents=True, exist_ok=True)
        with (directory / f"{row['at'][:10]}.jsonl").open("a", encoding="utf-8") as fh:
            fh.write(line)


def _rate_limited(text: str) -> bool:
    low = (text or "").lower()
    return any(s in low for s in ("429", "rate limit", "rate-limit", "too many requests"))


# ---------------------------------------------------------------- call ------


@overload
def ask(
    prompt: GuardedPrompt,
    *,
    tag: str,
    effort: str = ...,
    stream: Literal[False] = ...,
    model: str = ...,
    steps: int = ...,
    timeout: float = ...,
    retries: int = ...,
) -> str: ...
@overload
def ask(
    prompt: GuardedPrompt,
    *,
    tag: str,
    effort: str = ...,
    stream: Literal[True],
    model: str = ...,
    steps: int = ...,
    timeout: float = ...,
    retries: int = ...,
) -> Iterator[str]: ...
def ask(
    prompt: GuardedPrompt,
    *,
    tag: str,
    effort: str = "low",
    stream: bool = False,
    model: str = DEFAULT_MODEL,
    steps: int = 3,
    timeout: float = 300,
    retries: int = 2,
) -> str | Iterator[str]:
    """Run one guarded prompt on the contributor model; return its text, or stream it.

    The text still holds the guard's placeholders: `jw.pii.restore` (or `restore_stream`) puts the
    names back. Raises PromptNotGuarded, ModelNotAllowed and BudgetExceeded before any call, and
    MuseFailed when no attempt completes.
    """
    if not isinstance(prompt, GuardedPrompt) or not prompt.sealed:
        raise PromptNotGuarded("jw.muse.ask takes only a prompt sealed by jw.pii.guard")
    if model not in ALLOWED_MODELS:
        raise ModelNotAllowed(
            f"{model!r} is not allowed; every product call runs on {SPARK_CONTRIBUTOR}"
        )
    if not tag:
        raise JwError("a Muse call needs a tag", hint="Tag it <lane>:<what>, e.g. product:explain.")
    check_budget(tag)
    chunks = _attempts(prompt.text, tag, model, effort, steps, timeout, retries)
    return chunks if stream else "".join(chunks)


def _attempts(
    text: str, tag: str, model: str, effort: str, steps: int, timeout: float, retries: int
) -> Iterator[str]:
    key = api_key()
    last = ""
    for attempt in range(retries + 1):
        if attempt:
            check_budget(tag)  # a failed attempt can still have spent
        run = _Run()
        emitted = False
        started = time.monotonic()
        with tempfile.TemporaryDirectory(prefix="jw-muse-") as work:
            prompt_file = Path(work) / "prompt.txt"
            prompt_file.write_text(text, encoding="utf-8")
            proc = subprocess.Popen(
                argv(prompt_file, model, effort, steps, key_on_stdin=bool(key)),
                cwd=work,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True,
                env=child_env(),
            )
            assert proc.stdin is not None and proc.stdout is not None
            try:
                if key:
                    proc.stdin.write(key)
                proc.stdin.close()
                for line in proc.stdout:
                    delta = run.feed(line)
                    if delta:
                        emitted = True
                        yield delta
                    if time.monotonic() - started > timeout:
                        proc.kill()
                        run.terminal, run.text = "timeout", f"no answer in {timeout:g}s"
                        break
                proc.wait(timeout=10)
            finally:
                if proc.poll() is None:
                    proc.kill()
                    proc.wait()
        _log(
            {
                "tag": tag,
                "model": model,
                "effort": effort,
                "attempt": attempt,
                "terminal": run.terminal,
                "billing": "api" if key else "subscription",
                "seconds": round(time.monotonic() - started, 1),
                "usage": run.usage,
            }
        )
        if run.terminal == "completed":
            if not emitted and run.text:
                yield run.text  # a muse that sends no deltas still answers
            return
        last = f"{run.terminal or 'no terminal record'}: {run.text[:300]}"
        if emitted:
            break  # the caller has text from this attempt; a retry would repeat it
        # The contributor tier is rate-limited by tokens: back off longer on a 429.
        time.sleep((15 if _rate_limited(run.text) else 2) * (attempt + 1))
    raise MuseFailed(last)
