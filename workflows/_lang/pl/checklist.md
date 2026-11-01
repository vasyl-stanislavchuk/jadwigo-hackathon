# Polish review checklist

The reviewer (`workflows/jadwigo-lesson-review`) checks every Polish line a child or a parent
reads against these items. A line passes only when no item flags it. A flag names its item
by id, quotes the words that break it, and gives one reason. Only a line that passes is marked
`reviewed: true`, and only a reviewed line reaches a family.

This is the checklist of decision
`david-learns/decisions/2026-10-04-polish-lines-are-reviewed-by-an-ai-skill-against-a-cited-checkli`,
moved into a file, with the 2026 spelling reform added (`dl-r772.16`, `dl-r772.34`). Each flag
also carries one of the categories used by MQM, the error typology GEMBA-MQM prompts a model
with: accuracy, fluency, style, terminology, locale
([GEMBA-MQM, Kocmi and Federmann 2023](https://arxiv.org/abs/2310.13988)).

## Items

**pl-1 Polish only.** The line is in Polish, apart from a quote of a child, which keeps its own
language and is marked as a quote. No English word, no code, no level name (`mastered`,
`opanowane`).
Category: accuracy. Source: the language-confusion study, which found models drift out of
the target language ([Marchisio et al. 2024](https://arxiv.org/abs/2406.20052)), and
`jadwigo-ai-workflows/decisions/2026-11-01-when-a-lesson-s-language-has-nothing-checked-the-family-is-offer`.

**pl-2 A nine-year-old's register.** A child's line is short, one idea per sentence, in
everyday words a child of 6 to 9 knows, and addresses the child as `ty`. A parent's line is
impersonal ("Warto…", "Następna lekcja…"), with no `Pan`, `Pani` or `ty`.
Category: style. Source: the decision above ("a nine-year-old's register"), and
`workflows/_lang/pl/style.md`.

**pl-3 Grammar and case.** Agreement, case after a numeral (`5 jabłek`, `2 jabłka`,
`22 jabłka`, `25 jabłek`), case after a preposition, and aspect are correct.
Category: fluency. Source: the decision above ("grammar and case"), and the PWN rules on numerals
with nouns ([Poradnia PWN](https://sjp.pwn.pl/poradnia/)).

**pl-4 The profile's grammatical form, or neutral phrasing.** A past-tense verb about the child
uses the profile's form when the run names one (`policzyłaś`, `policzyłeś`), and is neutral
otherwise (`Udało się policzyć.`, `Policz jeszcze raz.`). A line never guesses a gender.
Category: accuracy. Source: the decision above ("the profile's grammatical form or neutral
phrasing").

**pl-5 No pressure words.** No score, time or failure: no `wynik`, `punkty`, `procent`, `%`,
`szybko`, `czas się kończy`, `zostało 3 dni`, `porażka`, `nie zdałeś`. Never a bare `źle` or
`błąd`; the line says what to try instead.
Category: style. Source: the decision above ("no pressure words (score, time, failure)"), and the
house rule in `AGENTS.md` (text a child reads is never a bare "wrong").

**pl-6 Warm, not gushing.** Praise is for what the child did and the evidence shows (`Policzyłaś
wszystkie rzędy.`), never for being clever, and never after a miss (`super!`). No task is called
easy (`łatwe`, `proste`, `to proste`, `łatwizna`).
Category: style. Source: the decision above ("warm, not gushing"); praise for intelligence lowers
children's persistence after a miss, praise for effort does not
([Mueller and Dweck 1998](https://doi.org/10.1037/0022-3514.75.1.33)).

**pl-7 Question text spoken exactly as written.** A line that is read aloud (`say`) states the
same question as the text on screen, with the same numbers and the same objects, so a child who
listens and a child who reads answer the same thing. A line never gives the answer away.
Category: accuracy. Source: the decision above ("question text spoken exactly as written").

**pl-8 The lesson's words and signs.** Maths words and signs are the ones Polish klasy 1 to 3
use, and the question's own: `·` for times, `razy`, `po`, `grupy`, `rzędy`, `dodawanie`,
`mnożenie`, `:` for division. See `workflows/_lang/pl/glossary.md`.
Category: terminology. Source: `workflows/_lang/pl/glossary.md`, and the 2017 podstawa
programowa for klasy I-III, edukacja matematyczna
([Dz.U. 2017 poz. 356](https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20170000356)).

**pl-9 Spelling, as the 2026 reform writes it.** The line follows the Polish spelling rules in
force since 1 January 2026
([PWN, the rules changed by the 2026 reform](https://sjp.pwn.pl/zasady/zasady-podlegajace-zmianom-w-zwiazku-z-reforma-ortografii-2026;9395528.html);
[the Rada Języka Polskiego communiqué](https://sjp.pwn.pl/zasady/komunikat-rady-języka-polskiego-w-sprawie-zmian-w-ortografii-od-stycznia-2026-r;3866473.html)).
A line written to the old rule is flagged, even when it was correct before 2026:
- **nie is joined to adjectival participles**, with no "deliberate separate" exception left:
  `niepoliczone kropki`, `nieskończone zadanie`, never `nie policzone`, `nie skończone`.
- **nie is joined to adjectives and adverbs made from adjectives in every degree:**
  `niemilszy`, `nienajlepiej` ([PWN 170](https://sjp.pwn.pl/zasady/170-46-2-z-przymiotnikami;629515.html)).
  It stays apart before `bardziej`, `najbardziej`, before an indeclinable adjective, and in a
  contrast (`nie dłuższy, ale krótszy`).
- **bym, byś, by, byśmy, byście are apart after a conjunction:** `czy by`, `że by`, `jeśli by`,
  `albo by`. `żeby`, `choćby`, `chociażby` and `niżby` stay joined
  ([PWN 167](https://sjp.pwn.pl/zasady/167-45-3-po-spójnikach;629512.html)).
- **Names of inhabitants of towns, districts and villages take a capital:** `Warszawianin`,
  `Krakowianka`
  ([PWN 67](https://sjp.pwn.pl/zasady/67-18-8-nazwy-mieszkańców-państw-krajów-miast-i-ich-części-wsi-kolonii-i-przysiółków;629383.html)).
- **pół is joined in a compound:** `półtora` as before, and `półzabawa`, `półżartem`.
- The rest of spelling, unchanged: ó and u, rz and ż, ch and h as the PWN rules 5, 6, 29 to 32
  write them ([PWN 5](https://sjp.pwn.pl/zasady/5-2-1-zakres-użycia-litery-ó;629304.html),
  [PWN 30](https://sjp.pwn.pl/zasady/30-10-2-połączenie-liter-rz-piszemy-gdy;629338.html)).

Category: locale. Source: as linked, and `docs/research/polish-spelling.md` §2.3 in david-learns.

**pl-10 Punctuation and numbers.** Every sentence ends with `.`, `?` or `!`, and a question with
`?`. Counts and the question's numbers are digits (`18 pytań`), except where the question itself
spells a number out. The decimal separator is a comma (`2,5`).
Category: locale. Source: `workflows/jadwigo-lesson-compose/SKILL.md` ("Polish for a child of 6
to 9") and `workflows/jadwigo-report-write/SKILL.md`, which the owner's runs settled; the comma
as Polish writes decimals ([Poradnia PWN](https://sjp.pwn.pl/poradnia/)).

**pl-11 No private data.** No child's name or words outside a marked quote, no surname, school or
place a family could be found by.
Category: accuracy. Source: the house rule in `AGENTS.md` on real learner data, and draft
decision `dl-2uq1`.

## How a flag is written

```json
{"id": "<line id>", "verdict": "flag", "item": "pl-9", "category": "locale",
 "quote": "nie policzone", "reason": "nie is joined to an adjectival participle since 2026: niepoliczone."}
```

A pass is `{"id": "<line id>", "verdict": "pass"}`. A line with 2 faults gets one flag per item.
