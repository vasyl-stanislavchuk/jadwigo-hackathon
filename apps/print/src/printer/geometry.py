"""Every size the printed sheet has, in one place (dl-1eieq.8.2).

The page, the margins, the type sizes, the card, each answer place and figure, and which question
types sit two to a row. The paper stylesheet (`templates/paper.css.j2`) and the SVG figure macros
read these through the `geom` global, and the tests read them to check the PDF, so a size changed
here changes the page, the figures and the golden test together. No template or stylesheet writes
a number of its own.

Every choice is made for a child of 6 to 10 reading, understanding and finding their way through
the page (the plan on dl-1eieq.8, "How the page is built").
"""

from __future__ import annotations

from typing import Final

#: PDF points per millimetre (72 pt per inch, 25.4 mm per inch).
PT_PER_MM: Final = 72 / 25.4


def mm_to_pt(mm: float) -> float:
    return mm * PT_PER_MM


# --- Paper -------------------------------------------------------------------------------------
#: A4, the paper Polish homes and schools print on.
PAGE_W_MM: Final = 210.0
PAGE_H_MM: Final = 297.0
#: The same margin on every side: wide enough for any home printer's unprintable edge.
MARGIN_MM: Final = 12.0
CONTENT_W_MM: Final = PAGE_W_MM - 2 * MARGIN_MM
CONTENT_H_MM: Final = PAGE_H_MM - 2 * MARGIN_MM
#: The running footer ("Jadwigo · title", "strona 2 z 4", "dalej"), inside the margin box.
FOOTER_H_MM: Final = 7.0

# --- Type --------------------------------------------------------------------------------------
#: Andika (SIL, OFL-1.1): single-storey a and g, and I, l and 1 told apart, for beginning readers.
FONT_FAMILY: Final = "Andika"
#: The instruction and the stem. Early-reader books use 14 to 18 pt; 14 pt keeps 20 questions to
#: about 4 pages, and a 1st grader is read to anyway.
BODY_PT: Final = 14.0
LINE_HEIGHT: Final = 1.4
#: Numbers inside figures, options and answer places.
FIGURE_PT: Final = 16.0
#: The question's number in its badge.
NUMBER_PT: Final = 15.0
TITLE_PT: Final = 18.0
FOOTER_PT: Final = 9.0
#: The borrowed question's credit: the child doesn't need it, so it is small and grey.
CREDIT_PT: Final = 7.5
#: A small caption under a picture option, or the words of a choose-gap.
SMALL_PT: Final = 11.0

# --- Ink ---------------------------------------------------------------------------------------
INK: Final = "#000000"
#: The lightest grey the sheet uses: cheap printers drop anything lighter than about 45 %.
GREY: Final = "#737373"
#: The card's border.
CARD_BORDER: Final = "#8c8c8c"
#: The tint of a given cell and of every other answer-card row. A tint only helps: the white
#: answer cell also has a thicker border, so nothing is lost when a printer drops it.
SHADE: Final = "#e6e6e6"
#: A part of a figure that is filled in: as dark as the lightest grey a printer keeps.
FILL: Final = "#8c8c8c"
#: Khan's colour roles still print in colour; nothing on our side depends on colour alone.
TEX_COLOURS: Final = {
    "blue": "#1865f2",
    "green": "#00a60e",
    "gold": "#b8860b",
    "red": "#d92916",
    "pink": "#d2386c",
    "purple": "#7854ab",
    "violet": "#9059ff",
    "gray": "#5f5f5f",
    "gray-h": "#737373",
    "gray-i": "#737373",
}

# --- The card: one question, never split across pages ------------------------------------------
CARD_BORDER_MM: Final = 0.4
CARD_RADIUS_MM: Final = 3.0
CARD_PAD_MM: Final = 4.0
#: The space between two cards, down the page and across a pair.
CARD_GAP_MM: Final = 5.0
HALF_W_MM: Final = (CONTENT_W_MM - CARD_GAP_MM) / 2
#: The filled circle with the question's number.
BADGE_MM: Final = 9.0
#: The paper action's mark beside the badge.
ICON_MM: Final = 7.0
#: A picture in a stem never eats a page.
PICTURE_MAX_W_MM: Final = 120.0
PICTURE_MAX_H_MM: Final = 60.0

# --- Answer places -----------------------------------------------------------------------------
#: A 6- or 7-year-old writes a digit about 7 to 10 mm high, so no answer place is shorter.
ANSWER_MIN_H_MM: Final = 9.0
#: The box for a number.
NUMBER_BOX_W_MM: Final = 22.0
NUMBER_BOX_H_MM: Final = 12.0
#: A small box for one or two digits (a clock's hours, an inline gap).
DIGIT_BOX_W_MM: Final = 14.0
#: The line for a word: the 3-line ruling a Polish 1st grader writes on.
WRITE_LINE_W_MM: Final = 70.0
WRITE_LINE_H_MM: Final = 12.0
#: The A to E circles, and a multi_select square ("maybe more than one").
LETTER_MM: Final = 7.0
#: True or false: two large word pills.
PILL_W_MM: Final = 30.0
PILL_H_MM: Final = 11.0
PILL_GAP_MM: Final = 12.0
#: A recognition option's frame.
OPTION_FRAME_MM: Final = 28.0
#: mark_numbers: room for a loose circle that doesn't touch its neighbour.
TOKEN_GAP_MM: Final = 10.0
#: A table's row, and a given cell's grey.
TABLE_ROW_MM: Final = 10.0
TABLE_CELL_MIN_W_MM: Final = 16.0
#: Squared paper for column arithmetic, as in a "zeszyt w kratkę".
COLUMN_CELL_MM: Final = 8.0
#: A pyramid's brick.
BRICK_W_MM: Final = 18.0
BRICK_H_MM: Final = 12.0
#: match and bucket: rows apart, and the dot a line starts from.
JOIN_ROW_MM: Final = 11.0
JOIN_DOT_MM: Final = 2.6
JOIN_GAP_MM: Final = 40.0
#: order: the box in front of each item.
ORDER_BOX_MM: Final = 10.0

# --- Figures (SVG, drawn from these numbers) ---------------------------------------------------
#: A clock to read, and a blank one to draw the hands on.
CLOCK_READ_MM: Final = 40.0
CLOCK_SET_MM: Final = 50.0
#: A coin's diameter for 1 gr, and how much wider each step up is drawn; notes are rectangles.
COIN_MIN_MM: Final = 10.0
COIN_STEP_MM: Final = 0.9
NOTE_W_MM: Final = 30.0
NOTE_H_MM: Final = 15.0
#: money_pay's purse: each coin of the bank drawn this many times, enough for grades 1 to 3.
PURSE_COPIES: Final = 4
#: A number line's ticks are never closer than a pencil mark.
LINE_TICK_MIN_MM: Final = 8.0
LINE_H_MM: Final = 14.0
#: Dots and groups figures.
DOT_MM: Final = 4.0
DOT_PITCH_MM: Final = 7.0
#: The dot grid spatial_build and area_model draw on.
GRID_PITCH_MM: Final = 8.0
GRID_DOT_MM: Final = 1.6
#: fraction_shade and fraction_bars.
FRACTION_W_MM: Final = 70.0
FRACTION_H_MM: Final = 14.0
FRACTION_CIRCLE_MM: Final = 36.0
#: draw_graph: the plot's height and each category's column.
GRAPH_H_MM: Final = 42.0
GRAPH_COL_MM: Final = 22.0
#: measure: a ruler drawn to the figure's own scale, never wider than the content.
RULER_H_MM: Final = 12.0
#: The line width every figure draws with.
STROKE_MM: Final = 0.4

# --- Spacing: the steps every gap, padding and small mark inside a card is made of --------------
SPACE_XS_MM: Final = 1.0
SPACE_S_MM: Final = 2.0
SPACE_M_MM: Final = 3.0
SPACE_L_MM: Final = 4.0
SPACE_XL_MM: Final = 6.0
SPACE_XXL_MM: Final = 8.0
SPACE_XXXL_MM: Final = 10.0
#: Page 1's "Imię: ______  Data: ______" lines.
NAME_LINE_W_MM: Final = 60.0
#: A picture inside an option's frame.
OPTION_PICTURE_W_MM: Final = 40.0
OPTION_PICTURE_H_MM: Final = 30.0
#: A numbered pin on a picture to label.
PIN_MM: Final = 6.0
#: The figures' inner margins: a number line's ends, a graph's value axis and its labels.
LINE_PAD_MM: Final = 6.0
GRAPH_AXIS_W_MM: Final = 12.0
GRAPH_LABELS_H_MM: Final = 10.0

# --- Layout classes ----------------------------------------------------------------------------
#: Question types whose card is half the content width: a pair of them shares a row, read left
#: then right, so the lesson's order never changes. Everything else is full width.
HALF_TYPES: Final = frozenset(
    {
        "true_false",
        "production",
        "clock_read",
        "money_count",
        "pyramid",
        "column",
        "fraction_compare",
        "fraction_shade",
        "clock_set",
    }
)

# --- Page 1's header and the answer card -------------------------------------------------------
#: The answer card's numbered squares.
TICK_MM: Final = 9.0
TICKS_PER_ROW: Final = 10
#: The Alfik card: columns of ten questions, A to E circles.
ALFIK_PER_COLUMN: Final = 10
ALFIK_CIRCLE_MM: Final = 7.0
