"""dl-z5ja.3: scripts/muse_probe.py, proved without the network and without spending.

A fake transport answers the way the Responses API documents its stream (response.output_text.delta,
response.output_item.done with a function_call, response.completed with usage), and a 400 for the
candidate model's image, so both paths of the note are read. urlopen is blocked in every test.
"""

from __future__ import annotations

import importlib.util
import json
import re
import sys
from pathlib import Path
from typing import Any

import pytest

from jw import muse

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "muse_probe.py"
REPLAY = Path(__file__).resolve().parent / "fixtures" / "muse_probe" / "replay.json"
KEY = "fake-meta-key-for-the-probe-test"


def _load() -> Any:
    spec = importlib.util.spec_from_file_location("muse_probe", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules["muse_probe"] = module
    spec.loader.exec_module(module)
    return module


probe = _load()


def _usage(i: int, o: int) -> dict[str, Any]:
    return {"input_tokens": i, "input_tokens_details": {"cached_tokens": 0}, "output_tokens": o}


def _done(text: str, usage: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {"type": "response.created", "response": {"id": "resp_x"}},
        {"type": "response.output_text.delta", "delta": text[:3]},
        {"type": "response.output_text.delta", "delta": text[3:]},
        {"type": "response.completed", "response": {"id": "resp_x", "usage": usage}},
    ]


def fake_answer(method: str, path: str, body: dict[str, Any] | None) -> Any:
    """What the endpoint answers, per request: the documented shapes, written by hand."""
    if method == "GET":
        return probe.Answer(status=401, error='{"error": "unauthorized"}')
    assert body is not None and path == "/responses"
    model = body["model"]
    content = body["input"][0]["content"]
    if isinstance(content, list):  # the image
        if model != muse.SPARK_CONTRIBUTOR:
            return probe.Answer(status=400, error="input_image is not supported for this model")
        return probe.Answer(status=200, events=_done("7\n4", _usage(900, 20)), seconds=2.5)
    if "text" in body:
        return probe.Answer(
            status=200, events=_done('{"answers": [7, 4], "grade": "1"}', _usage(80, 30)), seconds=1.5
        )
    if body["input"][-1]["type"] == "function_call_output":
        return probe.Answer(status=200, events=_done("The sum is 72.", _usage(120, 10)), seconds=1.0)
    call = {"type": "function_call", "call_id": "call_1", "name": "add_numbers",
            "arguments": '{"a": 27, "b": 45}'}
    events = [
        {"type": "response.output_item.added", "item": {**call, "arguments": ""}},
        {"type": "response.function_call_arguments.delta", "delta": '{"a": 27, '},
        {"type": "response.function_call_arguments.done", "arguments": call["arguments"]},
        {"type": "response.output_item.done", "item": call},
        {"type": "response.completed", "response": {"usage": _usage(100, 15)}},
    ]
    return probe.Answer(status=200, events=events, seconds=1.2)


@pytest.fixture(autouse=True)
def offline(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    def no_network(*_a: Any, **_k: Any) -> None:
        raise AssertionError("the probe test reached for the network")

    monkeypatch.setattr(probe.urllib.request, "urlopen", no_network)
    monkeypatch.setattr(muse, "LOG_DIR", tmp_path / "own")
    monkeypatch.setattr(probe, "RAW_DIR", tmp_path / "raw")
    monkeypatch.setenv(muse.SHARED_LOG_ENV, str(tmp_path / "shared"))
    monkeypatch.delenv(probe.CANDIDATES_ENV, raising=False)
    key_file = tmp_path / "muse.env"
    key_file.write_text(f"export META_API_KEY='{KEY}'\n", encoding="utf-8")
    monkeypatch.setattr(muse, "KEY_FILE", key_file)
    return tmp_path


def _ledger(directory: Path) -> list[dict[str, Any]]:
    return [json.loads(x) for p in directory.glob("*.jsonl") for x in p.read_text().splitlines()]


def _outcome(text: str) -> dict[str, Any]:
    (block,) = re.findall(r"```json jadwigo-outcome\n(.*?)\n```", text, re.S)
    return json.loads(block)


def test_a_run_covers_the_4_probes_through_the_ledger_and_writes_the_note(
    offline: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv(muse.LANE_CAP_ENV, "0.5")
    monkeypatch.setattr(probe, "http_transport", lambda key: (lambda *a: fake_answer(*a)))
    note = offline / "note.md"

    assert probe.main(["--note", str(note)]) == 0

    text = note.read_text(encoding="utf-8")
    works = {(m, n) for m, n in re.findall(r"\| (.+?) \| `(.+?)` \| works \|", text)}
    assert works == {
        ("image input", muse.SPARK_CONTRIBUTOR),
        ("JSON-schema output", muse.SPARK_CONTRIBUTOR),
        ("function tools, 2 turns, streamed", muse.SPARK_CONTRIBUTOR),
        ("JSON-schema output", "muse-spark-1.3"),
        ("function tools, 2 turns, streamed", "muse-spark-1.3"),
    }
    assert "input_image is not supported for this model" in text
    assert "response.function_call_arguments.delta" in text
    assert "<" in text and "base64," in text and "iVBOR" not in text  # the image is cut
    out = _outcome(text)
    assert out["issue"] == "dl-z5ja.3" and out["status"] == "partial"
    assert "## What this means for jadwigo" in text
    assert len(out["owner_decisions"][0]["options"]) >= 2

    # 8 POSTs: 4 per model (the tools probe takes 2 turns), each a ledger row in both ledgers.
    for directory in (offline / "own", offline / "shared"):
        rows = _ledger(directory)
        assert len(rows) == 8
        assert all(r["tag"].startswith("probe:") for r in rows)
        assert {r["priced"] for r in rows} == {True, False}
    image_row = next(r for r in _ledger(offline / "own") if r["tag"].startswith("probe:image-muse-spark-1-3-c"))
    assert image_row["usage"]["usd"] == round((900 * 0.10 + 20 * 0.20) / 1e6, 6)

    # The key went nowhere but the header.
    for path in [note, *offline.rglob("*.json*")]:
        assert KEY not in path.read_text(encoding="utf-8"), path


def test_it_refuses_without_a_small_cap_or_a_key(
    offline: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    called: list[Any] = []
    monkeypatch.setattr(probe, "http_transport", lambda key: called.append(key))
    assert probe.main(["--note", str(offline / "n.md")]) == 2
    monkeypatch.setenv(muse.LANE_CAP_ENV, "25")
    assert probe.main(["--note", str(offline / "n.md")]) == 2
    monkeypatch.setenv(muse.LANE_CAP_ENV, "0.5")
    (offline / "muse.env").write_text("", encoding="utf-8")
    assert probe.main(["--note", str(offline / "n.md")]) == 2
    assert called == [] and not (offline / "n.md").exists()
    assert KEY not in capsys.readouterr().err


def test_the_budget_stops_the_probe_before_a_call(offline: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(muse.LANE_CAP_ENV, "0.5")
    (offline / "own").mkdir()
    (offline / "own" / "2026-11-01.jsonl").write_text(
        json.dumps({"tag": "probe:earlier", "usage": {"usd": 0.5}}) + "\n", encoding="utf-8"
    )
    sent: list[Any] = []
    monkeypatch.setattr(probe, "http_transport", lambda key: (lambda *a: sent.append(a) or fake_answer(*a)))
    with pytest.raises(muse.BudgetExceeded):
        probe.main(["--note", str(offline / "n.md")])
    assert [a[0] for a in sent] == ["GET"]  # the free models list only


def test_the_replay_file_runs_the_script_with_no_network_and_no_ledger(offline: Path) -> None:
    note = offline / "note.md"
    assert probe.main(["--replay", str(REPLAY), "--note", str(note)]) == 0
    text = note.read_text(encoding="utf-8")
    assert "a replay file, not the network" in text
    assert _outcome(text)["issue"] == "dl-z5ja.3"
    assert not (offline / "own").exists() and not (offline / "raw").exists()


def test_the_worksheet_is_a_png_the_script_draws() -> None:
    png = probe.worksheet_png()
    assert png.startswith(b"\x89PNG\r\n\x1a\n") and b"IHDR" in png and b"IEND" in png
    assert set("".join(probe.WORKSHEET)) <= set(probe.GLYPHS)


def test_the_replay_file_is_what_the_fake_answers(offline: Path) -> None:
    """The fixture is regenerated from fake_answer, so it cannot drift from the test's shapes."""
    answers: list[dict[str, Any]] = []

    def record(*a: Any) -> Any:
        ans = fake_answer(*a)
        answers.append({k: v for k, v in vars(ans).items() if v not in (None, [], "", 0.0)})
        return ans

    probe.run(record, ledger=False)
    # Compared as JSON: Biome formats the file.
    if json.loads(REPLAY.read_text(encoding="utf-8")) != {"answers": answers}:
        pytest.fail(f"{REPLAY} is stale: rewrite it from fake_answer")
