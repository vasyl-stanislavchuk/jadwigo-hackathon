"""The refusals the runner maps to a sentence for the parent (dl-z5ja.11.7).

A refusal reaches the runner as Lambda's error payload: `errorType` is "Refused" and `errorMessage`
is the code alone, so no detail of the file travels with it. Anything else that raises (S3, a
missing binary) is a fault of ours, not of the file, and keeps its own type.
"""

from __future__ import annotations

from typing import Final, Literal

Code = Literal["bad_event", "too_many_pages", "encrypted", "unreadable"]

#: The event is not one the runner sends: a key outside its attachment's, an unknown media type.
BAD_EVENT: Final = "bad_event"
#: A PDF, or a DOCX once it is a PDF, has more pages than MAX_PAGES.
TOO_MANY_PAGES: Final = "too_many_pages"
#: A PDF with any encryption, an owner password included.
ENCRYPTED: Final = "encrypted"
#: The tools could not read it, gave up on time, or it is too large to re-encode.
UNREADABLE: Final = "unreadable"

CODES: Final = frozenset({BAD_EVENT, TOO_MANY_PAGES, ENCRYPTED, UNREADABLE})


class Refused(Exception):
    """A file the converter will not turn into pages. Its message is the code and nothing else."""

    def __init__(self, code: Code) -> None:
        super().__init__(code)
        self.code: Code = code
