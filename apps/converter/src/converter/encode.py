"""Every page leaves as a fresh JPEG: at most MAX_EDGE px on its long edge and MAX_BYTES, with no
Exif, XMP, ICC profile or comment, whatever the tool that rendered it wrote (wave 6 decision 58).

The pixels are copied into a new image before the save, so no metadata the decoder kept can ride
along: Pillow writes only the JFIF header and the scan.
"""

from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import Path
from typing import Final

from PIL import Image, ImageOps

from converter.errors import UNREADABLE, Refused

#: The long edge the browser re-encodes photos to (wave 5, apps/web's upload helper).
MAX_EDGE: Final = 2000
#: LIMITS.attachmentBytes in packages/contracts.
MAX_BYTES: Final = 4 * 1024 * 1024
#: Quality 85 first, lowered until the page fits MAX_BYTES.
QUALITIES: Final = (85, 75, 65, 55, 45, 35)
#: Pillow refuses an image of more than twice this many pixels as a decompression bomb. An A0
#: page at 150 dpi is about 70 million.
Image.MAX_IMAGE_PIXELS = 100_000_000


@dataclass(frozen=True)
class Page:
    data: bytes
    width: int
    height: int


def _rgb(image: Image.Image) -> Image.Image:
    """RGB, with any transparency laid on white, as a page is."""
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        rgba = image.convert("RGBA")
        white = Image.new("RGB", rgba.size, (255, 255, 255))
        white.paste(rgba, mask=rgba.getchannel("A"))
        return white
    return image.convert("RGB")


def reencode(path: Path) -> Page:
    """The page at path as a clean JPEG, or Refused(unreadable)."""
    try:
        with Image.open(path) as opened:
            upright = ImageOps.exif_transpose(opened)
            rgb = _rgb(upright)
    except (OSError, ValueError, Image.DecompressionBombError) as exc:
        raise Refused(UNREADABLE) from exc
    rgb.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
    clean = Image.frombytes("RGB", rgb.size, rgb.tobytes())
    for quality in QUALITIES:
        out = io.BytesIO()
        clean.save(out, "JPEG", quality=quality, optimize=True)
        if out.tell() <= MAX_BYTES:
            return Page(data=out.getvalue(), width=clean.width, height=clean.height)
    raise Refused(UNREADABLE)
