"""The handler against an in-process S3: the pages and the manifest it writes, the manifest it
returns as is, and each refusal leaving nothing behind.

The first half fakes the tools, so it runs everywhere. The second half runs soffice, poppler and
heif-convert where they are installed (fixtures.needs_*).
"""

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import pytest
from fixtures import (
    ATTACHMENT,
    BUCKET,
    POD,
    assert_clean_jpeg,
    docx_bytes,
    event,
    heic_bytes,
    jpeg_with_metadata,
    keys,
    needs_heif_convert,
    needs_poppler,
    needs_soffice,
    pdf_bytes,
)

from converter import handler, tools
from converter.errors import BAD_EVENT, ENCRYPTED, TOO_MANY_PAGES, UNREADABLE, Refused
from converter.keys import DOCX_MEDIA_TYPE, parse_event

PREFIX = f"pods/{POD}/attachments/{ATTACHMENT}"
KINDS = {"pdf": "application/pdf", "docx": DOCX_MEDIA_TYPE, "heic": "image/heic"}


def put_source(s3: Any, kind: str, data: bytes) -> dict[str, str]:
    s3.put_object(Bucket=BUCKET, Key=f"{PREFIX}.{kind}", Body=data)
    return event(kind, KINDS[kind])


def run(s3: Any, ev: dict[str, str], tmp_path: Path) -> dict[str, Any]:
    return handler.convert(parse_event(ev, BUCKET), s3, workroot=str(tmp_path))


def page_bodies(s3: Any, manifest: dict[str, Any]) -> list[bytes]:
    return [s3.get_object(Bucket=BUCKET, Key=p["key"])["Body"].read() for p in manifest["pages"]]


def fake_pdf_tools(monkeypatch: pytest.MonkeyPatch, pages: int) -> None:
    """pdfinfo and pdftoppm as stand-ins: pages photo-sized JPEGs with metadata."""

    def fake_render(_src: Path, workdir: Path, n: int) -> list[Path]:
        out = []
        for i in range(1, n + 1):
            path = workdir / f"page-{i}.jpg"
            path.write_bytes(jpeg_with_metadata((2480, 3508)))
            out.append(path)
        return out

    monkeypatch.setattr(tools, "pdf_pages", lambda _src: pages)
    monkeypatch.setattr(tools, "pdf_to_jpegs", fake_render)


def no_tools(monkeypatch: pytest.MonkeyPatch) -> None:
    def refuse(*_args: object) -> None:
        raise AssertionError("a stored manifest is returned without converting")

    for name in ("docx_to_pdf", "pdf_pages", "pdf_to_jpegs", "heic_to_jpeg"):
        monkeypatch.setattr(tools, name, refuse)


# --- Everywhere: the tools faked ---


def test_pages_then_the_manifest(s3: Any, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_pdf_tools(monkeypatch, 3)
    ev = put_source(s3, "pdf", b"%PDF-1.7 synthetic")

    manifest = run(s3, ev, tmp_path)

    assert [p["key"] for p in manifest["pages"]] == [f"{PREFIX}/p{n}.jpg" for n in (1, 2, 3)]
    for page, body in zip(manifest["pages"], page_bodies(s3, manifest), strict=True):
        image = assert_clean_jpeg(body)
        assert (page["width"], page["height"]) == image.size == (1414, 2000)
        assert page["bytes"] == len(body)
    stored = s3.get_object(Bucket=BUCKET, Key=f"{PREFIX}/pages.json")
    assert json.loads(stored["Body"].read()) == manifest
    assert stored["ContentType"] == "application/json"
    assert s3.head_object(Bucket=BUCKET, Key=f"{PREFIX}/p1.jpg")["ContentType"] == "image/jpeg"
    assert list(tmp_path.iterdir()) == [], "the work directory is gone"


def test_a_stored_manifest_is_returned_as_is(s3: Any, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_pdf_tools(monkeypatch, 2)
    ev = put_source(s3, "pdf", b"%PDF-1.7 synthetic")
    first = run(s3, ev, tmp_path)
    no_tools(monkeypatch)

    assert run(s3, ev, tmp_path) == first


def test_a_manifest_read_denied_means_not_converted_yet(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Without s3:ListBucket, S3 answers a missing key with 403, not 404."""
    from botocore.exceptions import ClientError

    class DeniedManifest:
        def __init__(self) -> None:
            self.puts: list[str] = []

        def get_object(self, **kw: Any) -> dict[str, Any]:
            if kw["Key"].endswith("pages.json"):
                raise ClientError({"Error": {"Code": "AccessDenied"}}, "GetObject")
            return {"Body": io.BytesIO(b"%PDF-1.7 synthetic")}

        def put_object(self, **kw: Any) -> dict[str, Any]:
            self.puts.append(kw["Key"])
            return {}

    fake_pdf_tools(monkeypatch, 1)
    s3 = DeniedManifest()
    run(s3, event("pdf", "application/pdf"), tmp_path)  # type: ignore[arg-type]
    assert s3.puts == [f"{PREFIX}/p1.jpg", f"{PREFIX}/pages.json"]


def test_another_s3_error_is_not_swallowed(tmp_path: Path) -> None:
    from botocore.exceptions import ClientError

    class Broken:
        def get_object(self, **_kw: Any) -> dict[str, Any]:
            raise ClientError({"Error": {"Code": "SlowDown"}}, "GetObject")

        def put_object(self, **_kw: Any) -> dict[str, Any]:
            raise AssertionError("nothing is written")

    with pytest.raises(ClientError):
        run(Broken(), event("pdf", "application/pdf"), tmp_path)  # type: ignore[arg-type]


def test_a_refusal_leaves_nothing(s3: Any, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    def too_many(_src: Path) -> int:
        raise Refused(TOO_MANY_PAGES)

    monkeypatch.setattr(tools, "pdf_pages", too_many)
    ev = put_source(s3, "pdf", b"%PDF-1.7 synthetic")
    with pytest.raises(Refused):
        run(s3, ev, tmp_path)
    assert keys(s3) == [f"{PREFIX}.pdf"]


def test_the_lambda_raises_the_code_and_logs_no_more(
    s3: Any, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("UPLOADS_BUCKET", BUCKET)
    with pytest.raises(Refused) as caught:
        handler.lambda_handler(event("pdf", "application/pdf", key="pods/x/secret-homework.pdf"), None)
    assert str(caught.value) == BAD_EVENT
    assert type(caught.value).__name__ == "Refused", "the runner reads errorType"
    logged = capsys.readouterr().out
    assert json.loads(logged) == {"service": "converter", "outcome": "refused", "code": BAD_EVENT}
    assert "secret-homework" not in logged


def test_the_lambda_converts_through_its_client(
    s3: Any, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("UPLOADS_BUCKET", BUCKET)
    monkeypatch.setattr(handler, "_client", lambda: s3)
    fake_pdf_tools(monkeypatch, 1)
    ev = put_source(s3, "pdf", b"%PDF-1.7 synthetic")

    assert len(handler.lambda_handler(ev, None)["pages"]) == 1
    line = json.loads(capsys.readouterr().out)
    assert line["outcome"] == "converted"
    assert set(line) == {"service", "outcome", "attachment_id", "kind", "pages", "ms"}


# --- Where the tools are installed ---


@needs_poppler
def test_a_3_page_pdf_becomes_3_clean_pages(s3: Any, tmp_path: Path) -> None:
    manifest = run(s3, put_source(s3, "pdf", pdf_bytes(3)), tmp_path)

    assert len(manifest["pages"]) == 3
    for page, body in zip(manifest["pages"], page_bodies(s3, manifest), strict=True):
        assert (page["width"], page["height"]) == assert_clean_jpeg(body).size == (1240, 1755)
    assert keys(s3) == sorted(
        [f"{PREFIX}.pdf", f"{PREFIX}/pages.json", *(f"{PREFIX}/p{n}.jpg" for n in (1, 2, 3))]
    )


@needs_poppler
def test_10_pages_is_the_most(s3: Any, tmp_path: Path) -> None:
    assert len(run(s3, put_source(s3, "pdf", pdf_bytes(10)), tmp_path)["pages"]) == 10


@pytest.mark.parametrize(
    ("data", "code"),
    [
        (lambda: pdf_bytes(11), TOO_MANY_PAGES),
        (lambda: pdf_bytes(2, owner_password="synthetic-owner"), ENCRYPTED),
        (lambda: pdf_bytes(2, user_password="synthetic-user"), ENCRYPTED),
        (lambda: b"%PDF-1.7\nthis is not a pdf body", UNREADABLE),
    ],
    ids=["11_pages", "owner_password", "user_password", "garbage"],
)
@needs_poppler
def test_a_pdf_it_refuses(s3: Any, tmp_path: Path, data: Any, code: str) -> None:
    ev = put_source(s3, "pdf", data())
    with pytest.raises(Refused) as caught:
        run(s3, ev, tmp_path)
    assert caught.value.code == code
    assert keys(s3) == [f"{PREFIX}.pdf"], "a refusal writes no page and no manifest"


@needs_poppler
def test_a_second_call_returns_the_manifest_without_converting(
    s3: Any, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    ev = put_source(s3, "pdf", pdf_bytes(2))
    first = run(s3, ev, tmp_path)
    no_tools(monkeypatch)
    assert run(s3, ev, tmp_path) == first


@needs_soffice
@needs_poppler
def test_a_docx_becomes_its_pages(s3: Any, tmp_path: Path) -> None:
    manifest = run(s3, put_source(s3, "docx", docx_bytes(2)), tmp_path)

    assert len(manifest["pages"]) == 2
    for body in page_bodies(s3, manifest):
        assert_clean_jpeg(body)


@needs_soffice
@needs_poppler
def test_a_docx_of_11_pages_is_refused(s3: Any, tmp_path: Path) -> None:
    ev = put_source(s3, "docx", docx_bytes(11))
    with pytest.raises(Refused) as caught:
        run(s3, ev, tmp_path)
    assert caught.value.code == TOO_MANY_PAGES


@needs_heif_convert
def test_a_heic_becomes_1_clean_page(s3: Any, tmp_path: Path) -> None:
    manifest = run(s3, put_source(s3, "heic", heic_bytes((3000, 2000))), tmp_path)

    [page] = manifest["pages"]
    [body] = page_bodies(s3, manifest)
    assert (page["width"], page["height"]) == assert_clean_jpeg(body).size == (2000, 1333)


@needs_heif_convert
def test_a_broken_heic_is_unreadable(s3: Any, tmp_path: Path) -> None:
    ev = put_source(s3, "heic", b"\x00\x00\x00\x18ftypheic not really")
    with pytest.raises(Refused) as caught:
        run(s3, ev, tmp_path)
    assert caught.value.code == UNREADABLE
