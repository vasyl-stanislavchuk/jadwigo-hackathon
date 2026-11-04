"""Reports an unexpected failure to PostHog (dl-5ssh.160, decision dl-9tuku).

The error's type and stack leave, with the operation that failed, and never its message: a message
here may quote a parent's file or a lesson's sheet, as the handler's log line never does. A report
waits at most 1.5 seconds and never raises, so a slow or broken PostHog can't change an answer.
Without JW_POSTHOG_KEY it does nothing. apps/print and apps/converter hold the same file
(tools/src/python-report.test.ts).
"""

from __future__ import annotations

import functools
import logging
import os
import re
import threading
from typing import Any, Final

_HOST: Final = "https://eu.i.posthog.com"
_TIMEOUT_S: Final = 1
# The longest a report holds the caller, whatever the network does. requests' timeout is per read,
# so a server that trickles bytes would hold it far longer.
_DEADLINE_S: Final = 1.5
_WITHHELD: Final = "message withheld"
# A class name that says it is an error: anything else is a value someone named.
_ERROR_TYPE: Final = re.compile(r"^[A-Z][A-Za-z0-9]*(Error|Exception|Exit|Timeout|Refused)$")
_OPERATION: Final = re.compile(r"^[a-z_]{1,40}$")
_FRAME_KEYS: Final = ("platform", "filename", "abs_path", "function", "module", "lineno", "colno", "in_app")
_MECHANISM_KEYS: Final = ("type", "handled", "synthetic", "exception_id", "parent_id")


def _exception(raw: dict[str, Any]) -> dict[str, Any]:
    kind = raw.get("type")
    out: dict[str, Any] = {
        "type": kind if isinstance(kind, str) and _ERROR_TYPE.match(kind) else "Error",
        "value": _WITHHELD,
    }
    mechanism = raw.get("mechanism")
    if isinstance(mechanism, dict):
        out["mechanism"] = {k: mechanism[k] for k in _MECHANISM_KEYS if k in mechanism}
    stack = raw.get("stacktrace")
    if isinstance(stack, dict) and isinstance(stack.get("frames"), list):
        out["stacktrace"] = {
            "type": stack.get("type", "raw"),
            "frames": [
                {k: frame[k] for k in _FRAME_KEYS if k in frame}
                for frame in stack["frames"]
                if isinstance(frame, dict)
            ],
        }
    return out


def _allowlisted(surface: str, event: dict[str, Any]) -> dict[str, Any] | None:
    """The event with only what the lists above name. Anything else on it is dropped."""
    properties = event.get("properties")
    if event.get("event") != "$exception" or not isinstance(properties, dict):
        return None
    raw = properties.get("$exception_list")
    if not isinstance(raw, list):
        return None
    operation = properties.get("operation")
    return {
        **event,
        "properties": {
            "$exception_list": [_exception(item) for item in raw if isinstance(item, dict)],
            "$process_person_profile": False,
            "$geoip_disable": True,
            "surface": surface,
            **({"operation": operation} if isinstance(operation, str) and _OPERATION.match(operation) else {}),
        },
    }


@functools.cache
def _client(key: str, surface: str) -> Any:
    from posthog import Posthog  # only when there is a failure to report

    # The SDK logs a failed send with logger.exception, whose traceback chains the reported error's
    # message and source line into the function's log. Its log says nothing we need.
    logging.getLogger("posthog").disabled = True

    return Posthog(
        project_api_key=key,
        host=_HOST,
        sync_mode=True,
        timeout=_TIMEOUT_S,
        max_retries=0,
        disable_geoip=True,
        before_send=functools.partial(_allowlisted, surface),
    )


def report(error: BaseException, surface: str, operation: str) -> None:
    """Sends one failure. Whatever goes wrong here stays here: the caller has its own to raise."""
    key = (os.environ.get("JW_POSTHOG_KEY") or "").strip()
    if not key:
        return

    def send() -> None:
        try:
            _client(key, surface).capture_exception(
                error,
                distinct_id=f"server:{surface}",
                properties={"operation": operation},
            )
        except Exception:  # noqa: BLE001, S110  (the failure is already in the function's log)
            pass

    # A daemon thread under a total deadline: a send that outlives it is left behind, never waited on.
    sender = threading.Thread(target=send, name="posthog-report", daemon=True)
    sender.start()
    sender.join(_DEADLINE_S)
