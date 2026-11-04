"""The golden geometry: the PDF is the paper geometry.py declares (dl-1eieq.8.2)."""

from __future__ import annotations

import io
import re
from pathlib import Path

import pytest
from fixtures import LEAD_FIXTURE
from pypdf import PdfReader

from printer import geometry as geom

#: CSS px per mm: WeasyPrint's anchors are in CSS px. Every test reading `rendered` skips without pango.
PX_PER_MM = 96 / 25.4

TEMPLATES = Path(__file__).parents[1] / "src" / "printer" / "templates"

#: The lead's 20-question lesson takes 5 pages: the plan's sketch had 4, and the owner chose room
#: over that squeeze (review round 1, dl-1eieq.8.13).
PAGES = 5


def test_the_lead_fixture_is_there() -> None:
    """The golden tests draw the lead's fixture (dl-1eieq.8.1), never a stand-in."""
    assert LEAD_FIXTURE.exists(), LEAD_FIXTURE


def _reader(rendered) -> PdfReader:
    return PdfReader(io.BytesIO(rendered.pdf))


def test_every_page_is_a4(rendered) -> None:
    for page in _reader(rendered).pages:
        assert float(page.mediabox.width) == pytest.approx(595.28, abs=0.01)
        assert float(page.mediabox.height) == pytest.approx(841.89, abs=0.01)


def test_the_page_count_is_pinned(rendered) -> None:
    assert rendered.pages == PAGES
    assert len(_reader(rendered).pages) == PAGES


def test_andika_is_embedded(rendered) -> None:
    fonts: set[str] = set()
    for page in _reader(rendered).pages:
        for font in page["/Resources"]["/Font"].values():
            font = font.get_object()
            if "/FontDescriptor" in font or "/DescendantFonts" in font:
                fonts.add(str(font["/BaseFont"]))
    assert any(re.search(r"\+Andika$", f) for f in fonts), fonts
    assert any(re.search(r"\+Andika-Bold$", f) for f in fonts), fonts


def test_the_instructions_are_14pt(rendered) -> None:
    sizes: list[float] = []

    def visit(text, cm, tm, font, size) -> None:  # noqa: ANN001
        if "Czy to prawda" in text:
            sizes.append(size * tm[0] * cm[0])

    _reader(rendered).pages[0].extract_text(visitor_text=visit)
    assert sizes, "the first instruction is on page 1"
    assert all(s == pytest.approx(geom.BODY_PT, abs=0.05) for s in sizes), sizes


def test_card_one_sits_at_the_margin(rendered) -> None:
    page, x, _y = rendered.anchors["q1"]
    assert page == 0
    assert x == pytest.approx(geom.MARGIN_MM * PX_PER_MM, abs=0.5)


def test_every_card_is_on_one_page(rendered) -> None:
    starts = [k for k in rendered.anchors if re.fullmatch(r"q\d+", k)]
    assert len(starts) == 20
    for name in starts:
        assert rendered.anchors[name][0] == rendered.anchors[f"{name}-end"][0], name


def test_no_template_writes_a_size() -> None:
    """geometry.py is the only place a size is written: no mm, pt or px in a template."""
    for path in TEMPLATES.rglob("*.j2"):
        found = re.findall(r"(?<![\w.{])\d+(?:\.\d+)?(?:mm|pt|px)\b", path.read_text())
        assert not found, f"{path.name}: {found}"
