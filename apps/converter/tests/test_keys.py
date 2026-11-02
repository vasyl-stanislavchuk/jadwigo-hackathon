"""The event names one attachment's source exactly, or it is refused."""

from __future__ import annotations

import pytest
from fixtures import ATTACHMENT, BUCKET, OTHER_POD, POD, event

from converter.errors import BAD_EVENT, Refused
from converter.keys import DOCX_MEDIA_TYPE, parse_event


@pytest.mark.parametrize(
    ("kind", "media_type"),
    [("pdf", "application/pdf"), ("docx", DOCX_MEDIA_TYPE), ("heic", "image/heic")],
)
def test_a_source_key_parses(kind: str, media_type: str) -> None:
    request = parse_event(event(kind, media_type), BUCKET)
    assert request.kind == kind
    assert request.prefix == f"pods/{POD}/attachments/{ATTACHMENT}/"
    assert request.page_key(3) == f"pods/{POD}/attachments/{ATTACHMENT}/p3.jpg"
    assert request.manifest_key == f"pods/{POD}/attachments/{ATTACHMENT}/pages.json"


def test_any_bucket_when_none_is_configured() -> None:
    assert parse_event(event("pdf", "application/pdf", bucket="elsewhere"), None).bucket == "elsewhere"


@pytest.mark.parametrize(
    "overrides",
    [
        {"bucket": "jadwigo-content-test"},
        {"key": f"pending/{POD}/{ATTACHMENT}"},
        {"key": f"pods/{OTHER_POD}/attachments/{ATTACHMENT}.pdf"},
        {"key": f"pods/{POD}/attachments/{ATTACHMENT}.docx"},
        {"key": f"pods/{POD}/attachments/{ATTACHMENT}/p1.jpg"},
        {"key": f"pods/{POD}/attachments/../attachments/{ATTACHMENT}.pdf"},
        {"key": f"/pods/{POD}/attachments/{ATTACHMENT}.pdf"},
        {"media_type": "image/jpeg"},
        {"media_type": "application/msword"},
        {"pod": "pod_x", "key": f"pods/pod_x/attachments/{ATTACHMENT}.pdf"},
        {"pod": POD.upper()},
        {"attachment_id": "att_0ccccccccccccccccccccccccc"},
        {"attachment_id": f"{ATTACHMENT}/x"},
        {"bucket": ""},
    ],
)
def test_anything_else_is_refused(overrides: dict[str, str]) -> None:
    with pytest.raises(Refused) as caught:
        parse_event({**event("pdf", "application/pdf"), **overrides}, BUCKET)
    assert caught.value.code == BAD_EVENT
    assert str(caught.value) == BAD_EVENT


@pytest.mark.parametrize("bad", [None, [], "pods/x", {"bucket": BUCKET}, {**event("pdf", "application/pdf"), "pod": 7}])
def test_a_malformed_event_is_refused(bad: object) -> None:
    with pytest.raises(Refused) as caught:
        parse_event(bad, BUCKET)
    assert caught.value.code == BAD_EVENT
