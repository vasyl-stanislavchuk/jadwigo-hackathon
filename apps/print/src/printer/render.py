"""A PrintSheet becomes a PDF: Jinja draws the paper HTML, WeasyPrint lays it out in two passes.

Pass 1 lays the sheet out as it flows and reads where every row of cards starts and ends from
`page.anchors`. Pass 2 moves page breaks to where the paper action changes (circling to writing,
say) wherever that keeps the same number of pages, so the child meets one kind of work per page
when it costs no paper; when it would cost a sheet, compactness wins. Rows never split (each card
and each pair is `break-inside: avoid`), so moving a break never cuts a question.
"""

from __future__ import annotations

import logging
import math
import re
from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from jinja2 import Environment, FileSystemLoader, StrictUndefined
from jinja2.runtime import Macro
from markupsafe import Markup, escape

from printer import _macos  # noqa: F401  (before weasyprint: Homebrew's pango on a Mac)
from weasyprint import CSS, HTML
from weasyprint.text.fonts import FontConfiguration
from weasyprint.urls import FatalURLFetchingError, URLFetcher

from printer import geometry as geom
from printer.sheet import PrintQuestion, PrintSheet

log = logging.getLogger(__name__)

HERE = Path(__file__).parent
TEMPLATES = HERE / "templates"
ASSETS = HERE / "assets"

#: The question types with no paper form: PAPER_FORMS in packages/contracts/src/print.ts says "no"
#: for these alone (decision dl-jo99l). The builder refuses them, so no sheet carries one.
NO_PAPER = frozenset({"explain"})

#: The families whose macros draw each question type, one template each.
FAMILY_TEMPLATES = ("choose", "enter", "slots", "sequence", "group", "place")

#: CSS px per mm: WeasyPrint's anchors are in CSS px.
PX_PER_MM = 96 / 25.4

#: A marker in a template: `{g1}` for a gap, `{o2}` for an inline option, `{pick}` for a line's pick.
MARKER = re.compile(r"\{([A-Za-z][A-Za-z0-9_]*)\}")
#: A slot in the builder's drawn HTML (lesson-kit paper/text.ts), or a `{marker}` it left as text.
DRAWN_SLOT = re.compile(r'<span class="slot" data-slot="([^"]*)"></span>|\{([A-Za-z][A-Za-z0-9_]*)\}')


class FetchRefused(FatalURLFetchingError):
    """A URL outside the allowlist: fatal, so the render fails rather than drop it quietly."""


class AllowlistFetcher(URLFetcher):
    """Fetches only our own assets on disk and pictures from the sheet's one media origin.

    Redirects are not followed, so a picture URL cannot bounce the fetch somewhere else.
    """

    def __init__(self, media_origin: str | None) -> None:
        super().__init__(timeout=10, allow_redirects=False, allowed_protocols=("file", "https"))
        self._assets = ASSETS.resolve().as_uri() + "/"
        self._media_origin = media_origin

    def fetch(self, url: str, headers: Any = None) -> Any:
        if url.startswith(self._assets) and ".." not in url:
            return super().fetch(url, headers)
        if self._media_origin and _origin(url) == self._media_origin:
            return super().fetch(url, headers)
        raise FetchRefused(url)


def url_fetcher_for(media_origin: str | None) -> AllowlistFetcher:
    return AllowlistFetcher(media_origin)


def _origin(url: str) -> str:
    parts = urlsplit(url)
    return f"{parts.scheme}://{parts.netloc}" if parts.scheme == "https" else ""


def media_origin_of(sheet: PrintSheet) -> str | None:
    """The one https origin every picture comes from, or None when the sheet has no picture."""
    origins = {_origin(u) for u in sheet.media.values()}
    if not origins:
        return None
    if len(origins) != 1 or "" in origins:
        raise FetchRefused("the sheet's pictures come from more than one https origin")
    return origins.pop()


# --- Jinja --------------------------------------------------------------------------------------
def _env() -> Environment:
    env = Environment(
        loader=FileSystemLoader(TEMPLATES),
        # HTML is escaped; the stylesheet is not, and quotes its words with `css_str` instead.
        autoescape=lambda name: name is not None and name.endswith(".html.j2"),
        undefined=StrictUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.globals["geom"] = geom
    env.globals["half_types"] = geom.HALF_TYPES
    env.filters["mm"] = lambda v: f"{v:.2f}mm"
    env.filters["num"] = _num
    env.filters["css_str"] = _css_str
    env.globals["sin_deg"] = lambda a: math.sin(math.radians(a))
    env.globals["cos_deg"] = lambda a: math.cos(math.radians(a))
    env.globals["framed"] = _framed
    env.globals["only_text"] = lambda stem: not (
        stem.image or stem.pictures or stem.terminal or stem.figure or stem.reference
    )
    env.globals["gaps_by_id"] = lambda gaps: {gap.id: gap for gap in gaps}
    return env


def _framed(q: PrintQuestion) -> bool:
    """A choose question whose options are drawings: each gets a frame the child circles."""
    return any(o.content.kind in ("image", "pictures", "array") for o in q.data.options)


def _css_str(value: str) -> str:
    """A label as a CSS string's inside: a quote, a backslash or a line break cannot end it."""
    return "".join(c if c.isprintable() and c not in "\\\"'<>" else f"\\{ord(c):x} " for c in value)


def _num(value: float) -> str:
    """A number as a child reads it: no ".0", and a decimal comma (the lesson's language is pl)."""
    if float(value).is_integer():
        return str(int(value))
    return f"{value:g}".replace(".", ",")


ENV = _env()


def forms() -> dict[str, Any]:
    """Every question type's macro, by type: the paper-declaration test reads this."""
    out: dict[str, Any] = {}
    for family in FAMILY_TEMPLATES:
        module = ENV.get_template(f"forms/{family}.html.j2").module
        for name in dir(module):
            value = getattr(module, name)
            if not name.startswith("_") and isinstance(value, Macro):
                out[name] = value
    return out


# --- The sheet's text ---------------------------------------------------------------------------
@dataclass(frozen=True)
class Text:
    """Lesson strings as the builder drew them (`sheet.html`), or escaped when it drew nothing."""

    html: dict[str, str]
    media: dict[str, str]

    def rich(self, s: str | None) -> Markup:
        if not s:
            return Markup("")
        drawn = self.html.get(s)
        return Markup(drawn) if drawn is not None else escape(s)

    def split(self, template: str) -> list[tuple[str, str]]:
        """A template as ("text", piece) and ("marker", name) parts, in reading order."""
        parts: list[tuple[str, str]] = []
        pos = 0
        for m in MARKER.finditer(template):
            if m.start() > pos:
                parts.append(("text", template[pos : m.start()]))
            parts.append(("marker", m.group(1)))
            pos = m.end()
        if pos < len(template):
            parts.append(("text", template[pos:]))
        return parts

    def fill(self, template: str, markers: dict[str, Any]) -> Markup:
        """The template as the builder drew it (maths and notation kept), each slot or `{marker}`
        replaced by its markup. A marker with no markup prints as written, `{name}`."""
        drawn = self.html.get(template)
        if drawn is None:
            return Markup("").join(
                escape(piece) if kind == "text" else markers.get(piece, "{" + piece + "}")
                for kind, piece in self.split(template)
            )

        def put(m: re.Match[str]) -> str:
            name = m.group(1) if m.group(1) is not None else m.group(2)
            value = markers.get(name)
            if value is not None:
                return str(value)
            return m.group(0) if m.group(2) is not None else "{" + name + "}"

        return Markup(DRAWN_SLOT.sub(put, drawn))

    def src(self, src: str) -> str:
        """A picture's absolute URL; one the API did not resolve is not drawn."""
        return self.media.get(src, "")


# --- Layout -------------------------------------------------------------------------------------
@dataclass(frozen=True)
class Row:
    """One row on paper: a full-width card, or two half cards read left then right."""

    id: str
    questions: tuple[PrintQuestion, ...]

    @property
    def first_action(self) -> str:
        return self.questions[0].action

    @property
    def last_action(self) -> str:
        return self.questions[-1].action


def is_half(q: PrintQuestion) -> bool:
    """Half the width when the type's class says so and nothing in its stem needs the whole width."""
    if q.question_type not in geom.HALF_TYPES:
        return False
    stem = getattr(q.data, "stem", None)
    if stem is not None and (stem.pictures or stem.image or stem.terminal or stem.reference):
        return False
    if q.family == "enter" and q.data.input == "text":
        return False
    return True


def rows_of(questions: list[PrintQuestion]) -> list[Row]:
    """Pairs two half questions that follow each other; the lesson's order never changes."""
    rows: list[Row] = []
    i = 0
    while i < len(questions):
        q = questions[i]
        nxt = questions[i + 1] if i + 1 < len(questions) else None
        if nxt is not None and is_half(q) and is_half(nxt):
            rows.append(Row(f"r{q.n}", (q, nxt)))
            i += 2
        else:
            rows.append(Row(f"r{q.n}", (q,)))
            i += 1
    return rows


#: The block after the last question: the star, "Koniec!" and the answer card.
END_ID = "end"


#: A page (but the last) filled less than this costs what one break at an action change gains, so
#: grouping the work never leaves a page nearly empty.
MIN_FILL = 0.5


def plan_breaks(rows: list[Row], heights: list[float], end_h: float, first_cap: float, cap: float,
                pages: int) -> set[str]:  # fmt: skip
    """The rows to start a page with, so the sheet keeps `pages` pages and its breaks fall where
    the paper action changes as often as possible. Every height includes the gap after it.

    A dynamic programme over where each page starts: the fewest pages first, then the best score
    (a break at an action change +1, a page but the last under MIN_FILL -1, the end block alone on
    a page -1), then the latest breaks (fuller early pages).
    """
    n = len(rows)
    h = [*heights, end_h]  # unit n is the end block

    def start_score(i: int) -> int:
        if i == 0:
            return 0
        if i == n:
            return -1
        return 1 if rows[i - 1].last_action != rows[i].first_action else 0

    best: dict[int, tuple[int, int, tuple[int, ...]]] = {n + 1: (0, 0, ())}
    for i in reversed(range(n + 1)):
        limit = first_cap if i == 0 else cap
        used = 0.0
        choice: tuple[int, int, tuple[int, ...]] | None = None
        for e in range(i, n + 1):
            used += h[e]
            if used > limit and e > i:
                break
            p, s, starts = best[e + 1]
            sparse = 1 if e < n and used < MIN_FILL * limit else 0
            cand = (p + 1, s - start_score(i) + sparse, (i, *starts))
            if choice is None or cand[:2] < choice[:2] or (cand[:2] == choice[:2] and cand[2] > choice[2]):
                choice = cand
        assert choice is not None
        best[i] = choice

    total, _, starts = best[0]
    if total > pages:
        return set()
    return {rows[i].id if i < n else END_ID for i in starts if i > 0}


# --- Render -------------------------------------------------------------------------------------
@dataclass(frozen=True)
class Rendered:
    pdf: bytes
    pages: int
    #: Every anchor's page (0-based), x and y in CSS px, from the document written out.
    anchors: dict[str, tuple[int, float, float]]


def _html(sheet: PrintSheet, rows: list[Row], breaks: set[str], last_page: int | None) -> str:
    text = Text(sheet.html, sheet.media)
    css = ENV.get_template("paper.css.j2").render(sheet=sheet, last_page=last_page,
                                                  tex_colours=geom.TEX_COLOURS)  # fmt: skip
    return ENV.get_template("sheet.html.j2").render(
        sheet=sheet, rows=rows, breaks=breaks, text=text, forms=forms(), css=Markup(css), pages=last_page
    )


@cache
def _katex_css() -> CSS:
    """KaTeX's stylesheet, parsed once: it is most of a layout's time, so only maths pays for it."""
    return CSS(filename=str(ASSETS / "katex.css"), url_fetcher=AllowlistFetcher(None),
               font_config=FONTS)  # fmt: skip


#: One font configuration for every layout in this process, so each @font-face is read once.
FONTS = FontConfiguration()


def _uses_katex(sheet: PrintSheet) -> bool:
    return any('class="katex' in drawn for drawn in sheet.html.values())


def _layout(sheet: PrintSheet, rows: list[Row], breaks: set[str], last_page: int | None,
            fetcher: URLFetcher) -> Any:  # fmt: skip
    source = _html(sheet, rows, breaks, last_page)
    sheets = [_katex_css()] if _uses_katex(sheet) else []
    html = HTML(string=source, base_url=ASSETS.resolve().as_uri() + "/", url_fetcher=fetcher)
    return html.render(stylesheets=sheets, font_config=FONTS)


def _anchors(document: Any) -> dict[str, tuple[int, float, float]]:
    out: dict[str, tuple[int, float, float]] = {}
    for index, page in enumerate(document.pages):
        for name, (x, y, *_rest) in page.anchors.items():
            out.setdefault(name, (index, x, y))
    return out


def _measure(rows: list[Row], anchors: dict[str, tuple[int, float, float]]) -> tuple[list[float], float]:
    gap = geom.CARD_GAP_MM * PX_PER_MM
    heights = [anchors[f"{r.id}-end"][2] - anchors[r.id][2] + gap for r in rows]
    end_h = anchors[f"{END_ID}-end"][2] - anchors[END_ID][2]
    return heights, end_h


def render(sheet: PrintSheet, fetcher: URLFetcher | None = None) -> Rendered:
    """The sheet's PDF and its page count. Raises `FetchRefused` for a picture off the allowlist.

    Two layouts: the flow, then the planned breaks with the last page's footer (no "dalej" on it).
    """
    fetcher = fetcher or url_fetcher_for(media_origin_of(sheet))
    rows = rows_of(list(sheet.questions))

    first = _layout(sheet, rows, set(), None, fetcher)
    pages = len(first.pages)
    breaks: set[str] = set()
    if sheet.card == "ticks":
        anchors = _anchors(first)
        heights, end_h = _measure(rows, anchors)
        flow_top = geom.MARGIN_MM * PX_PER_MM
        cap = (geom.PAGE_H_MM - geom.MARGIN_MM - geom.MARGIN_MM - geom.FOOTER_H_MM) * PX_PER_MM
        # Page 1's footer is taller: it holds the legend under the title line.
        first_cap = cap - (anchors[rows[0].id][2] - flow_top) - (geom.FIRST_FOOTER_H_MM - geom.FOOTER_H_MM) * PX_PER_MM
        breaks = plan_breaks(rows, heights, end_h, first_cap, cap, pages)

    final = _layout(sheet, rows, breaks, pages, fetcher)
    if breaks and len(final.pages) != pages:
        # The plan's arithmetic missed by a hair (a rounding at a page's foot): keep the flow.
        log.info("print.breaks_dropped pages=%d", pages)
        final = _layout(sheet, rows, set(), pages, fetcher)
    return Rendered(pdf=final.write_pdf(), pages=len(final.pages), anchors=_anchors(final))
