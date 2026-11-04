"""A picture's labels on paper, placed as the screen's Picture places them (dl-1eieq.8.14).

Khan's drawings carry their words apart from the image: axis numbers, a bar's name, a clock's
numerals, each at drawing coordinates inside the drawing's range. The screen draws them over the
image (packages/lesson-kit/src/parts/Picture.tsx, labelWidths.ts); without them a bar graph has no
scale and the question cannot be answered on paper. This is a port of those rules:

- a label sits at percent positions from the range, shifted by its alignment;
- labels sharing a row (the same y and alignment) wrap within the gap to their nearest neighbour,
  in plain words when the label is only ``\\text{…}``;
- a graph's y-axis title, centred left of x = 0, is turned a quarter left and kept in the box;
- a ``<br>`` is a line break.

The builder draws each line as ``$line$`` (and the plain words of a ``\\text{…}`` line) into
``sheet.html``, so this module only looks them up.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING

from markupsafe import Markup, escape

from printer import geometry as geom

if TYPE_CHECKING:
    from printer.render import Text
    from printer.sheet import Picture, PictureLabel

BR = re.compile(r"<br\s*/?>", re.IGNORECASE)
SMALL = re.compile(r"\\small\s*\{([^{}]*)\}")
TEXT_ONLY = re.compile(r"^\\text\s*\{([^{}\\$]*)\}(?:\\hphantom\{[^{}]*\})?$")


@dataclass(frozen=True)
class Placed:
    """One label as the template draws it: where, how it is shifted, how wide, what it says."""

    left: float
    top: float
    transform: str
    wrap: float | None
    vertical: bool
    html: Markup


def label_lines(content: str) -> list[str]:
    return [line.strip() for line in BR.split(content)]


def text_only(tex: str) -> str | None:
    m = TEXT_ONLY.match(tex.strip())
    return m.group(1) if m else None


def _row_key(label: PictureLabel) -> str:
    return f"{label.coordinates[1]:.6f} {' '.join(sorted(label.alignment.split())) or 'center'}"


def _widths(items: list[PictureLabel], x0: float, x1: float) -> list[float | None]:
    xs = [100 * (lb.coordinates[0] - x0) / (x1 - x0) for lb in items]
    out: list[float | None] = []
    for i, lb in enumerate(items):
        gaps = [
            abs(xs[j] - xs[i])
            for j, m in enumerate(items)
            if j != i and _row_key(m) == _row_key(lb) and abs(xs[j] - xs[i]) > 0
        ]
        out.append(min(gaps) if gaps else None)
    return out


def _shift(alignment: str) -> str:
    words = alignment.split()
    x = "-100%" if "left" in words else "0%" if "right" in words else "-50%"
    y = "-100%" if "above" in words else "0%" if "below" in words else "-50%"
    return f"translate({x}, {y})"


def _line(label: PictureLabel, line: str, wrap: float | None, text: Text) -> Markup:
    if label.math is False:
        return text.rich(line)
    words = text_only(line) if wrap is not None else None
    if words is not None:
        return escape(words)
    drawn = text.html.get(f"${line}$")
    # A sheet built before the builder drew labels: its words or number, without the TeX around them.
    return Markup(drawn) if drawn is not None else escape(text_only(line) or SMALL.sub(r"\1", line))


def placed(picture: Picture, text: Text) -> list[Placed]:
    """The picture's labels, placed; none when it has none."""
    if picture.labels is None:
        return []
    (x0, x1), (y0, y1) = picture.labels.range
    items = picture.labels.items
    widths = _widths(items, x0, x1)
    out: list[Placed] = []
    for label, wrap in zip(items, widths, strict=True):
        left = 100 * (label.coordinates[0] - x0) / (x1 - x0)
        top = 100 - 100 * (label.coordinates[1] - y0) / (y1 - y0)
        vertical = label.alignment.strip() == "center" and x0 < 0 < x1 and label.coordinates[0] < 0
        shift = _shift(label.alignment)
        html = Markup("<br>").join(_line(label, line, wrap, text) for line in label_lines(label.content))
        out.append(
            Placed(
                left=max(left, geom.LABEL_AXIS_INSET_PCT) if vertical else left,
                top=top,
                transform=f"{shift} rotate(-90deg)" if vertical else shift,
                wrap=wrap,
                vertical=vertical,
                html=html,
            )
        )
    return out


def picture_width_mm(picture: Picture, max_w: float, max_h: float) -> float:
    """The picture's printed width: its own size, within the box, its shape kept, so the labels'
    percent positions stay on the drawing."""
    own = picture.width * 25.4 / 96
    return min(own, max_w, max_h * picture.width / picture.height)


def label_pt(picture: Picture, width_mm: float, wrapped: bool) -> float:
    """The labels' size: the screen's (text-sm, text-xs when wrapped) scaled as the picture is,
    never under what a child reads on paper."""
    scale = width_mm / (picture.width * 25.4 / 96)
    size = (geom.LABEL_WRAP_PT if wrapped else geom.LABEL_PT) * scale
    return max(size, geom.LABEL_MIN_PT)
