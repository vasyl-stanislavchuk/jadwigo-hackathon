"""What POST /v1/responses accepts: image input, JSON-schema output, function tools (dl-z5ja.3).

The owner runs it; it spends. No agent runs it live: an agent proves it with `--replay` or the
test (tests/test_muse_probe.py), neither of which reaches the network.

    cd apps/cli && JADWIGO_MUSE_CAP_USD=0.50 uv run --frozen python scripts/muse_probe.py --live
    cd apps/cli && uv run --frozen python scripts/muse_probe.py                  # the plan only
    cd apps/cli && uv run --frozen python scripts/muse_probe.py --replay FILE    # no network, no spend

Without `--live` it never reaches the network: lane agents hold the key file and often export a
cap, so a cap and a key are not consent to spend (as `scripts/smoke_ready.py --live`).

It runs 4 probes, each on every model it tries:

1. **Image input.** A synthetic worksheet this script draws (2 sums in a pixel font, no person, no
   name, no photo) as an `input_image` data URL, and the question "what are the answers".
2. **JSON-schema output.** `text.format` of type `json_schema`, strict, and a parse of the answer.
3. **Function tools.** One tool, a streamed first turn that should call it (the tool-call event
   types the stream carried are recorded), then the tool's output fed back as
   `function_call_output` in a second turn, which should answer in words.
4. **The no-training tier.** `GET /v1/models` (it answered 401 on 2026-09-19), then probes 1 to 3
   again on each candidate model in JADWIGO_MUSE_PRIVATE_CANDIDATES (comma-separated, default
   `muse-spark-1.3`, the id without `-contributor`). Whether a model trains on what it is sent is
   in Meta's terms, not in an API answer: the note leaves that line for the owner to fill.

What it keeps to:

- **The key** comes from `jw.muse.api_key()` (~/.config/jadwigo-bank/muse.env). It is only ever
  in a request header: never on argv, in a log, in the note or in an error.
- **The cap** is JADWIGO_MUSE_CAP_USD, read by `jw.muse`. The script refuses to start without it
  or above $2, checks the lane's spend before every call (`jw.muse.check_budget`) and writes one
  ledger row per call (`jw.muse._log`, lane `probe`). It refuses to start when the plan needs more
  than 12 calls (1 + 4 per model). A model jw.muse has no price for is priced at a placeholder,
  the contributor's price times 2, so the cap still counts it; the note marks it "unpriced,
  placeholder".
- **Any stop still writes.** A refused budget, the call limit or a transport error ends the run,
  and the note and the raw file are written with what ran, so nothing paid goes unrecorded.
- **Every prompt passes `jw.pii.guard`**, though none carries a name, and answers pass `restore`.

The note goes to docs/research/muse-responses-probe.md (or `--note PATH`) in the shape
tools/src/check-research.ts checks, and the raw answers to logs/probe/<at>.json.
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import json
import os
import struct
import sys
import time
import urllib.error
import urllib.request
import zlib
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

APP_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = APP_ROOT.parents[1]
sys.path.insert(0, str(APP_ROOT / "src"))

from jw import muse  # noqa: E402
from jw.pii import GuardedPrompt, guard, restore  # noqa: E402

BASE = "https://api.meta.ai/v1"
CONTRIBUTOR = muse.SPARK_CONTRIBUTOR
CANDIDATES_ENV = "JADWIGO_MUSE_PRIVATE_CANDIDATES"
DEFAULT_CANDIDATES = ("muse-spark-1.3",)
NOTE = REPO_ROOT / "docs" / "research" / "muse-responses-probe.md"
RAW_DIR = APP_ROOT / "logs" / "probe"
EFFORT = "low"
MAX_CALLS = 12
CALLS_PER_MODEL = 4  # image, schema, and the 2 turns of the tools probe
# A model jw.muse has no price for is charged at this multiple of the contributor's price.
PLACEHOLDER_FACTOR = 2
MAX_CAP_USD = 2.0
MAX_OUTPUT_TOKENS = 1500
LANE = "probe"

# ---------------------------------------------------------------- transport --


@dataclass
class Answer:
    """One HTTP exchange: its status, the stream's events (or the JSON body), or the error text."""

    status: int | None
    events: list[dict[str, Any]] = field(default_factory=list)
    body: Any = None
    error: str = ""
    seconds: float = 0.0
    first_event_s: float | None = None


Transport = Callable[[str, str, dict[str, Any] | None], Answer]


def http_transport(key: str) -> Transport:
    """The live transport: urllib, the key in the Authorization header and nowhere else."""

    def send(method: str, path: str, body: dict[str, Any] | None) -> Answer:
        headers = {"authorization": f"Bearer {key}", "content-type": "application/json"}
        if body is not None and body.get("stream"):
            headers["accept"] = "text/event-stream"
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(f"{BASE}{path}", data=data, method=method, headers=headers)
        t0 = time.perf_counter()
        answer = Answer(status=None)
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                answer.status = resp.status
                if body is not None and body.get("stream"):
                    for event in sse(line.decode("utf-8", "replace") for line in resp):
                        if answer.first_event_s is None:
                            answer.first_event_s = time.perf_counter() - t0
                        answer.events.append(event)
                else:
                    answer.body = json.loads(resp.read() or b"null")
        except urllib.error.HTTPError as e:
            answer.status = e.code
            answer.error = e.read()[:600].decode("utf-8", "replace")
        except urllib.error.URLError as e:
            answer.error = f"unreachable: {e.reason}"
        answer.seconds = time.perf_counter() - t0
        return answer

    return send


def sse(lines: Iterable[str]) -> Iterable[dict[str, Any]]:
    """The `data:` records of a server-sent event stream, as JSON, each with its `type`."""
    event = ""
    for raw in lines:
        line = raw.rstrip("\r\n")
        if line.startswith("event:"):
            event = line[6:].strip()
        elif line.startswith("data:"):
            try:
                data = json.loads(line[5:])
            except ValueError:
                continue
            if isinstance(data, dict):
                data.setdefault("type", event)
                yield data


def replay_transport(path: Path) -> Transport:
    """A recorded run: each call takes the next answer in the file, so nothing reaches the network."""
    answers = list(json.loads(path.read_text(encoding="utf-8"))["answers"])

    def send(method: str, path_: str, body: dict[str, Any] | None) -> Answer:
        if not answers:
            raise SystemExit(f"the replay file has no answer left for {method} {path_}")
        a = answers.pop(0)
        return Answer(
            status=a.get("status"),
            events=list(a.get("events") or []),
            body=a.get("body"),
            error=a.get("error", ""),
            seconds=float(a.get("seconds", 0.0)),
            first_event_s=a.get("first_event_s"),
        )

    return send


# ---------------------------------------------------------------- the image --

# A 5x7 pixel font for what the worksheet needs: digits, +, -, = and ?.
GLYPHS = {
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
    "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
    "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
    "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
    "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
    " ": ["00000"] * 7,
}
WORKSHEET = ["3 + 4 = ?", "9 - 5 = ?"]
WORKSHEET_ANSWERS = [7, 4]


def worksheet_png(lines: list[str] = WORKSHEET, scale: int = 8) -> bytes:
    """A grey-scale PNG of `lines` in the pixel font: black on white, drawn here, no photo."""
    cell_w, cell_h, pad = 6 * scale, 9 * scale, 2 * scale
    width = pad * 2 + cell_w * max(len(line) for line in lines)
    height = pad * 2 + cell_h * len(lines)
    pixels = [[255] * width for _ in range(height)]
    for row, line in enumerate(lines):
        for col, ch in enumerate(line):
            for gy, bits in enumerate(GLYPHS[ch]):
                for gx, bit in enumerate(bits):
                    if bit != "1":
                        continue
                    for dy in range(scale):
                        for dx in range(scale):
                            y = pad + row * cell_h + gy * scale + dy
                            x = pad + col * cell_w + gx * scale + dx
                            pixels[y][x] = 0
    raw = b"".join(b"\x00" + bytes(r) for r in pixels)

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    header = struct.pack(">IIBBBBB", width, height, 8, 0, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


# ---------------------------------------------------------------- the probes -


def guarded(text: str) -> GuardedPrompt:
    """Every prompt goes through the guard, as `jw.muse.ask` demands, though none names anyone."""
    prompt = guard(text, names=[])
    assert prompt.sealed
    return prompt


def body_for(model: str, input_: list[dict[str, Any]], **extra: Any) -> dict[str, Any]:
    return {
        "model": model,
        "instructions": "You help a maths app for children in grades 1 to 3. Answer briefly.",
        "input": input_,
        "max_output_tokens": MAX_OUTPUT_TOKENS,
        "store": False,
        "stream": True,
        "reasoning": {"effort": EFFORT},
        "prompt_cache_key": f"jadwigo-probe-{model}",
        **extra,
    }


ADD_TOOL = {
    "type": "function",
    "name": "add_numbers",
    "description": "Adds two whole numbers and returns their sum.",
    "parameters": {
        "type": "object",
        "properties": {"a": {"type": "integer"}, "b": {"type": "integer"}},
        "required": ["a", "b"],
        "additionalProperties": False,
    },
}
SCHEMA = {
    "type": "object",
    "properties": {
        "answers": {"type": "array", "items": {"type": "integer"}},
        "grade": {"type": "string", "enum": ["1", "2", "3"]},
    },
    "required": ["answers", "grade"],
    "additionalProperties": False,
}


def text_of(events: list[dict[str, Any]]) -> str:
    """The answer's words: the streamed deltas, else the completed response's output text."""
    deltas = "".join(
        str(e.get("delta") or "") for e in events if e.get("type") == "response.output_text.delta"
    )
    if deltas:
        return deltas
    for item in completed(events).get("output") or []:
        for part in item.get("content") or []:
            if part.get("type") == "output_text":
                return str(part.get("text") or "")
    return ""


def completed(events: list[dict[str, Any]]) -> dict[str, Any]:
    for e in events:
        if e.get("type") in ("response.completed", "response.incomplete", "response.failed"):
            return e.get("response") or {}
    return {}


def terminal_of(answer: Answer) -> str:
    if answer.error or (answer.status is not None and answer.status >= 400):
        return f"http {answer.status}" if answer.status else "unreachable"
    for e in answer.events:
        kind = str(e.get("type") or "")
        if kind in ("response.completed", "response.incomplete", "response.failed"):
            return kind.split(".", 1)[1]
        if kind == "error":
            return "error"
    return "no terminal event"


def function_calls(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    calls = [
        e["item"]
        for e in events
        if e.get("type") == "response.output_item.done"
        and (e.get("item") or {}).get("type") == "function_call"
    ]
    if calls:
        return calls
    return [i for i in completed(events).get("output") or [] if i.get("type") == "function_call"]


@dataclass
class Probe:
    """One probe on one model, as the note reports it."""

    name: str
    model: str
    request: dict[str, Any]
    works: bool = False
    status: int | None = None
    terminal: str = ""
    answer: str = ""
    seconds: float = 0.0
    usd: float = 0.0
    placeholder: bool = False
    tokens: dict[str, int] = field(default_factory=dict)
    events: list[str] = field(default_factory=list)


class Stop(Exception):
    """The run stopped before its plan ended; what ran is still written."""


def calls_needed(models: list[str]) -> int:
    return 1 + CALLS_PER_MODEL * len(models)


class Prober:
    """Runs the calls: the budget before each, a ledger row after each, at most MAX_CALLS.

    `probes` holds every probe that made a call, a stopped one included, for the note.
    """

    def __init__(self, transport: Transport, *, ledger: bool) -> None:
        self.transport = transport
        self.ledger = ledger
        self.calls = 0
        self.raw: list[dict[str, Any]] = []
        self.probes: list[Probe] = []
        self.models = "(not asked)"

    def call(self, tag: str, model: str, body: dict[str, Any], probe: Probe) -> Answer:
        if self.calls + 1 > MAX_CALLS:
            raise Stop(f"stopped: the plan reached {MAX_CALLS} calls")
        muse.check_budget(tag)
        self.calls += 1
        if not any(x is probe for x in self.probes):
            self.probes.append(probe)
        answer = self.transport("POST", "/responses", body)
        usage = completed(answer.events).get("usage") or {}
        placeholder = model not in muse.PRICES
        priced = muse._priced(
            [
                {
                    # An unpriced model is priced as the contributor, then times the factor.
                    "model": CONTRIBUTOR if placeholder else model,
                    "input_tokens": usage.get("input_tokens"),
                    "cached_tokens": (usage.get("input_tokens_details") or {}).get("cached_tokens"),
                    "output_tokens": usage.get("output_tokens"),
                    "reasoning_tokens": (usage.get("output_tokens_details") or {}).get(
                        "reasoning_tokens"
                    ),
                }
            ]
        )
        if placeholder:
            priced["usd"] = round(priced["usd"] * PLACEHOLDER_FACTOR, 6)
        terminal = terminal_of(answer)
        if self.ledger:
            muse._log(
                {
                    "tag": tag,
                    "model": model,
                    "effort": EFFORT,
                    "attempt": 0,
                    "terminal": terminal,
                    "billing": "api",
                    "seconds": round(answer.seconds, 1),
                    "usage": priced,
                    "route": "direct",
                    "priced": "placeholder" if placeholder else "list",
                }
            )
        probe.status = answer.status
        probe.terminal = terminal
        probe.seconds += answer.seconds
        probe.usd = round(probe.usd + priced["usd"], 6)
        probe.placeholder = probe.placeholder or placeholder
        for k in ("input_tokens", "cached_tokens", "output_tokens"):
            probe.tokens[k] = probe.tokens.get(k, 0) + int(priced[k])
        probe.events = sorted({str(e.get("type")) for e in answer.events} | set(probe.events))
        if answer.error:
            probe.answer = answer.error
        self.raw.append({"tag": tag, "status": answer.status, "terminal": terminal,
                         "seconds": round(answer.seconds, 2), "events": answer.events,
                         "error": answer.error})
        return answer


def slug(model: str) -> str:
    return "".join(c if c.isalnum() else "-" for c in model).strip("-")


def probe_image(p: Prober, model: str) -> Probe:
    prompt = guarded("This is a worksheet. Reply with the answer to each line, in order, digits only.")
    image = "data:image/png;base64," + base64.b64encode(worksheet_png()).decode()
    content = [{"type": "input_text", "text": prompt.text}, {"type": "input_image", "image_url": image}]
    body = body_for(model, [{"type": "message", "role": "user", "content": content}])
    probe = Probe("image input", model, shape(body))
    answer = p.call(f"{LANE}:image-{slug(model)}", model, body, probe)
    if probe.terminal == "completed":
        probe.answer = restore(text_of(answer.events), prompt)
        probe.works = all(str(n) in probe.answer for n in WORKSHEET_ANSWERS)
    return probe


def probe_schema(p: Prober, model: str) -> Probe:
    prompt = guarded("Solve 3 + 4 and 9 - 5, and say which school grade these sums suit.")
    fmt = {"format": {"type": "json_schema", "name": "worksheet_answers", "strict": True,
                      "schema": SCHEMA}}
    body = body_for(model, [{"type": "message", "role": "user", "content": prompt.text}], text=fmt)
    probe = Probe("JSON-schema output", model, shape(body))
    answer = p.call(f"{LANE}:schema-{slug(model)}", model, body, probe)
    if probe.terminal == "completed":
        probe.answer = restore(text_of(answer.events), prompt)
        try:
            parsed = json.loads(probe.answer)
        except ValueError:
            parsed = None
        probe.works = (
            isinstance(parsed, dict)
            and set(parsed) == {"answers", "grade"}
            and parsed.get("answers") == WORKSHEET_ANSWERS
            and parsed.get("grade") in ("1", "2", "3")
        )
    return probe


def probe_tools(p: Prober, model: str) -> Probe:
    prompt = guarded("Use the add_numbers tool to add 27 and 45, then tell me the sum in one sentence.")
    first = [{"type": "message", "role": "user", "content": prompt.text}]
    body = body_for(model, first, tools=[ADD_TOOL])
    probe = Probe("function tools, 2 turns, streamed", model, shape(body))
    answer = p.call(f"{LANE}:tools-1-{slug(model)}", model, body, probe)
    calls = function_calls(answer.events) if probe.terminal == "completed" else []
    if not calls:
        if probe.terminal == "completed":
            probe.answer = "turn 1 completed without a function call: " + text_of(answer.events)[:200]
        return probe
    call = calls[0]
    try:
        args = json.loads(call.get("arguments") or "{}")
        output = {"sum": int(args["a"]) + int(args["b"])}
    except (ValueError, KeyError, TypeError):
        output = {"error": "arguments did not parse"}
    second = [
        *first,
        {"type": "function_call", "call_id": call.get("call_id"), "name": call.get("name"),
         "arguments": call.get("arguments") or "{}"},
        {"type": "function_call_output", "call_id": call.get("call_id"),
         "output": json.dumps(output)},
    ]
    answer = p.call(f"{LANE}:tools-2-{slug(model)}", model, body_for(model, second, tools=[ADD_TOOL]),
                    probe)
    streamed_call = any(
        str(e.get("type")).startswith("response.function_call_arguments") for e in probe_events(p)
    )
    if probe.terminal == "completed":
        probe.answer = restore(text_of(answer.events), prompt)
        probe.works = "72" in probe.answer and streamed_call
        if not streamed_call:
            probe.answer += " (no response.function_call_arguments.* event in turn 1's stream)"
    return probe


def probe_events(p: Prober) -> list[dict[str, Any]]:
    """Turn 1's events: the raw record 2 calls back, the first turn of the tools probe."""
    return p.raw[-2]["events"] if len(p.raw) >= 2 else []


def shape(body: dict[str, Any]) -> dict[str, Any]:
    """The request as the note shows it: long strings cut, the image's base64 left out."""

    def cut(v: Any) -> Any:
        if isinstance(v, dict):
            return {k: cut(x) for k, x in v.items()}
        if isinstance(v, list):
            return [cut(x) for x in v]
        if isinstance(v, str) and v.startswith("data:image/"):
            return v[: v.index(",") + 1] + f"<{len(v)} chars>"
        if isinstance(v, str) and len(v) > 120:
            return v[:117] + "..."
        return v

    return cut(body)


def probe_models(p: Prober) -> None:
    """GET /v1/models: free, and the only place the API could list a tier."""
    p.calls += 1
    answer = p.transport("GET", "/models", None)
    if answer.error or (answer.status or 0) >= 400:
        p.models = f"{answer.status}: {answer.error[:200]}"
        return
    ids = [m.get("id") for m in (answer.body or {}).get("data") or [] if isinstance(m, dict)]
    p.models = f"{answer.status}: {', '.join(str(i) for i in ids) or '(no models listed)'}"


# ---------------------------------------------------------------- the note ---


def candidates() -> list[str]:
    raw = os.environ.get(CANDIDATES_ENV, "")
    names = [n.strip() for n in raw.split(",") if n.strip()] or list(DEFAULT_CANDIDATES)
    return [n for n in dict.fromkeys(names) if n != CONTRIBUTOR]


def plan() -> list[str]:
    return [CONTRIBUTOR, *candidates()]


def run(transport: Transport, *, ledger: bool) -> tuple[Prober, str | None]:
    """Every probe on every model, in order. A stop (the budget, the call limit, a transport
    error) ends the run early; the Prober still holds what ran, and the reason comes back."""
    p = Prober(transport, ledger=ledger)
    try:
        probe_models(p)
        for model in plan():
            for each in (probe_image, probe_schema, probe_tools):
                each(p, model)
    except (Stop, muse.BudgetExceeded) as e:
        return p, str(e)
    except Exception as e:  # noqa: BLE001 - anything else still writes what ran
        return p, f"{type(e).__name__}: {e}"
    return p, None


def note(
    probes: list[Probe], models: str, at: str, replayed: bool, stopped: str | None = None
) -> str:
    def usd(pr: Probe) -> str:
        return f"${pr.usd:.6f}" + (" (unpriced, placeholder)" if pr.placeholder else "")

    def works(pr: Probe) -> str:
        if pr.works:
            return "works"
        return pr.terminal if pr.terminal != "completed" else "answered, check failed"

    rows = "\n".join(
        f"| {pr.name} | `{pr.model}` | {works(pr)} | {pr.status} | {pr.seconds:.1f}s | {usd(pr)} "
        f"| {pr.tokens.get('input_tokens', 0)} / {pr.tokens.get('output_tokens', 0)} |"
        for pr in probes
    )
    detail = "\n\n".join(
        f"### {pr.name} on `{pr.model}`\n\n"
        f"Request:\n\n```json\n{json.dumps(pr.request, indent=2, ensure_ascii=False)}\n```\n\n"
        f"Answer ({pr.terminal}): {pr.answer.strip()[:600] or '(none)'}\n\n"
        f"Stream event types: {', '.join(pr.events) or '(none)'}"
        for pr in probes
    )
    by = {(pr.model, pr.name): pr.works for pr in probes}
    contributor_ok = [pr.name for pr in probes if pr.model == CONTRIBUTOR and pr.works]
    private = [m for m in candidates()]
    private_ok = {m: [n for (mm, n), ok in by.items() if mm == m and ok] for m in private}
    answer = (
        f"On {CONTRIBUTOR}: {len(contributor_ok)} of 3 features work"
        f" ({', '.join(contributor_ok) or 'none'}). "
        + " ".join(
            f"On {m}: {len(ok)} of 3 ({', '.join(ok) or 'none'})." for m, ok in private_ok.items()
        )
        + " Whether a tier trains on its input is in Meta's terms, for the owner to confirm."
    )
    outcome = {
        "issue": "dl-z5ja.3",
        "question": "Does POST /v1/responses accept image input, JSON-schema output and function "
        "tools with a streamed tool loop, and which tier does not train on its input?",
        "answer": answer,
        "status": "partial",
        "sources": [f"{BASE}/responses", "apps/cli/scripts/muse_probe.py",
                    "jadwigo-bank/experiments/direct_api/README.md"],
        "owner_decisions": [
            {
                "question": "Which Meta model or tier trains on nothing it is sent, under which "
                "terms, for learner calls (dl-2uq1)?",
                "options": [*private, "another model the terms name"],
            }
        ],
        "proposed_issues": [],
        "page_changes": [
            {"section": "docs/research/ai-chat-engine.md, Muse: API or CLI",
             "change": "Replace 'Image input and JSON-schema output through the API are not "
             "measured yet' with this note's table."}
        ],
    }
    source = "a replay file, not the network: no call was made or billed" if replayed else (
        f"{BASE}, live, billed to the `{LANE}` lane"
    )
    return f"""# What does Muse's /v1/responses accept: images, JSON schema, function tools, a no-training tier?

Issue: `dl-z5ja.3`

**The answer in 5 lines.** {answer}

**Method.** `apps/cli/scripts/muse_probe.py` at {at}, from {source}. Each probe ran once per model
at effort `{EFFORT}`, streamed, `store: false`, through `jw.pii.guard` and the `jw.muse` ledger
and budget. The image is a worksheet the script draws (2 sums in a pixel font), never a photo.
`GET /v1/models` answered: {models}.
A model jw.muse has no price for is charged at the contributor's price times {PLACEHOLDER_FACTOR}, so the
lane cap counts it; its USD is marked "unpriced, placeholder".
{f"{chr(10)}**Stopped early:** {stopped}. The table holds what ran before the stop.{chr(10)}" if stopped else ""}
| Probe | Model | Result | HTTP | Latency | USD | Tokens in / out |
| --- | --- | --- | --- | --- | --- | --- |
{rows}

**The no-training tier.** The API cannot say whether a model trains on its input. Owner: name the
model and the terms that say so here (link and date), then dl-z5ja.48 and dl-z5ja.18 take it.

- Model: (owner)
- Terms: (owner)

## Findings

{detail}

## What this means for jadwigo

- `HttpMuse` (dl-z5ja.18) sends only the features this table marks as working; a feature that
  answered 400 stays off until a re-run passes.
- `jw.muse` (dl-z5ja.48) and `HttpMuse` take the no-training model once the owner names it above.

```json jadwigo-outcome
{json.dumps(outcome, indent=2, ensure_ascii=False)}
```
"""


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--live", action="store_true", help="call the API and spend, up to the cap")
    mode.add_argument("--replay", type=Path, help="a recorded answers file: no network, no spend")
    parser.add_argument("--note", type=Path, default=NOTE, help="where the results note goes")
    args = parser.parse_args(argv)
    at = dt.datetime.now(dt.UTC).isoformat(timespec="seconds")
    models = plan()
    needed = calls_needed(models)
    if needed > MAX_CALLS:
        print(f"The plan needs {needed} calls (1 + {CALLS_PER_MODEL} x {len(models)} models), more "
              f"than {MAX_CALLS}: name fewer models in {CANDIDATES_ENV}.", file=sys.stderr)
        return 2
    if not args.live and not args.replay:
        print(f"Dry run, nothing sent. With --live: {needed} calls on {', '.join(models)}, "
              f"cap {muse.LANE_CAP_ENV}={muse.lane_cap()}, key file "
              f"{'present' if muse.api_key() else 'missing'}, note to {args.note}.")
        return 0
    if args.replay:
        transport, ledger = replay_transport(args.replay), False
    else:
        cap = muse.lane_cap()
        if cap is None or not 0 < cap <= MAX_CAP_USD:
            print(f"Set {muse.LANE_CAP_ENV} to a small cap (above 0, at most ${MAX_CAP_USD:.0f}).",
                  file=sys.stderr)
            return 2
        key = muse.api_key()
        if not key:
            print(f"No {muse.KEY_NAME} in {muse.KEY_FILE}: the probe needs the API key.",
                  file=sys.stderr)
            return 2
        transport, ledger = http_transport(key), True
    p, stopped = run(transport, ledger=ledger)
    args.note.parent.mkdir(parents=True, exist_ok=True)
    args.note.write_text(note(p.probes, p.models, at, bool(args.replay), stopped), encoding="utf-8")
    if not args.replay:
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        (RAW_DIR / f"{at.replace(':', '')}.json").write_text(
            json.dumps({"stopped": stopped, "calls": p.raw}, indent=1, ensure_ascii=False),
            encoding="utf-8")
    for pr in p.probes:
        print(f"{pr.model:32} {pr.name:36} {'works' if pr.works else pr.terminal:24} "
              f"{pr.seconds:5.1f}s ${pr.usd:.6f}{' placeholder' if pr.placeholder else ''}")
    print(f"note: {args.note}")
    if stopped:
        print(f"stopped early: {stopped}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
