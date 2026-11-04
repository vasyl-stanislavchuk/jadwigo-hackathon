"""The print Lambda (dl-1eieq.8.2, decision dl-o05aa).

The API puts the sheet at `pods/<pod>/prints/<id>.json` (id: the sha256 of the canonical sheet)
and invokes this function with InvocationType Event, so nothing waits on the answer:

    event:   {"bucket", "key"}            key exactly pods/<pod>/prints/<id>.json
    success: pods/<pod>/prints/<id>.pdf   with metadata pages=<n>
    failure: pods/<pod>/prints/<id>.error.json  {"code": invalid_sheet | render_failed}

Every object here carries the tag kind=print (PRINT_TAG), which the uploads bucket's lifecycle
rule expires after 30 days (modules/uploads): a print is a cache, made again from the lesson.

The API polls for the PDF or the error file. A PDF that is already there is not drawn again. An
event naming any other key raises Refused("bad_event") and writes nothing, so the function can
only ever read one sheet and write that sheet's two answers, whatever the role allows. An S3 error
raises, so Lambda's own retry of an Event invoke tries again.

Logs carry the print id, the page count, the time and the outcome: never a word of the sheet.
"""

from __future__ import annotations

import functools
import json
import os
import re
import time
from dataclasses import dataclass
from typing import Any, Final, Literal, Protocol

import boto3
from pydantic import ValidationError

from printer.report import report
from printer.sheet import parse_sheet

Code = Literal["bad_event", "invalid_sheet", "render_failed"]

#: The event is not one the API sends.
BAD_EVENT: Final = "bad_event"
#: The sheet is not a PrintSheet: a field the contract does not name (a key, a hint), or a missing one.
INVALID_SHEET: Final = "invalid_sheet"
#: The layout failed, a picture off the allowlist included.
RENDER_FAILED: Final = "render_failed"

#: The tag on every print object: the uploads bucket expires what carries it (modules/uploads).
PRINT_TAG: Final = "kind=print"

# packages/contracts/src/ids.ts: a prefix, then 26 base32 characters of a uuid.
POD_ID: Final = r"pod_[0-7][0-9a-hjkmnp-tv-z]{25}"
SHEET_KEY: Final = re.compile(rf"pods/(?P<pod>{POD_ID})/prints/(?P<id>[0-9a-f]{{64}})\.json")


class Refused(Exception):
    """An event the function will not act on. Its message is the code and nothing else."""

    def __init__(self, code: Code) -> None:
        super().__init__(code)
        self.code: Code = code


@dataclass(frozen=True)
class Request:
    bucket: str
    key: str
    pod: str
    print_id: str

    @property
    def pdf_key(self) -> str:
        return f"pods/{self.pod}/prints/{self.print_id}.pdf"

    @property
    def error_key(self) -> str:
        return f"pods/{self.pod}/prints/{self.print_id}.error.json"


def parse_event(event: object, allowed_bucket: str | None) -> Request:
    """The event, checked: two strings, the key exactly a sheet's, the bucket the function's own."""
    if not isinstance(event, dict):
        raise Refused(BAD_EVENT)
    bucket, key = event.get("bucket"), event.get("key")
    if not isinstance(bucket, str) or not isinstance(key, str) or not bucket:
        raise Refused(BAD_EVENT)
    match = SHEET_KEY.fullmatch(key)
    if match is None or (allowed_bucket is not None and bucket != allowed_bucket):
        raise Refused(BAD_EVENT)
    return Request(bucket=bucket, key=key, pod=match["pod"], print_id=match["id"])


class S3(Protocol):
    """The calls the function makes, as boto3's S3 client has them."""

    def get_object(self, **kwargs: Any) -> dict[str, Any]: ...

    def head_object(self, **kwargs: Any) -> dict[str, Any]: ...

    def put_object(self, **kwargs: Any) -> dict[str, Any]: ...


# Without s3:ListBucket a missing object answers 403, not 404; the role has no List.
_ABSENT = {"NoSuchKey", "NotFound", "404", "AccessDenied", "403"}


def _log(**fields: object) -> None:
    print(json.dumps({"service": "print", **fields}, sort_keys=True), flush=True)


def _error_code(exc: Exception) -> str | None:
    response = getattr(exc, "response", None)
    if isinstance(response, dict):
        code = response.get("Error", {}).get("Code")
        return str(code) if code is not None else None
    return None


def _exists(s3: S3, bucket: str, key: str) -> bool:
    try:
        s3.head_object(Bucket=bucket, Key=key)
    except Exception as exc:
        if _error_code(exc) in _ABSENT:
            return False
        raise
    return True


def _fail(s3: S3, request: Request, code: Code) -> dict[str, Any]:
    s3.put_object(
        Bucket=request.bucket,
        Key=request.error_key,
        Body=json.dumps({"code": code}).encode(),
        ContentType="application/json",
        Tagging=PRINT_TAG,
    )
    _log(outcome="failed", code=code, print_id=request.print_id)
    return {"status": "failed", "code": code}


def print_sheet(request: Request, s3: S3) -> dict[str, Any]:
    """The sheet's PDF in S3: already there, drawn now, or an error file naming why not."""
    if _exists(s3, request.bucket, request.pdf_key):
        _log(outcome="stored", print_id=request.print_id)
        return {"status": "ready"}
    started = time.monotonic()
    raw = s3.get_object(Bucket=request.bucket, Key=request.key)["Body"].read()
    try:
        sheet = parse_sheet(raw)
    except ValidationError:
        return _fail(s3, request, INVALID_SHEET)
    try:
        from printer.render import render  # WeasyPrint loads pango: only when there is work

        rendered = render(sheet)
    except Exception as exc:  # noqa: BLE001  (any layout fault is the sheet's answer, not a retry)
        _log(outcome="render_error", error=type(exc).__name__, print_id=request.print_id)
        report(exc, "print", "render")
        return _fail(s3, request, RENDER_FAILED)
    s3.put_object(
        Bucket=request.bucket,
        Key=request.pdf_key,
        Body=rendered.pdf,
        ContentType="application/pdf",
        Metadata={"pages": str(rendered.pages)},
        Tagging=PRINT_TAG,
    )
    _log(
        outcome="printed",
        print_id=request.print_id,
        questions=len(sheet.questions),
        pages=rendered.pages,
        ms=round((time.monotonic() - started) * 1000),
    )
    return {"status": "ready", "pages": rendered.pages}


@functools.cache
def _client() -> S3:
    """One client per container, reused across invokes."""
    return boto3.client("s3")


def lambda_handler(event: object, _context: object) -> dict[str, Any]:
    try:
        request = parse_event(event, os.environ.get("UPLOADS_BUCKET") or None)
    except Refused as exc:
        _log(outcome="refused", code=exc.code)
        raise
    try:
        return print_sheet(request, _client())
    except Exception as exc:
        report(exc, "print", "print_sheet")
        raise
