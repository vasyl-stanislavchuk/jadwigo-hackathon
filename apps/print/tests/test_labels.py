"""A picture's labels print over it, as the screen places them (dl-1eieq.8.14)."""

from __future__ import annotations

import io
from typing import Any

import pytest
from conftest import needs_pango, offline_fetcher
from fixtures import MEDIA, draft_sheet
from pypdf import PdfReader

from printer.sheet import PrintSheet

pytestmark = needs_pango

#: A bar graph as Khan draws one: a y-axis of numbers, two bar names under it, the axis title.
LABELS: dict[str, Any] = {
    "range": [[-1, 4], [-1, 10]],
    "items": [
        {"content": "\\small{0}", "coordinates": [0, 0], "alignment": "left"},
        {"content": "\\small{10}", "coordinates": [0, 10], "alignment": "left"},
        {"content": "\\text{Słonecznie}", "coordinates": [1, -0.2], "alignment": "below"},
        {"content": "\\text{Deszczo}<br>\\text{wo}", "coordinates": [2, -0.2], "alignment": "below"},
        {"content": "Dni", "coordinates": [-0.8, 5], "alignment": "center", "math": False},
    ],
}


def _picture() -> Any:
    from printer.sheet import Picture

    return Picture.model_validate({"src": "g.svg", "alt": "wykres", "width": 400, "height": 300, "labels": LABELS})


def test_labels_sit_where_the_screen_puts_them() -> None:
    from printer.labels import placed
    from printer.render import Text

    text = Text({"$\\small{0}$": "<span>0</span>", "$\\small{10}$": "<span>10</span>"}, {})
    zero, ten, sunny, rainy, title = placed(_picture(), text)
    assert (zero.left, zero.top) == (20.0, pytest.approx(90.909, abs=0.01))
    assert zero.transform == "translate(-100%, -50%)", "left of its point, centred on it"
    assert ten.top == pytest.approx(0.0)
    assert str(zero.html) == "<span>0</span>", "the builder's drawing"
    # Two names on one row wrap within the gap to each other, in plain words.
    assert sunny.wrap == pytest.approx(20.0) and str(sunny.html) == "Słonecznie"
    assert str(rainy.html) == "Deszczo<br>wo", "a <br> is a line break, never text"
    assert sunny.transform == "translate(-50%, 0%)"
    assert title.vertical and title.transform.endswith("rotate(-90deg)")
    assert str(title.html) == "Dni"


def test_a_picture_keeps_its_shape_in_the_box() -> None:
    from printer.labels import picture_width_mm

    p = _picture()  # 400 x 300 px: 105.8 mm wide at its own size
    assert picture_width_mm(p, 120, 60) == pytest.approx(80.0), "60 mm high at most, so 80 mm wide"
    assert picture_width_mm(p, 50, 60) == pytest.approx(50.0)


def test_a_labelled_picture_prints_its_labels() -> None:
    from printer.render import render

    raw = draft_sheet()
    q = raw["questions"][4]  # production: an enter question with a stem
    q["data"]["stem"] = {"text": "6 + 7 =", "pictures": [{"src": "g.svg", "alt": "wykres", "width": 400, "height": 300, "labels": LABELS}]}
    raw["media"] = {"g.svg": f"{MEDIA}/g.svg"}
    raw["html"] = {**raw["html"], "$\\small{10}$": "10", "Słonecznie": "Słonecznie"}
    pdf = render(PrintSheet.model_validate(raw), offline_fetcher(raw)).pdf
    words = "".join(page.extract_text() for page in PdfReader(io.BytesIO(pdf)).pages)
    for label in ("10", "Słonecznie", "Dni"):
        assert label in words, label
    assert "\\small" not in words and "\\text" not in words
