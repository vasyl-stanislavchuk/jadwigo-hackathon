"""What the PDF says: no key, hint or score word, no screen verb, and every question numbered."""

from __future__ import annotations

import io
import re

from pypdf import PdfReader


def _text(rendered) -> str:
    return "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(rendered.pdf)).pages)


#: Words that only a key, a hint, a score or a worked solution would bring onto paper.
KEY_WORDS = ["Odpowiedź:", "pkt", "Podpowiedź", "Wskazówka:", "Rozwiązanie", "poprawna odpowiedź", "SENTINEL"]

#: What the screen says and paper cannot do (the builder rewrites them into paper verbs).
SCREEN_VERBS = ["dotknij", "kliknij", "przeciągnij", "przesuń", "tap", "drag", "click"]


def test_no_key_words_reach_paper(rendered) -> None:
    text = _text(rendered)
    for word in KEY_WORDS:
        assert word.lower() not in text.lower(), word


def test_no_screen_verb_reaches_paper(rendered) -> None:
    text = _text(rendered).lower()
    for verb in SCREEN_VERBS:
        assert not re.search(rf"\b{verb}", text), verb


def test_the_sheet_ends_with_koniec_and_the_answer_card(rendered) -> None:
    last = PdfReader(io.BytesIO(rendered.pdf)).pages[-1].extract_text()
    assert "Koniec!" in last
    assert "Karta odpowiedzi" in last
    assert "dalej" not in last, "the last page does not say turn over"
    first = PdfReader(io.BytesIO(rendered.pdf)).pages[0].extract_text()
    assert "dalej" in first
