"""What reaches PostHog, through the real SDK over a fake network."""

from __future__ import annotations

import json
from typing import Any

import pytest

from printer import handler
from printer import report as reporting


@pytest.fixture
def sent(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, Any]]:
    batches: list[dict[str, Any]] = []

    def batch_post(*_args: object, **kwargs: Any) -> None:
        batches.extend(kwargs["batch"])

    monkeypatch.setattr("posthog.client.batch_post", batch_post)
    monkeypatch.setenv("JW_POSTHOG_KEY", "phc_test")
    reporting._client.cache_clear()
    return batches


def _failing(message: str) -> Exception:
    try:
        name = "Zosia"  # a local the SDK must not send
        raise ValueError(f"{message} {name}")
    except ValueError as exc:
        return exc


def test_without_a_key_it_sends_nothing(sent: list[dict[str, Any]], monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("JW_POSTHOG_KEY")
    reporting.report(_failing("x"), "print", "render")
    assert sent == []


def test_it_sends_the_type_stack_and_operation_and_none_of_the_message(sent: list[dict[str, Any]]) -> None:
    reporting.report(_failing("Zosia napisała kot"), "print", "render")
    assert len(sent) == 1
    event = sent[0]
    assert event["event"] == "$exception"
    assert event["distinct_id"] == "server:print"
    properties = event["properties"]
    assert properties["surface"] == "print"
    assert properties["operation"] == "render"
    assert properties["$process_person_profile"] is False
    assert properties["$geoip_disable"] is True
    exception = properties["$exception_list"][0]
    assert exception["type"] == "ValueError"
    assert exception["value"] == "message withheld"
    assert exception["stacktrace"]["frames"]
    wire = json.dumps(event, default=str)
    for secret in ("Zosia", "napisała", "context_line", "pre_context", "code_variables"):
        assert secret not in wire


def test_a_cause_says_no_more_than_the_error(sent: list[dict[str, Any]]) -> None:
    try:
        try:
            raise KeyError("Zosia")
        except KeyError as inner:
            raise RuntimeError("Zosia napisała kot") from inner
    except RuntimeError as exc:
        reporting.report(exc, "print", "render")
    assert "Zosia" not in json.dumps(sent, default=str)
    assert all(e["value"] == "message withheld" for e in sent[0]["properties"]["$exception_list"])


def test_a_type_named_after_a_person_becomes_error(sent: list[dict[str, Any]]) -> None:
    zosia = type("Zosia", (Exception,), {})
    reporting.report(zosia("boom"), "print", "render")
    assert sent[0]["properties"]["$exception_list"][0]["type"] == "Error"


def test_an_operation_that_is_free_text_is_dropped(sent: list[dict[str, Any]]) -> None:
    reporting.report(_failing("x"), "print", "Zosia napisała")
    assert "operation" not in sent[0]["properties"]


def test_a_broken_network_never_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    def batch_post(*_args: object, **_kwargs: object) -> None:
        raise ConnectionError("down")

    monkeypatch.setattr("posthog.client.batch_post", batch_post)
    monkeypatch.setenv("JW_POSTHOG_KEY", "phc_test")
    reporting._client.cache_clear()
    reporting.report(_failing("x"), "print", "render")


def test_the_handler_reports_an_unexpected_failure_once_and_still_raises(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    failure = RuntimeError("boom")
    reported: list[tuple[BaseException, str, str]] = []

    def fail(*_args: object) -> dict[str, Any]:
        raise failure

    monkeypatch.setattr(handler, "parse_event", lambda *_args: object())
    monkeypatch.setattr(handler, "print_sheet", fail)
    monkeypatch.setattr(handler, "_client", lambda: object())
    monkeypatch.setattr(handler, "report", lambda *args: reported.append(args))
    with pytest.raises(RuntimeError):
        handler.lambda_handler({}, None)
    assert reported == [(failure, "print", "print_sheet")]
