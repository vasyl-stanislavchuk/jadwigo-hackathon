"""dl-e8ov.5.2.18: the PII guard keeps learner names, emails and phone numbers off the model.

Fixtures of each kind in Polish and English, and a test over every prompt the lesson explanation
builds proving no learner's name reaches jw.muse.
"""

from __future__ import annotations

import datetime as dt
import json
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import pytest

from jw import explain
from jw.draw import History, draw
from jw.pii import (
    GuardedPrompt,
    guard,
    leaks,
    name_forms,
    names_for,
    restore,
    restore_stream,
)


@dataclass(frozen=True)
class Learner:
    """A learner record as the guard reads it (david-learns' LearnerInfo has more fields)."""

    handle: str
    name: str | None


BANK = Path(__file__).resolve().parent / "fixtures" / "bank"


# ---------------------------------------------------------------- names ------


@pytest.mark.parametrize(
    ("name", "forms"),
    [
        ("Kasia", {"Kasia", "Kasi", "Kasię", "Kasią", "Kasiu", "Kasio"}),
        ("Dawid", {"Dawida", "Dawidowi", "Dawidem", "Dawidzie"}),
        ("Tomek", {"Tomka", "Tomkowi", "Tomkiem", "Tomku"}),
        ("Jaś", {"Jasia", "Jasiowi", "Jasiem", "Jasiu"}),
        ("Magda", {"Magdy", "Magdę", "Magdą", "Magdzie", "Magdo"}),
        ("Michał", {"Michała", "Michałowi", "Michałem", "Michale"}),
        ("Julia", {"Julii", "Julię", "Julią"}),
    ],
)
def test_polish_name_forms(name: str, forms: set[str]) -> None:
    assert forms <= name_forms(name)


POLISH = [
    "Kasia nie rozumie dodawania. Pomóż Kasi, bo Kasię to martwi.",
    "Wczoraj z Kasią liczyliśmy do 100. Kasiu, spróbuj jeszcze raz!",
    "Dawid i Tomek grali. Daj to Dawidowi, a nie Tomkowi. Myślę o Dawidzie.",
    "kasia (małą literą) też jest imieniem.",
]
ENGLISH = [
    "Kasia's teacher says she rushes. Can Peter help Kasia?",
    "Tell Peter that Tomek is coming.",
]


@pytest.mark.parametrize("text", POLISH + ENGLISH)
def test_names_are_replaced_in_polish_and_english(text: str) -> None:
    names = ["Kasia", "Dawid", "Tomek", "Peter"]
    guarded = guard(text, names=names)
    assert leaks(guarded.text, names) == []
    assert "[NAME_1]" in guarded.text


def test_one_person_one_placeholder_and_restore_gives_the_name_back() -> None:
    guarded = guard("Kasia liczy. Pomóż Kasi. Dawid patrzy.", names=["Kasia", "Dawid"])
    assert guarded.text == "[NAME_1] liczy. Pomóż [NAME_1]. [NAME_2] patrzy."
    assert restore("Brawo, [NAME_1] i [NAME_2]!", guarded) == "Brawo, Kasia i Dawid!"


def test_words_that_only_start_like_a_name_stay() -> None:
    guarded = guard("Kasa w sklepie, kasztan, Mikasia i olej.", names=["Kasia", "Ola"])
    assert guarded.text == "Kasa w sklepie, kasztan, Mikasia i olej."


def test_a_word_that_starts_with_a_long_name_form_is_hidden_whole() -> None:
    # The price of catching diminutives: Kasiopeja starts with "Kasio" and goes too.
    guarded = guard("Kasiopeja na niebie.", names=["Kasia"])
    assert guarded.text == "[NAME_1] na niebie."


# Each of these reached a prompt before (PR #111's review). The checks read the text itself, not
# leaks(), which shares the guard's matcher and so could not catch them.
@pytest.mark.parametrize(
    ("names", "text", "gone"),
    [
        (["Michał"], "Michal nie umie mnożyć.", "Michal"),
        (["Łucja"], "Lucja liczy.", "Lucja"),
        (["Kasia"], "Pomóż Kasie.", "Kasie"),
        (["Kasia"], unicodedata.normalize("NFD", "Kasię martwi dzielenie."), "Kasi"),
        (["Kasia"], "KasiaNowak zrobiła to sama.", "Kasia"),
        (["Kasia"], "login kasia_k", "kasia"),
        (["Kasia"], "Kasiaaa!!!", "Kasia"),
        (["Kasia"], "Kasiunia i Kasieńka.", "Kasi"),
        (["Kuba"], "Z Kubusiem.", "Kub"),
        (["Ola"], "OlaNowak", "Ola"),
        # dl-u1y5.25: glued on the end of another word, or disguised by Unicode.
        (["Kasia"], "NowakKasia kochamKasię", "Kasi"),
        (["Kasia"], "Nowak\u200bKasia", "Kasi"),
        (["Kasia"], "\uff2b\uff41\uff53\uff49\uff41 liczy.", "Kasi"),  # full-width
        (["Kasia"], "\U0001d40a\U0001d41a\U0001d42c\U0001d422\U0001d41a liczy.", "Kasi"),  # math bold
        (["Kasia"], "Ka\u00adsia liczy.", "Kasi"),  # soft hyphen
        (["Kasia"], "Ka\u200bsia liczy.", "Kasi"),  # zero-width space
        (["Kasia"], "Ka\u200dsi\u2060a liczy.", "Kasi"),  # zero-width joiner, word joiner
    ],
)
def test_no_spelling_of_the_name_gets_through(
    names: list[str], text: str, gone: str
) -> None:
    out = guard(text, names=names).text
    assert gone.lower() not in _as_read(out), out
    assert "[NAME_1]" in out


def _as_read(text: str) -> str:
    """`text` as a reader sees it: no format characters, compatibility forms, lowercase, and
    without diacritics, so a full-width or zero-width spelling cannot pass by looking different."""
    visible = "".join(ch for ch in text if unicodedata.category(ch) != "Cf")
    return "".join(
        ch for ch in unicodedata.normalize("NFKD", visible).lower() if not unicodedata.combining(ch)
    )


def test_a_name_glued_after_a_lowercase_word_goes_but_not_inside_one() -> None:
    guarded = guard("NowakKasia kochamKasię, Mikasia i MIKASIA.", names=["Kasia"])
    assert guarded.text == "Nowak[NAME_1] kocham[NAME_1], Mikasia i MIKASIA."


def test_text_around_a_name_keeps_its_own_characters() -> None:
    # The matcher reads compatibility forms; the prompt keeps a square, a half, a soft hyphen
    # and full-width digits as typed.
    text = "Kasia: 5\u00b2 + \u00bd = ? Zada\u00adnie, \uff11\uff12."
    assert guard(text, names=["Kasia"]).text == "[NAME_1]: 5\u00b2 + \u00bd = ? Zada\u00adnie, \uff11\uff12."


# ---------------------------------------------------------------- emails -----


@pytest.mark.parametrize(
    "text",
    [
        "Mój mail to anna.kowalska+szkola@poczta.onet.pl, proszę pisać.",
        "Write to the parent at j.smith@example.co.uk any time.",
    ],
)
def test_emails_are_replaced(text: str) -> None:
    guarded = guard(text)
    assert "@" not in guarded.text
    assert "[EMAIL_1]" in guarded.text
    assert restore(guarded.text, guarded) == text


# ---------------------------------------------------------------- phones -----


@pytest.mark.parametrize(
    "phone",
    [
        "+48 600 700 800",
        "600-700-800",
        "600700800",
        "(22) 123 45 67",
        "+44 20 7946 0958",
        "(555) 123-4567",
    ],
)
def test_phones_are_replaced(phone: str) -> None:
    for text in (
        f"Zadzwoń pod {phone} po lekcji.",
        f"Call me on {phone} after the lesson.",
    ):
        guarded = guard(text)
        assert "[PHONE_1]" in guarded.text, guarded.text
        assert restore(guarded.text, guarded) == text


@pytest.mark.parametrize(
    "text",
    [
        "Ile to 27 + 45?",
        "Dodawanie do 100 i do 1000.",
        "W 2026 roku, 3 klasa.",
        "345 + 278 = 623",
    ],
)
def test_maths_is_not_a_phone_number(text: str) -> None:
    assert guard(text).text == text


# ---------------------------------------------------------------- the seal ---


def test_only_guard_seals_a_prompt() -> None:
    assert guard("x").sealed
    assert not GuardedPrompt(text="Kasia", replacements={}).sealed


def test_restore_stream_handles_a_placeholder_split_across_chunks() -> None:
    guarded = guard("Kasia", names=["Kasia"])
    chunks = ["Brawo, [NA", "ME_1]! Dalej", ", [NAME_1]."]
    assert "".join(restore_stream(chunks, guarded)) == "Brawo, Kasia! Dalej, Kasia."


def test_names_for_takes_the_learner_and_the_pod() -> None:
    learner = Learner(handle="kasia", name="Kasia Nowak")
    assert names_for(learner, ["Dawid Nowak", "J."]) == [
        "Kasia",
        "Nowak",
        "kasia",
        "Dawid",
    ]


# ---------------------------------------------- every explanation prompt -----


def _pages() -> dict[str, dict]:
    return {
        p.stem: json.loads(p.read_text(encoding="utf-8"))
        for p in (BANK / "sets").glob("*.json")
    }


@pytest.mark.parametrize("kind", ["practice", "check", "diagnostic"])
@pytest.mark.parametrize("language", ["pl", "en"])
@pytest.mark.parametrize(
    "note",
    [
        None,
        "Kasia płacze przy zadaniach z Dawidem. Mój tel. 600 700 800, mail mama@kowalscy.pl.",
        "Kasia's brother Dawid helps her; call +44 20 7946 0958.",
    ],
)
def test_no_prompt_the_explanation_builds_carries_a_learner_name(
    kind: str, language: str, note: str | None
) -> None:
    pages = _pages()
    envelope = json.loads((BANK / "envelope.json").read_text(encoding="utf-8"))
    # The fixture rows name made-up sets: point them at the fixture pages.
    envelope["rows"] = [
        {**envelope["rows"][0], "id": set_id, "rank": rank}
        for rank, set_id in enumerate(sorted(pages), start=1)
    ]
    drawn = draw(
        envelope,
        pages,
        kind=kind,
        history=History(),
        language=language,
        today=dt.date(2026, 10, 28),
    )
    assert drawn.questions
    names = ["Kasia", "kasia", "Nowak", "Dawid"]
    built = explain.prompts(
        "Kasia", drawn, pages, language=language, parent_note=note, names=names
    )
    assert built
    for prompt in built:
        assert prompt.sealed
        assert leaks(prompt.text, names) == [], prompt.text
        assert "@" not in prompt.text
        assert "600 700 800" not in prompt.text and "7946" not in prompt.text


def test_the_prompt_tells_the_model_to_keep_placeholders_as_written() -> None:
    pages = _pages()
    envelope = {"rows": [{"id": "set_khan_fx0001", "rank": 1}]}
    drawn = draw(envelope, pages, kind="practice", today=dt.date(2026, 10, 28))
    (prompt,) = explain.prompts("Kasia", drawn, pages)
    assert "[NAME_1]" in prompt.text
    assert "Copy it exactly as written" in prompt.text


def test_the_explanation_hides_each_part_of_the_learner_s_full_name() -> None:
    pages = _pages()
    envelope = json.loads((BANK / "envelope.json").read_text(encoding="utf-8"))
    envelope["rows"] = [
        {**envelope["rows"][0], "id": set_id, "rank": rank}
        for rank, set_id in enumerate(sorted(pages), start=1)
    ]
    drawn = draw(
        envelope,
        pages,
        kind="practice",
        history=History(),
        language="pl",
        today=dt.date(2026, 10, 28),
    )
    note = "Kasia nie lubi ułamków."
    for prompt in explain.prompts("Kasia Kowalska", drawn, pages, parent_note=note):
        assert "Kasia" not in prompt.text and "Kowalsk" not in prompt.text, prompt.text
