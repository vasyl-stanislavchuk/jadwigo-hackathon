"""The PII guard: no learner's name leaves the machine in a model prompt (dl-e8ov.5.2.18).

The product's one model, muse-spark-1.3-contributor, trains on its inputs (its model card, and
jadwigo-question-bank/decisions/2026-10-28-one-model-spark-contributor-for-every-bank-and-product-
call-user). So every prompt that carries a parent's or a child's words passes `guard()` first: it
replaces learner names, email addresses and phone numbers with placeholders and returns a
`GuardedPrompt` holding the map, so a reply can have the names put back on the way out.

`jw.muse.ask` takes a `GuardedPrompt`, never a string, and refuses one this module did not seal.

Names come from the learner record and the pod's members (`names_for`). Polish names inflect, so
a name is matched in every case form a sentence can use: Kasia, Kasi, Kasię, Kasią, Kasiu; Dawid,
Dawida, Dawidowi, Dawidem, Dawidzie; Tomek, Tomka, Tomkiem. Matching ignores case, because a
child types "kasia" as often as "Kasia", and it ignores diacritics, because a phone keyboard
drops them ("Michal", "Lucja", "Kasie"). A name form of 4 letters or more is also matched at the
start of a longer word, which takes the whole word: glued text ("KasiaNowak"), a padded name
("Kasiaaa") and a diminutive on the same stem ("Kasiunia", "Kubusiem"). The cost is the odd common word that spells a name form
(the learner Maja against "mają", "they have"): it becomes a placeholder too. That costs the prompt
a word; the other way would cost a child's name.

Restoring puts a name back in its dictionary form: the model sees one placeholder per person, so
it cannot tell which case the original used.
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable, Iterator, Mapping
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Protocol


class LearnerInfo(Protocol):
    """What the guard reads of a learner record: david-learns' LearnerInfo has both fields."""

    @property
    def handle(self) -> str: ...

    @property
    def name(self) -> str | None: ...


# Only guard() builds a sealed prompt; jw.muse refuses any other.
_SEAL = object()

NAME = "NAME"
EMAIL = "EMAIL"
PHONE = "PHONE"
_PLACEHOLDER_RE = re.compile(r"\[(?:NAME|EMAIL|PHONE)_\d+\]")

EMAIL_RE = re.compile(r"(?<![\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)+(?![\w-])")
# A run of digits with single spaces, dots or dashes between groups, an optional +country code and
# an optional (area code). Kept only when it holds 9 or more digits, so "27 + 45", "do 100" and a
# year never match; Polish numbers have 9 digits, UK and US numbers 10 or more.
PHONE_RE = re.compile(
    r"(?<![\w+])(?:\+\d{1,3}[ .-]?)?(?:\(\d{1,4}\)[ .-]?)?\d{2,4}(?:[ .-]?\d{2,4}){1,4}(?!\w)"
)
_MIN_PHONE_DIGITS = 9


@dataclass(frozen=True)
class GuardedPrompt:
    """A prompt the guard has seen: its text with placeholders, and the map to undo them."""

    text: str
    replacements: Mapping[
        str, str
    ]  # placeholder -> original (a name in its dictionary form)
    _seal: object = field(default=None, repr=False, compare=False)

    @property
    def sealed(self) -> bool:
        return self._seal is _SEAL


# ---------------------------------------------------------------- names ------

# Locative and vocative endings soften the last consonant: Dawid -> Dawidzie, Piotr -> Piotrze,
# Marta -> Marcie, Michał -> Michale, Jadwiga -> Jadwidze, Agnieszka -> Agnieszce.
_SOFTEN = {
    "d": ("dzie",),
    "t": ("cie",),
    "r": ("rze",),
    "ł": ("le",),
    "g": ("dze",),
    "k": ("ce", "ku"),
    "b": ("bie",),
    "n": ("nie",),
    "m": ("mie",),
    "w": ("wie",),
    "s": ("sie",),
    "p": ("pie",),
}
# Soft consonants spell their stem with an i before a vowel: Jaś -> Jasia, Staś -> Stasiem.
_SOFT_STEM = {"ś": "si", "ć": "ci", "ń": "ni", "ź": "zi", "ż": "ż"}


def name_forms(name: str) -> set[str]:
    """Every form `name` takes in a Polish or English sentence, the name itself included.

    A rule set over the name's ending, not a dictionary, so a name the code has never seen still
    inflects: -ia (Kasia, Julia), -a (Ola, Magda, Marta, Kuba), -ek (Tomek, Marek), a soft
    consonant (Jaś, Staś) and any other consonant (Dawid, Jan, Piotr, Michał).
    """
    name = name.strip()
    if not name:
        return set()
    forms = {name}
    low = name.lower()
    if low.endswith("ia"):  # Kasia: Kasi, Kasię, Kasią, Kasiu, Kasio; Julia: Julii
        stem = name[:-1]
        forms |= {stem + e for e in ("", "a", "ę", "ą", "u", "o", "i")}
    elif low.endswith("a"):  # Ola: Oli, Olę, Olą, Olo; Magda: Magdy, Magdzie; Ewa: Ewie
        stem = name[:-1]
        forms |= {stem + e for e in ("a", "y", "i", "ę", "ą", "o", "e", "ie", "u")}
        last = stem[-1:].lower()
        forms |= {stem[:-1] + e for e in _SOFTEN.get(last, ())}
    elif low.endswith("o"):  # Józio, Franio: Józia, Józiowi, Józiem
        stem = name[:-1]
        forms |= {stem + e for e in ("a", "u", "owi", "em", "o")}
    else:
        stems = [name]
        last = low[-1]
        if last in _SOFT_STEM:  # Jaś: Jasia, Jasiowi, Jasiem, Jasiu
            stems = [name[:-1] + _SOFT_STEM[last]]
        elif (
            low.endswith("ek") and len(name) > 3
        ):  # Tomek: Tomka, Tomkiem (the e drops)
            stems = [name, name[:-2] + "k"]
        for stem in stems:
            forms |= {
                stem + e for e in ("a", "owi", "em", "iem", "u", "ie", "e", "y", "ów")
            }
            forms |= {stem[:-1] + e for e in _SOFTEN.get(stem[-1:].lower(), ())}
    # English possessive and plural: "Kasia's", "the Kowalskis"
    forms |= {f + "'s" for f in list(forms)} | {name + "s"}
    return {f for f in forms if len(f) >= 2}


def names_for(
    learner: LearnerInfo | None = None, members: Iterable[str] = ()
) -> list[str]:
    """The names to guard for one learner: the display name, the handle and every pod member's."""
    names: list[str] = []
    if learner is not None:
        if learner.name:
            names.extend(learner.name.split())
        names.append(learner.handle)
    for member in members:
        names.extend(member.split())
    # A one-letter token ("J.") is not a name worth a placeholder; it would eat every "a" and "i".
    return list(dict.fromkeys(n.strip(".,") for n in names if len(n.strip(".,")) >= 2))


# A form this long is a name at the start of any word; a shorter one ("Ola", "Jan") only as a
# whole word, or it would eat "olej" and "jabłko".
_PREFIX_LEN = 4


def _fold(text: str) -> str:
    """`text` lowercased and without diacritics, one character for each character of `text`,
    so a match in the folded text is a span of the same length in the original: Łucja -> lucja."""
    out = []
    for ch in text:
        base = "l" if ch in "łŁ" else unicodedata.normalize("NFD", ch)[0]
        low = base.lower()
        out.append(low if len(low) == 1 else base)
    return "".join(out)


def _names_pattern(
    names: Iterable[str],
) -> tuple[re.Pattern[str], dict[str, str]] | None:
    """A pattern over folded text, and each folded form's name in its dictionary form."""
    form_of: dict[str, str] = {}
    for name in names:
        for form in name_forms(unicodedata.normalize("NFC", name)):
            form_of.setdefault(_fold(form), name)
    if not form_of:
        return None
    # Longest first, so "Kasią" wins over "Kasi" and "Dawidowi" over "Dawid".
    alternatives = sorted(form_of, key=len, reverse=True)
    body = "|".join(re.escape(f) for f in alternatives)
    return re.compile(f"(?:{body})"), form_of


def _name_spans(text: str, names: Iterable[str]) -> list[tuple[int, int, str]]:
    """Where `names` stand in `text` (NFC): (start, end, the name in its dictionary form)."""
    compiled = _names_pattern(names)
    if compiled is None:
        return []
    pattern, form_of = compiled
    folded = _fold(text)
    spans: list[tuple[int, int, str]] = []
    at = 0
    while (m := pattern.search(folded, at)) is not None:
        start, end = m.span()
        at = start + 1
        if start > 0 and text[start - 1].isalpha():
            continue  # inside a word: "Mikasia" is not Kasia
        if len(m.group()) >= _PREFIX_LEN:
            while end < len(text) and text[end].isalpha():
                end += 1  # the whole word: "Kasiunia", "KasiaNowak"
        elif end < len(text) and text[end].isalpha() and not text[end].isupper():
            continue  # "olej" is not Ola; "OlaNowak" is
        spans.append((start, end, form_of[m.group()]))
        at = end
    return spans


# ---------------------------------------------------------------- guard ------


def guard(text: str, *, names: Iterable[str] = ()) -> GuardedPrompt:
    """Replace learner names, emails and phone numbers in `text`; return the sealed prompt.

    Pure: no file, no network. The same original always gets the same placeholder within one call,
    so "Kasia ... Kasię" both read [NAME_1].
    """
    placeholder_of: dict[tuple[str, str], str] = {}
    original_of: dict[str, str] = {}
    counts = {NAME: 0, EMAIL: 0, PHONE: 0}

    def placeholder(kind: str, key: str, original: str) -> str:
        found = placeholder_of.get((kind, key))
        if found is None:
            counts[kind] += 1
            found = f"[{kind}_{counts[kind]}]"
            placeholder_of[(kind, key)] = found
            original_of[found] = original
        return found

    # NFC first, so a name typed as e + combining ogonek is the same letters as the composed one.
    text = unicodedata.normalize("NFC", text)
    out = EMAIL_RE.sub(lambda m: placeholder(EMAIL, m.group().lower(), m.group()), text)

    def phone(m: re.Match[str]) -> str:
        digits = re.sub(r"\D", "", m.group())
        if len(digits) < _MIN_PHONE_DIGITS:
            return m.group()
        return placeholder(PHONE, digits, m.group())

    out = PHONE_RE.sub(phone, out)

    pieces: list[str] = []
    done = 0
    for start, end, base in _name_spans(out, names):
        pieces += [out[done:start], placeholder(NAME, base.lower(), base)]
        done = end
    out = "".join([*pieces, out[done:]])
    return GuardedPrompt(
        text=out, replacements=MappingProxyType(dict(original_of)), _seal=_SEAL
    )


def restore(reply: str, guarded: GuardedPrompt) -> str:
    """Put the originals back into a model's reply, on this machine, after it has come back."""
    return _PLACEHOLDER_RE.sub(
        lambda m: guarded.replacements.get(m.group(), m.group()), reply
    )


def restore_stream(chunks: Iterable[str], guarded: GuardedPrompt) -> Iterator[str]:
    """`restore` over streamed text, holding back a tail that may be half a placeholder."""
    pending = ""
    for chunk in chunks:
        pending += chunk
        cut = pending.rfind("[")
        if cut != -1 and "]" not in pending[cut:] and len(pending) - cut <= 12:
            ready, pending = pending[:cut], pending[cut:]
        else:
            ready, pending = pending, ""
        if ready:
            yield restore(ready, guarded)
    if pending:
        yield restore(pending, guarded)


def leaks(text: str, names: Iterable[str]) -> list[str]:
    """The name forms of `names` still present in `text`: empty when the guard did its job."""
    text = unicodedata.normalize("NFC", text)
    return [text[start:end] for start, end, _ in _name_spans(text, names)]
