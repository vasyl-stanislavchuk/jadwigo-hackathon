"""dl-u1y5.23 (moved from dl-e8ov.5.2.7): jw's bank client against the pinned search envelope.

A fake bank (tests/fake_bank.py) stands in for POST /api/v1/question-searches and the bank's own
route. The client must send a valid need, hand back a valid envelope, and turn a failing bank into
a degraded one. The last tests cover where the URL and token come from (dl-e8ov.5.2.26).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import fake_bank
import pytest
from click.testing import CliRunner

from jw import bank_client
from jw.cli import main as cli
from jw.settings_keys import (
    JW_API_URL,
    JW_BANK_ENV_FILE,
    JW_BANK_READ_TOKEN,
    JW_BANK_TOKEN,
    JW_BANK_URL,
)

NEED: dict[str, Any] = {"words": "dodawanie do 100", "language": "pl", "grade": "3"}
TOKEN = "jgw_secret_never_printed"
SEARCH = ["question", "search", "--words", "dodawanie do 100", "--grade", "3"]


@pytest.fixture
def bank(monkeypatch: pytest.MonkeyPatch) -> Iterator[Any]:
    fake = fake_bank.FakeBank().start()
    monkeypatch.setenv(JW_API_URL, fake.url)
    monkeypatch.setenv(JW_BANK_READ_TOKEN, TOKEN)
    yield fake
    fake.stop()


def _assert_degraded(envelope: dict[str, Any]) -> None:
    bank_client.validate_envelope(envelope)
    assert envelope["rows"] == []
    assert {s["arm"] for s in envelope["state"]} == set(bank_client.KNOWN_ARMS)
    assert all(s["state"] == "degraded" and s["detail"] for s in envelope["state"])
    assert TOKEN not in json.dumps(envelope)


def test_fixture_envelope_validates() -> None:
    bank_client.validate_envelope(json.loads(fake_bank.FIXTURE.read_text(encoding="utf-8")))


def test_pinned_schemas_name_their_bank_commit() -> None:
    for path in (bank_client.ENVELOPE_SCHEMA, bank_client.NEED_SCHEMA):
        assert "at bank commit " in json.loads(path.read_text(encoding="utf-8"))["$comment"]


def test_search_sends_a_valid_need_and_returns_a_valid_envelope(bank: Any) -> None:
    envelope = bank_client.search(NEED, limit=5)

    bank_client.validate_envelope(envelope)
    assert [r["rank"] for r in envelope["rows"]] == [1, 2]
    (seen,) = bank.requests
    assert seen.path == "/api/v1/question-searches"
    bank_client.validate_need(seen.body)
    assert seen.body == {**NEED, "limit": 5}
    assert seen.query == {}
    assert seen.headers["Authorization"] == f"Bearer {TOKEN}"
    assert envelope["need"] == seen.body


def test_the_api_route_gets_no_query_fields(bank: Any) -> None:
    """/api/v1/question-searches defines no query fields and answers stage final, every arm."""
    envelope = bank_client.search(NEED, arm="A", stage="first")

    assert bank.requests[0].path == "/api/v1/question-searches"
    assert bank.requests[0].query == {}
    bank_client.validate_envelope(envelope)
    assert envelope["stage"] == "final"


def test_arm_and_stage_ride_as_query_fields_on_the_banks_own_route(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake = fake_bank.FakeBank().start()
    try:
        monkeypatch.setenv(JW_BANK_URL, fake.url)
        envelope = bank_client.search(NEED, arm="A", stage="first")
    finally:
        fake.stop()

    assert fake.requests[0].path == "/questions/search"
    assert fake.requests[0].query == {"arm": "A", "stage": "first"}
    bank_client.validate_envelope(envelope)
    assert envelope["stage"] == "first"
    assert {s["arm"]: s["state"] for s in envelope["state"]}["A"] == "ok"


def test_a_500_comes_back_degraded(bank: Any) -> None:
    bank.status = 500
    envelope = bank_client.search(NEED)
    _assert_degraded(envelope)
    assert envelope["state"][0]["detail"] == "the bank answered HTTP 500"


def test_a_timeout_comes_back_degraded(bank: Any) -> None:
    bank.delay = 1.0
    envelope = bank_client.search(NEED, timeout=0.2)
    _assert_degraded(envelope)
    assert "did not answer within" in envelope["state"][0]["detail"]


def test_an_unreachable_bank_comes_back_degraded(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(JW_BANK_READ_TOKEN, TOKEN)
    # Port 9 on loopback: nothing listens there, so the connect is refused at once.
    _assert_degraded(bank_client.search(NEED, base_url=f"http://127.0.0.1:9/?token={TOKEN}"))


def test_an_unset_url_is_the_callers_error() -> None:
    # conftest unsets every URL and points the env file at a path that does not exist
    with pytest.raises(bank_client.BankNotConfigured):
        bank_client.search(NEED)


def test_a_need_the_schema_refuses_is_never_sent(bank: Any) -> None:
    with pytest.raises(bank_client.NeedInvalid):
        bank_client.search({"language": "pl", "grade": "3"})  # no words, skills, can_do, resemble
    assert bank.requests == []


def test_cli_json_prints_a_valid_envelope(bank: Any) -> None:
    result = CliRunner().invoke(
        cli,
        [
            "question",
            "search",
            "--words",
            "dodawanie do 100",
            "--grade",
            "3",
            "--skill",
            "maths.add.within100",
            "--limit",
            "5",
            "--json",
        ],
    )

    assert result.exit_code == 0, result.output
    envelope = json.loads(result.output)
    bank_client.validate_envelope(envelope)
    assert bank.requests[0].body["skills"] == ["maths.add.within100"]


def test_cli_table_shows_titles_in_the_needs_language(bank: Any) -> None:
    result = CliRunner().invoke(cli, [*SEARCH])

    assert result.exit_code == 0, result.output
    lines = result.output.splitlines()
    assert lines[0].split() == ["rank", "set", "title", "arm", "score"]
    assert "set_khan_xd4e5f6" in lines[1] and "Dodawanie w zakresie 100" in lines[1]
    assert "Add and subtract within 1000" in lines[2]  # no Polish title: English stands in
    assert "arm B1: ok" in result.output


def test_cli_table_names_a_degraded_bank(bank: Any) -> None:
    bank.status = 503
    result = CliRunner().invoke(cli, [*SEARCH])

    assert result.exit_code == 0, result.output
    assert "arm A: degraded (the bank answered HTTP 503)" in result.output


def test_cli_without_grade_fails_before_asking_the_bank(bank: Any) -> None:
    result = CliRunner().invoke(cli, ["question", "search", "--words", "dodawanie do 100"])

    assert result.exit_code == 2
    assert "--grade" in result.output
    assert bank.requests == []


def test_cli_stage_is_not_sent_to_the_api_route(bank: Any) -> None:
    result = CliRunner().invoke(cli, [*SEARCH, "--stage", "first", "--arm", "A", "--json"])

    assert result.exit_code == 0, result.output
    assert bank.requests[0].query == {}
    envelope = json.loads(result.output)
    bank_client.validate_envelope(envelope)
    assert envelope["stage"] == "final"


# ------------------------------------------- where the URL and token come from ----


def _env_file(tmp_path: Path, text: str, mode: int = 0o600) -> Path:
    path = tmp_path / "bank.env"
    path.write_text(text, encoding="utf-8")
    path.chmod(mode)
    return path


def test_the_bank_url_is_the_fallback_with_its_own_token(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = fake_bank.FakeBank().start()
    try:
        monkeypatch.setenv(JW_BANK_URL, fake.url)
        monkeypatch.setenv(JW_BANK_TOKEN, TOKEN)
        bank_client.validate_envelope(bank_client.search(NEED))
    finally:
        fake.stop()
    (seen,) = fake.requests
    assert seen.path == "/questions/search"
    assert seen.headers["Authorization"] == f"Bearer {TOKEN}"


def test_the_api_url_wins_over_the_bank_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(JW_API_URL, "http://api.example/")
    monkeypatch.setenv(JW_BANK_URL, "http://bank.example")
    assert bank_client.endpoint() == ("http://api.example/api/v1/question-searches", None, False)


def test_with_no_url_in_the_env_the_file_gives_url_and_token(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake = fake_bank.FakeBank().start()
    try:
        path = _env_file(tmp_path, f"export {JW_BANK_URL}='{fake.url}'\n{JW_BANK_TOKEN}={TOKEN}\n")
        monkeypatch.setenv(JW_BANK_ENV_FILE, str(path))
        envelope = bank_client.search(NEED)
    finally:
        fake.stop()
    bank_client.validate_envelope(envelope)
    (seen,) = fake.requests
    assert seen.path == "/questions/search"
    assert seen.headers["Authorization"] == f"Bearer {TOKEN}"


def test_a_url_in_the_env_never_takes_the_files_token(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = _env_file(tmp_path, f"{JW_API_URL}=http://api.example\n{JW_BANK_READ_TOKEN}={TOKEN}\n")
    monkeypatch.setenv(JW_BANK_ENV_FILE, str(path))
    monkeypatch.setenv(JW_API_URL, "http://elsewhere.example")
    assert bank_client.endpoint() == (
        "http://elsewhere.example/api/v1/question-searches",
        None,
        False,
    )


def test_a_file_others_can_read_is_refused_without_its_token(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    path = _env_file(tmp_path, f"{JW_BANK_URL}=http://bank.example\n{JW_BANK_TOKEN}={TOKEN}\n", 0o644)
    monkeypatch.setenv(JW_BANK_ENV_FILE, str(path))
    with pytest.raises(bank_client.JwError, match="can be read by other users") as raised:
        bank_client.endpoint()
    assert TOKEN not in str(raised.value) and TOKEN not in raised.value.hint


def test_the_files_token_is_in_no_argv_and_no_output(tmp_path: Path) -> None:
    """A registration runs `jw question search` with no token in its argv or env; the file has it.

    The token reaches the bank as a header, and never the process's argv, stdout or stderr, even
    when the bank fails and the answer comes back degraded.
    """
    jw = Path(sys.executable).with_name("jw")
    fake = fake_bank.FakeBank().start()
    try:
        path = _env_file(tmp_path, f"{JW_BANK_URL}={fake.url}\n{JW_BANK_TOKEN}={TOKEN}\n")
        env = {k: v for k, v in os.environ.items() if not k.startswith("JW_")}
        env[JW_BANK_ENV_FILE] = str(path)
        argv = [str(jw), *SEARCH, "--json"]
        ok = subprocess.run(argv, env=env, capture_output=True, text=True, check=True)
        fake.status = 500
        failed = subprocess.run(argv, env=env, capture_output=True, text=True, check=True)
    finally:
        fake.stop()
    assert TOKEN not in " ".join(argv) and TOKEN not in " ".join(env.values())
    assert fake.requests[0].headers["Authorization"] == f"Bearer {TOKEN}"
    for run in (ok, failed):
        assert TOKEN not in run.stdout and TOKEN not in run.stderr
        bank_client.validate_envelope(json.loads(run.stdout))
    assert json.loads(failed.stdout)["state"][0]["detail"] == "the bank answered HTTP 500"
