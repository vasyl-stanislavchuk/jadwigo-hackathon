"""paper-declaration: every question type with a paper form has a macro that draws it."""

from __future__ import annotations

from typing import get_args

from conftest import needs_pango

from printer.sheet import QuestionType


@needs_pango
def test_every_type_with_a_paper_form_has_a_macro() -> None:
    from printer.render import NO_PAPER, forms

    drawn = forms()
    for qt in get_args(QuestionType):
        if qt in NO_PAPER:
            assert qt not in drawn, f"{qt} has no paper form, so no macro"
        else:
            assert qt in drawn, f"{qt} needs a macro in templates/forms/"
    assert set(drawn) <= set(get_args(QuestionType)), "a macro for no question type"
