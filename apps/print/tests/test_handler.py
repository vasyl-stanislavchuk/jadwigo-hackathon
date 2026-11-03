"""The handler with an in-process S3: the event's checks, the cache, the error file, the PDF."""

from __future__ import annotations

import json

import pytest
from conftest import needs_pango
from fixtures import BUCKET, POD, draft_sheet

from printer.handler import BAD_EVENT, INVALID_SHEET, Refused, parse_event, print_sheet

PRINT_ID = "a" * 64
KEY = f"pods/{POD}/prints/{PRINT_ID}.json"


@pytest.mark.parametrize(
    "event",
    [
        None,
        {"bucket": BUCKET},
        {"bucket": BUCKET, "key": f"pods/{POD}/prints/{PRINT_ID}.pdf"},
        {"bucket": BUCKET, "key": f"pods/{POD}/attachments/{PRINT_ID}.json"},
        {"bucket": BUCKET, "key": f"pods/pod_x/prints/{PRINT_ID}.json"},
        {"bucket": BUCKET, "key": f"pods/{POD}/prints/{'A' * 64}.json"},
        {"bucket": BUCKET, "key": f"pods/{POD}/prints/../{PRINT_ID}.json"},
        {"bucket": "another", "key": KEY},
    ],
)
def test_an_event_off_its_key_is_refused(event: object) -> None:
    with pytest.raises(Refused) as caught:
        parse_event(event, BUCKET)
    assert caught.value.code == BAD_EVENT


def test_the_keys_sit_beside_the_sheet() -> None:
    request = parse_event({"bucket": BUCKET, "key": KEY}, BUCKET)
    assert request.pdf_key == f"pods/{POD}/prints/{PRINT_ID}.pdf"
    assert request.error_key == f"pods/{POD}/prints/{PRINT_ID}.error.json"


def _tags(s3, key: str) -> dict[str, str]:
    return {t["Key"]: t["Value"] for t in s3.get_object_tagging(Bucket=BUCKET, Key=key)["TagSet"]}


def _put(s3, body: bytes) -> None:
    s3.put_object(Bucket=BUCKET, Key=KEY, Body=body)


def test_a_sheet_with_a_key_gets_an_error_file(s3) -> None:
    raw = draft_sheet()
    raw["questions"][4]["data"]["key"] = {"accept": ["13"]}
    _put(s3, json.dumps(raw).encode())
    out = print_sheet(parse_event({"bucket": BUCKET, "key": KEY}, BUCKET), s3)
    assert out == {"status": "failed", "code": INVALID_SHEET}
    error = s3.get_object(Bucket=BUCKET, Key=f"pods/{POD}/prints/{PRINT_ID}.error.json")
    assert json.loads(error["Body"].read()) == {"code": INVALID_SHEET}
    assert _tags(s3, f"pods/{POD}/prints/{PRINT_ID}.error.json") == {"kind": "print"}


def test_a_stored_pdf_is_not_drawn_again(s3) -> None:
    s3.put_object(Bucket=BUCKET, Key=f"pods/{POD}/prints/{PRINT_ID}.pdf", Body=b"%PDF-")
    out = print_sheet(parse_event({"bucket": BUCKET, "key": KEY}, BUCKET), s3)
    assert out == {"status": "ready"}


@needs_pango
def test_a_sheet_becomes_a_pdf_beside_it(s3) -> None:
    _put(s3, json.dumps(draft_sheet()).encode())
    out = print_sheet(parse_event({"bucket": BUCKET, "key": KEY}, BUCKET), s3)
    assert out["status"] == "ready" and out["pages"] >= 4
    pdf = s3.get_object(Bucket=BUCKET, Key=f"pods/{POD}/prints/{PRINT_ID}.pdf")
    assert pdf["ContentType"] == "application/pdf"
    assert pdf["Metadata"] == {"pages": str(out["pages"])}
    assert pdf["Body"].read().startswith(b"%PDF-")
    assert _tags(s3, f"pods/{POD}/prints/{PRINT_ID}.pdf") == {"kind": "print"}, "the lifecycle rule expires it"
