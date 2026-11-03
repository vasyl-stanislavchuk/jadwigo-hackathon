"""Shared fixtures: the sheet rendered once per run, an in-process S3, and no AWS credential.

Tests that lay a sheet out need pango (WeasyPrint's text engine). They skip where it is missing,
as the converter's needs_* tests do; the Lambda image and CI have it (`brew install pango` on a Mac).
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any

import boto3
import pytest
from fixtures import BUCKET, sheet
from moto import mock_aws

try:
    from printer.render import Rendered, render

    PANGO: str | None = None
except OSError as exc:  # WeasyPrint could not load pango, gobject or harfbuzz
    PANGO = str(exc).splitlines()[0]

needs_pango = pytest.mark.skipif(PANGO is not None, reason=f"pango is not installed: {PANGO}")


@pytest.fixture(autouse=True)
def _no_aws(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("AWS_PROFILE", "AWS_SESSION_TOKEN", "UPLOADS_BUCKET"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_DEFAULT_REGION", "eu-central-1")


@pytest.fixture
def s3() -> Iterator[Any]:
    with mock_aws():
        client = boto3.client("s3", region_name="eu-central-1")
        client.create_bucket(
            Bucket=BUCKET, CreateBucketConfiguration={"LocationConstraint": "eu-central-1"}
        )
        yield client


def offline_fetcher(raw: dict[str, Any]):
    """The renderer's own allowlist fetcher, with every media picture served from memory: unit
    tests never touch the network (fence 6)."""
    from fixtures import picture_svg
    from weasyprint.urls import URLFetcherResponse

    from printer.render import AllowlistFetcher, media_origin_of
    from printer.sheet import PrintSheet

    origin = media_origin_of(PrintSheet.model_validate(raw))

    class Offline(AllowlistFetcher):
        def fetch(self, url: str, headers: Any = None) -> Any:
            if origin and url.startswith(origin + "/"):
                return URLFetcherResponse(url, picture_svg(), {"Content-Type": "image/svg+xml"})
            return super().fetch(url, headers)

    return Offline(origin)


@pytest.fixture(scope="session")
def rendered() -> "Rendered":
    """The 20-question fixture, laid out once for every test that reads its PDF."""
    if PANGO is not None:
        pytest.skip(f"pango is not installed: {PANGO}")
    from printer.sheet import PrintSheet

    raw = sheet()
    return render(PrintSheet.model_validate(raw), offline_fetcher(raw))
