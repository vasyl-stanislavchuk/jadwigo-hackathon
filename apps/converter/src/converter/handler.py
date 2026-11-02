"""The converter Lambda (dl-z5ja.11.8, wave 6 decision 58).

The runner invokes it over IAM with S3 keys, never bytes (decision 59):

    event:   {"bucket", "key", "media_type", "pod", "attachment_id"}
    success: {"pages": [{"key", "width", "height", "bytes"}, ...]}
    refusal: raises Refused, so the invoke carries FunctionError with errorType "Refused" and
             errorMessage one of bad_event, too_many_pages, encrypted, unreadable (errors.py).

The source is `pods/<pod>/attachments/<id>.<heic|pdf|docx>`. Its pages go to
`pods/<pod>/attachments/<id>/p<n>.jpg`, then `pages.json` beside them, last, so a manifest names
only pages already written. A call that finds the manifest returns it without converting: a later
turn that reads the same file costs one GET.

Logs carry the attachment id, the kind, the page count and the outcome: never a file's name, its
text or a tool's output.
"""

from __future__ import annotations

import functools
import json
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Protocol

import boto3

from converter import tools
from converter.encode import reencode
from converter.errors import Refused
from converter.keys import Request, parse_event


class S3(Protocol):
    """The two calls the converter makes, as boto3's S3 client has them."""

    def get_object(self, **kwargs: Any) -> dict[str, Any]: ...

    def put_object(self, **kwargs: Any) -> dict[str, Any]: ...


# A missing manifest answers 404 with s3:ListBucket and 403 without it; the role has no List, so
# both mean "not converted yet". A real denial fails again on the source's GET, and raises there.
_ABSENT = {"NoSuchKey", "404", "AccessDenied", "403"}


def _log(**fields: object) -> None:
    print(json.dumps({"service": "converter", **fields}, sort_keys=True), flush=True)


def _error_code(exc: Exception) -> str | None:
    response = getattr(exc, "response", None)
    if isinstance(response, dict):
        code = response.get("Error", {}).get("Code")
        return str(code) if code is not None else None
    return None


def _stored_manifest(s3: S3, request: Request) -> dict[str, Any] | None:
    try:
        body = s3.get_object(Bucket=request.bucket, Key=request.manifest_key)["Body"].read()
    except Exception as exc:
        if _error_code(exc) in _ABSENT:
            return None
        raise
    manifest = json.loads(body)
    if not isinstance(manifest, dict) or not isinstance(manifest.get("pages"), list):
        return None
    return manifest


def _render(request: Request, src: Path, workdir: Path) -> list[Path]:
    if request.kind == "heic":
        return [tools.heic_to_jpeg(src, workdir)]
    pdf = tools.docx_to_pdf(src, workdir) if request.kind == "docx" else src
    return tools.pdf_to_jpegs(pdf, workdir, tools.pdf_pages(pdf))


def convert(request: Request, s3: S3, workroot: str | None = None) -> dict[str, Any]:
    """The attachment's pages: the stored manifest if there is one, else converted and stored."""
    stored = _stored_manifest(s3, request)
    if stored is not None:
        _log(outcome="stored", attachment_id=request.attachment_id, pages=len(stored["pages"]))
        return stored
    started = time.monotonic()
    with tempfile.TemporaryDirectory(dir=workroot, prefix="convert-") as tmp:
        workdir = Path(tmp)
        src = workdir / f"source.{request.kind}"
        src.write_bytes(s3.get_object(Bucket=request.bucket, Key=request.key)["Body"].read())
        pages = []
        for n, path in enumerate(_render(request, src, workdir), start=1):
            page = reencode(path)
            key = request.page_key(n)
            s3.put_object(
                Bucket=request.bucket, Key=key, Body=page.data, ContentType="image/jpeg"
            )
            pages.append(
                {"key": key, "width": page.width, "height": page.height, "bytes": len(page.data)}
            )
    manifest = {"pages": pages}
    s3.put_object(
        Bucket=request.bucket,
        Key=request.manifest_key,
        Body=json.dumps(manifest).encode(),
        ContentType="application/json",
    )
    _log(
        outcome="converted",
        attachment_id=request.attachment_id,
        kind=request.kind,
        pages=len(pages),
        ms=round((time.monotonic() - started) * 1000),
    )
    return manifest


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
        return convert(request, _client())
    except Refused as exc:
        _log(outcome="refused", code=exc.code, attachment_id=request.attachment_id)
        raise
