"""Every page leaves as a clean JPEG of at most 2000 px and 4 MB."""

from __future__ import annotations

import io
from pathlib import Path

import pytest
from fixtures import assert_clean_jpeg, jpeg_markers, jpeg_with_metadata, photo

from converter import encode
from converter.errors import UNREADABLE, Refused


def test_a_large_photo_with_metadata_leaves_clean(tmp_path: Path) -> None:
    src = tmp_path / "in.jpg"
    src.write_bytes(jpeg_with_metadata((3000, 2000)))
    assert {0xE1, 0xE2, 0xFE} <= set(jpeg_markers(src.read_bytes())), "the fixture carries Exif, ICC and a comment"

    page = encode.reencode(src)

    image = assert_clean_jpeg(page.data)
    assert (page.width, page.height) == image.size == (2000, 1333)


def test_the_orientation_is_applied_before_it_is_dropped(tmp_path: Path) -> None:
    src = tmp_path / "in.jpg"
    src.write_bytes(jpeg_with_metadata((300, 100), orientation=6))  # rotate 90 on display

    page = encode.reencode(src)

    assert_clean_jpeg(page.data)
    assert (page.width, page.height) == (100, 300)


def test_a_small_page_keeps_its_size(tmp_path: Path) -> None:
    src = tmp_path / "in.png"
    photo((1240, 1754)).save(src)
    page = encode.reencode(src)
    assert (page.width, page.height) == (1240, 1754)
    assert_clean_jpeg(page.data)


def test_transparency_lies_on_white(tmp_path: Path) -> None:
    from PIL import Image

    src = tmp_path / "in.png"
    Image.new("RGBA", (50, 50), (0, 0, 0, 0)).save(src)
    page = encode.reencode(src)
    pixel = Image.open(io.BytesIO(page.data)).getpixel((25, 25))
    assert isinstance(pixel, tuple)
    assert min(pixel) > 245


def test_quality_drops_until_the_page_fits(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    src = tmp_path / "in.jpg"
    src.write_bytes(jpeg_with_metadata((2000, 2000)))
    at_85 = len(encode.reencode(src).data)
    monkeypatch.setattr(encode, "MAX_BYTES", at_85 - 1)

    page = encode.reencode(src)

    assert len(page.data) < at_85
    assert_clean_jpeg(page.data)


def test_a_page_that_never_fits_is_unreadable(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    src = tmp_path / "in.jpg"
    src.write_bytes(jpeg_with_metadata((500, 500)))
    monkeypatch.setattr(encode, "MAX_BYTES", 100)
    with pytest.raises(Refused) as caught:
        encode.reencode(src)
    assert caught.value.code == UNREADABLE


def test_bytes_that_are_no_image_are_unreadable(tmp_path: Path) -> None:
    src = tmp_path / "in.jpg"
    src.write_bytes(b"not an image at all")
    with pytest.raises(Refused) as caught:
        encode.reencode(src)
    assert caught.value.code == UNREADABLE
