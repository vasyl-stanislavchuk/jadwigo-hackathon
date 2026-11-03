"""Sheets built in code (no real lesson, no bank text: fence 8).

`sheet()` is the lead's `tests/fixtures/mixed-20.sheet.json` (dl-1eieq.8.1), which the golden
tests draw. `draft_sheet()` is the lane's own 20 questions in the sketch's order, which the no-keys
and handler tests plant fields in.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

FIXTURES = Path(__file__).parent / "fixtures"
LEAD_FIXTURE = FIXTURES / "mixed-20.sheet.json"
MEDIA = "https://media.jadwigo.test"
BUCKET = "jadwigo-uploads-test"
POD = "pod_0000000000000000000000000a"

LABELS: dict[str, Any] = {
    "brand": "Jadwigo",
    "name": "Imię:",
    "date": "Data:",
    "page": "strona",
    "page_of": "z",
    "next": "dalej",
    "end": "Koniec!",
    "legend": {
        "circle": "otocz",
        "tick": "zaznacz ✓",
        "write": "wpisz",
        "draw": "narysuj lub pokoloruj",
        "join": "połącz",
        "number": "ponumeruj",
    },
    "true_word": "Prawda",
    "false_word": "Fałsz",
    "many": "(może być kilka)",
    "total": "Razem",
    "hours_hand": "Krótka wskazówka pokazuje godziny.",
    "card_title": "Karta odpowiedzi",
    "card_note": "Zaznacz ✓ każde zadanie, które masz już zrobione.",
    "credits_title": "Skąd są zadania",
    "alfik_note": "Zamaluj całe kółko przy jednej literze, czarnym długopisem.",
    "alfik_mark": "Tak zaznaczaj",
    "alfik_no_mark": "Tak nie zaznaczaj",
    "alfik_change": "Zmieniasz zdanie? Przekreśl kółko znakiem X i zamaluj to, które wybierasz.",
    "alfik_title": "Zaznacz odpowiedzi",
}


def katex_frac(n: int, d: int) -> str:
    """KaTeX 0.19's HTML for \\frac{n}{d}, as the builder draws it (the TeX spike's output)."""
    return (
        '<span class="katex"><span class="katex-html" aria-hidden="true"><span class="katex-base">'
        '<span class="katex-strut" style="height:1.1901em;vertical-align:-0.345em;"></span>'
        '<span class="mord"><span class="mopen nulldelimiter"></span><span class="mfrac">'
        '<span class="vlist-t vlist-t2"><span class="vlist-r"><span class="vlist" style="height:0.8451em;">'
        '<span style="top:-2.655em;"><span class="pstrut" style="height:3em;"></span>'
        '<span class="katex-sizing reset-size6 size3 mtight"><span class="mord mtight">'
        f'<span class="mord mtight">{d}</span></span></span></span>'
        '<span style="top:-3.23em;"><span class="pstrut" style="height:3em;"></span>'
        '<span class="frac-line" style="border-bottom-width:0.04em;"></span></span>'
        '<span style="top:-3.394em;"><span class="pstrut" style="height:3em;"></span>'
        '<span class="katex-sizing reset-size6 size3 mtight"><span class="mord mtight">'
        f'<span class="mord mtight">{n}</span></span></span></span></span>'
        '<span class="vlist-s">​</span></span><span class="vlist-r"><span class="vlist" style="height:0.345em;">'
        '<span></span></span></span></span></span><span class="mclose nulldelimiter"></span></span>'
        "</span></span></span>"
    )


def _q(n: int, qt: str, family: str, action: str, say: str, data: dict[str, Any], *,
       paper: str = "adapted", credit_n: int | None = None) -> dict[str, Any]:  # fmt: skip
    return {
        "n": n,
        "question_type": qt,
        "paper": paper,
        "action": action,
        "say": say,
        "credit_n": credit_n,
        "family": family,
        "data": data,
    }


def _text(i: str, t: str) -> dict[str, Any]:
    return {"id": i, "content": {"kind": "text", "text": t}}


def _bools() -> list[dict[str, Any]]:
    return [
        {"id": "t", "content": {"kind": "bool", "bool": True}},
        {"id": "f", "content": {"kind": "bool", "bool": False}},
    ]


def draft_sheet() -> dict[str, Any]:
    """The sketch's 20 questions, every one a different paper form where the sketch allows."""
    num = {"input": "number", "entry": "keypad"}
    questions = [
        _q(1, "true_false", "choose", "circle", "Czy to prawda?",
           {"stem": {"text": "7 + 5 = 12"}, "options": _bools(), "select": "one", "layout": "binary"}),
        _q(2, "true_false", "choose", "circle", "Czy to prawda?",
           {"stem": {"text": "9 + 9 = 17"}, "options": _bools(), "select": "one", "layout": "binary"}),
        _q(3, "lettered_choice", "choose", "circle", "Która suma jest równa 15?",
           {"options": [{**_text("a", "7 + 7"), "letter": "A"}, {**_text("b", "8 + 7"), "letter": "B"},
                        {**_text("c", "9 + 5"), "letter": "C"}, {**_text("d", "6 + 8"), "letter": "D"}],
            "select": "one", "layout": "lettered"}, paper="yes", credit_n=1),
        _q(4, "recognition", "choose", "circle", "Na którym obrazku jest 12 kropek?",
           {"options": [{"id": "a", "content": {"kind": "array", "rows": 3, "cols": 4}},
                        {"id": "b", "content": {"kind": "array", "rows": 2, "cols": 5}},
                        {"id": "c", "content": {"kind": "array", "rows": 2, "cols": 7}}],
            "select": "one", "layout": "grid"}),
        _q(5, "production", "enter", "write", "Ile to jest?", {"stem": {"text": "6 + 7 ="}, **num}),
        _q(6, "production", "enter", "write", "Ile to jest?", {"stem": {"text": "15 − 8 ="}, **num}),
        _q(7, "column", "slots", "write", "Dodaj w słupku.",
           {"template": "", "gaps": [{"id": "g1", "kind": "enter", "input": "number"}],
            "column": {"op": "add", "operands": [27, 35], "given_steps": 0, "carry_row": True}}, paper="yes"),
        _q(8, "money_count", "slots", "write", "Ile to razem?",
           {"figure": {"kind": "coins", "items": ["zl2", "zl1", "gr50"], "alt": "monety"},
            "template": "Razem: {g1} zł {g2} gr",
            "gaps": [{"id": "g1", "kind": "enter", "input": "number", "max_length": 2},
                     {"id": "g2", "kind": "enter", "input": "number", "max_length": 2}]}, paper="yes"),
        _q(9, "clock_read", "slots", "write", "Która godzina?",
           {"figure": {"kind": "clock", "h": 4, "m": 15, "alt": "zegar"},
            "template": "{g1} : {g2}",
            "gaps": [{"id": "g1", "kind": "enter", "input": "number", "max_length": 2, "range": [1, 12]},
                     {"id": "g2", "kind": "enter", "input": "number", "max_length": 2, "range": [0, 59]}]},
           paper="yes"),
        _q(10, "clock_set", "place", "draw", "Narysuj wskazówki.",
           {"surface": "clock", "target_label": "3:30", "minute_step": 30, "hands": "geared"}),
        _q(11, "fill_table", "slots", "write", "Uzupełnij tabelę.",
           {"template": "", "table": {"header": ["+", "3", "5", "8"], "rows": [["4", "{g1}", "9", "{g2}"],
                                                                             ["6", "9", "{g3}", "14"]]},
            "gaps": [{"id": f"g{i}", "kind": "enter", "input": "number"} for i in (1, 2, 3)]}),
        _q(12, "pyramid", "slots", "write", "Uzupełnij piramidę.",
           {"template": "", "pyramid": [["{g1}"], ["{g2}", 9], [3, 4, 5]],
            "gaps": [{"id": "g1", "kind": "enter", "input": "number"},
                     {"id": "g2", "kind": "enter", "input": "number"}]}, paper="yes"),
        _q(13, "fraction_shade", "place", "draw", "Pokoloruj trzy czwarte.",
           {"surface": "fraction", "shape": "rect", "parts": 4, "label": "3/4"}),
        _q(14, "fraction_compare", "choose", "circle", "Który znak pasuje?",
           {"options": [_text("lt", "<"), _text("eq", "="), _text("gt", ">")], "select": "one", "layout": "inline",
            "line": "$\\frac{1}{2}$ {pick} $\\frac{2}{3}$"}, paper="yes"),
        _q(15, "number_line_place", "place", "draw", "Zaznacz 35 na osi.",
           {"surface": "number_line", "min": 0, "max": 50, "step": 5, "labelled": [0, 10, 20, 30, 40, 50],
            "target_label": 35}),
        _q(16, "order", "sequence", "number", "Ułóż od najmniejszej do największej.",
           {"items": [{"id": "a", "text": "48"}, {"id": "b", "text": "12"}, {"id": "c", "text": "30"},
                      {"id": "d", "text": "7"}], "first_label": "najmniejsza", "last_label": "największa"}),
        _q(17, "match", "group", "join", "Połącz działanie z wynikiem.",
           {"groups": [{"id": "x", "label": "15"}, {"id": "y", "label": "14"}, {"id": "z", "label": "16"}],
            "items": [{"id": "a", "label": "8 + 6"}, {"id": "b", "label": "9 + 6"}, {"id": "c", "label": "7 + 9"}],
            "each_item": "one"}),
        _q(18, "bucket", "group", "join", "Parzyste czy nieparzyste?",
           {"groups": [{"id": "p", "label": "parzyste"}, {"id": "n", "label": "nieparzyste"}],
            "items": [{"id": "a", "label": "4"}, {"id": "b", "label": "7"}, {"id": "c", "label": "10"},
                      {"id": "d", "label": "13"}], "each_item": "one", "layout": "zones"}),
        _q(19, "money_pay", "place", "circle", "Otocz monety, które dają 3 zł 50 gr.",
           {"surface": "coins", "bank": ["zl2", "zl1", "gr50"], "amount_label": "3 zł 50 gr", "slots": 4}),
        _q(20, "draw_graph", "place", "draw", "Pokoloruj słupki: ile owoców?",
           {"surface": "bars", "kind": "bar", "max": 10, "step": 1,
            "categories": [{"id": "a", "label": "jabłka"}, {"id": "b", "label": "gruszki"},
                           {"id": "c", "label": "śliwki"}, {"id": "d", "label": "banany"}],
            "starting": {"a": 2}}),
    ]  # fmt: skip
    return {
        "renderer": 1,
        "language": "pl",
        "title": "Dodawanie i czas",
        "labels": copy.deepcopy(LABELS),
        "card": "ticks",
        "questions": questions,
        "credits": [
            {"n": 1, "short": "Khan Academy · CC BY-NC-SA 4.0", "line": "Z Khan Academy, przetłumaczone, CC BY-NC-SA 4.0.", "url": "https://www.khanacademy.org/"}
        ],
        "html": {"$\\frac{1}{2}$ ": katex_frac(1, 2) + " ", " $\\frac{2}{3}$": " " + katex_frac(2, 3)},
        "media": {},
    }


def alfik_sheet() -> dict[str, Any]:
    """A lesson made only of lettered_choice, which gets the Alfik card (decision dl-7eyqd)."""
    base = draft_sheet()
    q3 = base["questions"][2]
    questions = [{**copy.deepcopy(q3), "n": i, "credit_n": None} for i in range(1, 7)]
    return {**base, "card": "alfik", "questions": questions, "credits": []}


def sheet() -> dict[str, Any]:
    """The lead's 20-question fixture (dl-1eieq.8.1), which the golden tests draw."""
    return json.loads(LEAD_FIXTURE.read_text())


def picture_svg(width: int = 800, height: int = 400) -> bytes:
    """A stand-in for a media picture: a framed box of the size a real one would take."""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}"><rect x="2" y="2" width="{width - 4}" height="{height - 4}" '
        'fill="none" stroke="#000" stroke-width="4"/></svg>'
    ).encode()
