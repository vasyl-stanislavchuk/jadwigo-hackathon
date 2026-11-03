"""The PrintSheet, as the API hands it over (dl-1eieq.8.1, `packages/contracts/src/print.ts`).

A mirror of the contract's JSON Schema snapshot, `packages/contracts/schemas/print-sheet.json`:
each class is named after its `$defs` entry, and `tests/test_sheet.py` checks that each one names
exactly the snapshot's properties. Every model forbids a field it does not name, as every object in
the snapshot does, so a key, a hint, a boost or a twin that slipped past the builder's whitelist is
refused here before anything is drawn (no-keys, decision dl-7eyqd's plan).
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


Language = Literal["pl", "en"]
QuestionType = Literal[
    "true_false",
    "recognition",
    "lettered_choice",
    "multi_select",
    "mark_numbers",
    "fraction_compare",
    "production",
    "short_text",
    "expression",
    "measure",
    "fill_gaps",
    "fill_table",
    "label_picture",
    "column",
    "pyramid",
    "clock_read",
    "money_count",
    "order",
    "bucket",
    "match",
    "number_line_place",
    "hotspot",
    "spatial_build",
    "draw_graph",
    "clock_set",
    "money_pay",
    "fraction_shade",
    "area_model",
    "explain",
]
PaperAction = Literal["circle", "tick", "write", "draw", "join", "number"]
TickLabelStyle = Literal["decimal", "fraction", "mixed", "non-reduced"]
Denom = Literal[
    "gr1", "gr2", "gr5", "gr10", "gr20", "gr50",
    "zl1", "zl2", "zl5", "zl10", "zl20", "zl50", "zl100", "zl200",
]  # fmt: skip
GroupIcon = Literal["apple", "star", "heart", "fish", "flower", "cherry"]
Simplify = Literal["required", "enforced"]
EnterInput = Literal["number", "text", "expression", "fraction"]
GroupLayout = Literal["columns", "zones"]
GraphKind = Literal["bar", "picture", "line_plot", "dot_plot", "line", "histogram"]
GraphIcon = Literal[
    "apple", "banana", "cherry", "grape", "candy", "cookie", "ice_cream", "pizza", "egg", "sun",
    "cloud", "rain", "snow", "flower", "leaf", "dog", "cat", "fish", "bird", "star", "heart",
    "smile", "book", "pencil", "car", "bus", "square",
]  # fmt: skip


# --- The stem -----------------------------------------------------------------------------------
class PictureLabel(Strict):
    content: str
    coordinates: tuple[float, float]
    alignment: str
    math: Literal[False] | None = None


class PictureLabels(Strict):
    range: tuple[tuple[float, float], tuple[float, float]]
    items: list[PictureLabel]


class Picture(Strict):
    src: str
    alt: str
    width: float
    height: float
    decorative: Literal[True] | None = None
    labels: PictureLabels | None = None


class TerminalLine(Strict):
    cmd: str
    out: list[str] | None


class TerminalCard(Strict):
    lang: Literal["bash"]
    copy_: bool = Field(alias="copy")
    lines: list[TerminalLine]


class StemReference(Strict):
    prompt: str
    text: str


class AudioText(Strict):
    text: str
    language: str
    slow: Literal[True] | None = None


class StemAudio(Strict):
    clip: str
    slow: str | None = None


class FigureExpression(Strict):
    kind: Literal["expression"]
    text: str


class FigureNumberLine(Strict):
    kind: Literal["number_line"]
    min: float
    max: float
    step: float
    labelled: list[float]
    marker: float
    tick_label: TickLabelStyle | None = None


class FigureDots(Strict):
    kind: Literal["dots"]
    rows: int
    cols: int
    alt: str


class FigureGroups(Strict):
    kind: Literal["groups"]
    groups: int
    each: int
    icon: GroupIcon
    alt: str


class FigureRuler(Strict):
    kind: Literal["ruler"]
    picture: Picture
    unit: Literal["cm", "mm"]
    length: float
    pixels_per_unit: float
    ticks: float | None = None
    start: float | None = None


class FigureClock(Strict):
    kind: Literal["clock"]
    h: int
    m: int
    numbers: Literal["arabic", "none"] | None = None
    alt: str


class FigureCoins(Strict):
    kind: Literal["coins"]
    items: list[Denom]
    alt: str


class FractionPart(Strict):
    n: int
    d: int


class FigureFractionBars(Strict):
    kind: Literal["fraction_bars"]
    items: list[FractionPart]
    shape: Literal["bar", "circle"]
    alt: str
    labels: Literal["shown", "none"] | None = None


Figure = Annotated[
    FigureExpression
    | FigureNumberLine
    | FigureDots
    | FigureGroups
    | FigureRuler
    | FigureClock
    | FigureCoins
    | FigureFractionBars,
    Field(discriminator="kind"),
]


class Stem(Strict):
    text: str | None = None
    image: str | None = None
    image_alt: str | None = None
    text_replaces_say: bool | None = None
    pictures: list[Picture] | None = None
    terminal: TerminalCard | None = None
    figure: Figure | None = None
    reference: StemReference | None = None
    audio: StemAudio | None = None
    audio_text: AudioText | None = None


# --- choose -------------------------------------------------------------------------------------
class OptionText(Strict):
    kind: Literal["text"]
    text: str


class OptionNumber(Strict):
    kind: Literal["number"]
    number: float


class OptionBool(Strict):
    kind: Literal["bool"]
    bool: bool


class OptionArray(Strict):
    kind: Literal["array"]
    rows: int
    cols: int


class OptionImage(Strict):
    kind: Literal["image"]
    image: str
    alt: str
    width: float | None = None
    height: float | None = None
    labels: PictureLabels | None = None


class OptionPictures(Strict):
    kind: Literal["pictures"]
    pictures: list[Picture]


class OptionNone(Strict):
    kind: Literal["none"]


OptionContent = Annotated[
    OptionText | OptionNumber | OptionBool | OptionArray | OptionImage | OptionPictures | OptionNone,
    Field(discriminator="kind"),
]


class ChooseOption(Strict):
    id: str
    content: OptionContent
    letter: str | None = None


class PrintChooseData(Strict):
    stem: Stem | None = None
    options: list[ChooseOption]
    select: Literal["one", "many"]
    layout: Literal["list", "grid", "binary", "lettered", "inline"]
    tokens: Literal["marked", "words"] | None = None
    line: str | None = None


# --- enter --------------------------------------------------------------------------------------
class EnterData(Strict):
    stem: Stem | None = None
    input: EnterInput
    entry: Literal["keypad", "keyboard"]
    voice: bool | None = None
    code: bool | None = None
    max_length: int | None = None
    decimal: bool | None = None
    equation: bool | None = None
    whole: bool | None = None
    simplify: Simplify | None = None
    figure: Figure | None = None
    letters: Literal["pl", "none"] | None = None
    capitals: bool | None = None


# --- slots --------------------------------------------------------------------------------------
class GapAt(Strict):
    x: float
    y: float


class GapEnter(Strict):
    id: str
    kind: Literal["enter"]
    input: Literal["number", "text", "fraction"]
    max_length: int | None = None
    range: tuple[float, float] | None = None
    at: GapAt | None = None
    letters: Literal["pl", "none"] | None = None
    decimal: bool | None = None
    whole: bool | None = None
    simplify: Simplify | None = None


class GapOption(Strict):
    id: str
    label: str


class GapChoose(Strict):
    id: str
    kind: Literal["choose"]
    options: list[GapOption]
    at: GapAt | None = None


Gap = Annotated[GapEnter | GapChoose, Field(discriminator="kind")]


class SlotsTable(Strict):
    header: list[str]
    rows: list[list[str]]


class ColumnSum(Strict):
    op: Literal["add", "sub", "mul"]
    operands: tuple[int, int]
    given_steps: int
    carry_row: bool


class SlotsData(Strict):
    stem: Stem | None = None
    template: str
    table: SlotsTable | None = None
    picture: Picture | None = None
    gaps: list[Gap]
    code: bool | None = None
    figure: Figure | None = None
    column: ColumnSum | None = None
    pyramid: list[list[float | str]] | None = None
    fill_order: list[str] | None = None


# --- sequence -----------------------------------------------------------------------------------
class SequenceItem(Strict):
    id: str
    text: str


class SequenceData(Strict):
    stem: Stem | None = None
    items: list[SequenceItem]
    first_label: str
    last_label: str
    tiles: list[SequenceItem] | None = None
    slots: int | None = None


# --- group --------------------------------------------------------------------------------------
class GroupCard(Strict):
    id: str
    label: str
    picture: Picture | None = None


class GroupZone(GroupCard):
    capacity: int | None = None


class GroupData(Strict):
    stem: Stem | None = None
    groups: list[GroupZone]
    items: list[GroupCard]
    each_item: Literal["one", "many"]
    layout: GroupLayout | None = None


# --- place --------------------------------------------------------------------------------------
class LineDivisions(Strict):
    min: int
    max: int


class GraphIconPicture(Strict):
    icon: GraphIcon


class GraphImagePicture(Strict):
    src: str
    alt: str


class GraphCategory(Strict):
    id: str
    label: str
    picture: GraphIconPicture | GraphImagePicture | None = None


class ClockValue(Strict):
    hour_at: float
    m: float


class PlaceNumberLine(Strict):
    surface: Literal["number_line"]
    min: float
    max: float
    step: float
    labelled: list[float]
    target_label: float | str | None = None
    tick_label: TickLabelStyle | None = None
    snap: float | None = None
    divisions: LineDivisions | None = None
    stem: Stem | None = None


class PlaceImage(Strict):
    surface: Literal["image"]
    image: str
    image_alt: str
    taps: int
    stem: Stem | None = None


class PlaceGrid(Strict):
    surface: Literal["grid"]
    size: int
    label: str
    split: Literal["one"] | None = None
    cells: Literal["dots", "squares", "open"] | None = None
    stem: Stem | None = None


class PlaceBars(Strict):
    surface: Literal["bars"]
    kind: GraphKind
    categories: list[GraphCategory]
    max: float
    step: float
    tick: float | None = None
    unit_label: str | None = None
    category_label: str | None = None
    starting: dict[str, float] | None = None
    stem: Stem | None = None
    bins: list[float] | None = None


class PlaceClock(Strict):
    surface: Literal["clock"]
    target_label: str
    minute_step: Literal[5, 15, 30]
    hands: Literal["geared", "free"]
    starting: ClockValue | None = None
    stem: Stem | None = None


class PlaceCoins(Strict):
    surface: Literal["coins"]
    bank: list[Denom]
    amount_label: str
    slots: int
    total: Literal["hidden", "shown"] | None = None
    stem: Stem | None = None


class PlaceFraction(Strict):
    surface: Literal["fraction"]
    shape: Literal["bar", "circle", "rect"]
    parts: int
    rows: int | None = None
    label: str
    contiguous: bool | None = None
    stem: Stem | None = None


PlaceData = Annotated[
    PlaceNumberLine | PlaceImage | PlaceGrid | PlaceBars | PlaceClock | PlaceCoins | PlaceFraction,
    Field(discriminator="surface"),
]


# --- The question and the sheet -----------------------------------------------------------------
class Printed(Strict):
    n: Annotated[int, Field(ge=1, le=20)]
    question_type: QuestionType
    paper: Literal["yes", "adapted"]
    action: PaperAction
    say: str
    credit_n: Annotated[int, Field(ge=1)] | None


class ChooseQuestion(Printed):
    family: Literal["choose"]
    data: PrintChooseData


class EnterQuestion(Printed):
    family: Literal["enter"]
    data: EnterData


class SlotsQuestion(Printed):
    family: Literal["slots"]
    data: SlotsData


class SequenceQuestion(Printed):
    family: Literal["sequence"]
    data: SequenceData


class GroupQuestion(Printed):
    family: Literal["group"]
    data: GroupData


class PlaceQuestion(Printed):
    family: Literal["place"]
    data: PlaceData


PrintQuestion = Annotated[
    ChooseQuestion | EnterQuestion | SlotsQuestion | SequenceQuestion | GroupQuestion | PlaceQuestion,
    Field(discriminator="family"),
]


class PrintCredit(Strict):
    n: Annotated[int, Field(ge=1)]
    #: Printed on the borrowed question's card; `line` and `url` once in the list at the end.
    short: Annotated[str, Field(min_length=1)]
    line: Annotated[str, Field(min_length=1)]
    url: str | None


class PrintLegend(Strict):
    circle: str
    tick: str
    write: str
    draw: str
    join: str
    number: str


class PrintLabels(Strict):
    brand: str
    name: str
    date: str
    page: str
    page_of: str
    next: str
    end: str
    legend: PrintLegend
    true_word: str
    false_word: str
    many: str
    total: str
    hours_hand: str
    card_title: str
    card_note: str
    credits_title: str
    alfik_note: str
    alfik_mark: str
    alfik_no_mark: str
    alfik_change: str
    alfik_title: str


class PrintSheet(Strict):
    renderer: Literal[1]
    language: Language
    title: Annotated[str, Field(min_length=1)]
    labels: PrintLabels
    card: Literal["ticks", "alfik"]
    questions: Annotated[list[PrintQuestion], Field(min_length=1, max_length=20)]
    credits: list[PrintCredit]
    html: dict[str, str]
    media: dict[str, str]


def parse_sheet(raw: bytes | str) -> PrintSheet:
    """The sheet from its JSON, or a pydantic `ValidationError` naming the first field refused."""
    return PrintSheet.model_validate_json(raw)
