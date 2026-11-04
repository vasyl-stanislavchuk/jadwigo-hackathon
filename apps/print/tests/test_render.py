"""The pure parts of the renderer: pairing, the page-break plan, text lookup, the fetch allowlist."""

from __future__ import annotations

import pytest
from conftest import needs_pango
from fixtures import MEDIA, draft_sheet

from printer.sheet import PrintSheet

pytestmark = needs_pango


def _sheet() -> PrintSheet:
    return PrintSheet.model_validate(draft_sheet())


def test_half_questions_pair_in_order() -> None:
    from printer.render import rows_of

    rows = rows_of(list(_sheet().questions))
    assert [[q.n for q in r.questions] for r in rows][:4] == [[1, 2], [3], [4], [5, 6]]
    assert [q.n for r in rows for q in r.questions] == list(range(1, 21)), "order never changes"


def test_breaks_move_to_an_action_change_at_no_cost() -> None:
    from printer.render import Row, plan_breaks

    q = {x.n: x for x in _sheet().questions}
    # circle, circle, write, write. The flow would put three rows on page 1 and break inside the
    # writing; the plan breaks between the circling and the writing, still on two pages.
    rows = [Row("r1", (q[1],)), Row("r3", (q[3],)), Row("r5", (q[5],)), Row("r6", (q[6],))]
    assert plan_breaks(rows, [30, 30, 30, 30], 10, 100, 100, pages=2) == {"r5"}
    # The end block follows the last question rather than start a page of its own.
    assert plan_breaks(rows, [40, 40, 40, 40], 10, 100, 100, pages=2) == {"r5"}


def test_breaks_never_cost_a_page() -> None:
    from printer.render import Row, plan_breaks

    q = {x.n: x for x in _sheet().questions}
    rows = [Row("r1", (q[1],)), Row("r5", (q[5],)), Row("r3", (q[3],))]
    # Only one page: no break is planned at all.
    assert plan_breaks(rows, [30, 30, 30], 5, 100, 100, pages=1) == set()


def test_text_is_looked_up_or_escaped() -> None:
    from printer.render import Text

    text = Text({"7 + 5": "<b>7</b> + 5"}, {})
    assert str(text.rich("7 + 5")) == "<b>7</b> + 5"
    assert str(text.rich("<script>")) == "&lt;script&gt;"
    assert text.split("Razem: {g1} zł {g2} gr") == [
        ("text", "Razem: "), ("marker", "g1"), ("text", " zł "), ("marker", "g2"), ("text", " gr")
    ]  # fmt: skip


def test_a_label_cannot_end_its_css_string() -> None:
    from printer.render import _css_str

    assert _css_str('a"b') == "a\\22 b"
    assert "\n" not in _css_str("a\nb")


def test_the_fetcher_allows_only_assets_and_the_media_origin() -> None:
    from printer.render import ASSETS, FetchRefused, url_fetcher_for

    fetch = url_fetcher_for(MEDIA)
    assert b".katex" in fetch((ASSETS / "katex.css").resolve().as_uri()).read(), "our assets are fetched"
    for url in ("https://evil.test/x.png", "file:///etc/passwd", "http://media.jadwigo.test/a.png",
                (ASSETS / ".." / "render.py").resolve().as_uri()):  # fmt: skip
        with pytest.raises(FetchRefused):
            fetch(url)


def test_pictures_from_two_origins_are_refused() -> None:
    from printer.render import FetchRefused, media_origin_of

    raw = draft_sheet()
    raw["media"] = {"a.png": f"{MEDIA}/a.png", "b.png": "https://other.test/b.png"}
    with pytest.raises(FetchRefused):
        media_origin_of(PrintSheet.model_validate(raw))


def test_a_line_with_a_slot_keeps_the_builders_maths() -> None:
    """The builder draws a whole line; the slot is filled inside that drawing, so its TeX and its
    notation print (a split line printed `$\\frac{1}{2}$` raw, dl-1eieq.8.13)."""
    from markupsafe import Markup

    from printer.render import Text

    line = "$\\frac{1}{2}$ {pick} $\\frac{1}{4}$"
    text = Text({line: '<span class="tex">½</span> {pick} <span class="tex">¼</span>',
                 "{g1} + 5 = 7": '<span class="slot" data-slot="g1"></span> + 5 = 7'}, {})  # fmt: skip
    assert text.fill(line, {"pick": Markup("<b>?</b>")}) == '<span class="tex">½</span> <b>?</b> <span class="tex">¼</span>'
    assert text.fill("{g1} + 5 = 7", {"g1": Markup("[ ]")}) == "[ ] + 5 = 7"
    assert text.fill("{g1} + 5 = 7", {}) == "{g1} + 5 = 7"
    assert text.fill("a < {x}", {"x": Markup("<i>b</i>")}) == "a &lt; <i>b</i>"
