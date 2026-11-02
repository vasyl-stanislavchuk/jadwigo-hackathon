"""The event and the keys it may name.

The api copies a sent file to `pods/<pod>/attachments/<attachment_id>.<ext>` (wave 6 decision 60),
and the converter writes beside it under `pods/<pod>/attachments/<attachment_id>/`. An event whose
key is anything else is refused, so the function can only ever read one attachment's source and
write that attachment's pages, whatever the role would allow.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Final, Literal

from converter.errors import BAD_EVENT, Refused

Kind = Literal["heic", "pdf", "docx"]

DOCX_MEDIA_TYPE: Final = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

#: AttachmentMediaType in packages/contracts, less image/jpeg, which never needs converting.
MEDIA_TYPES: Final[dict[str, Kind]] = {
    "image/heic": "heic",
    "application/pdf": "pdf",
    DOCX_MEDIA_TYPE: "docx",
}

# packages/contracts/src/ids.ts: a prefix, then 26 base32 characters of a uuid.
_BODY = "[0-7][0-9a-hjkmnp-tv-z]{25}"
POD_ID: Final = re.compile(rf"pod_{_BODY}")
ATTACHMENT_ID: Final = re.compile(rf"atch_{_BODY}")


@dataclass(frozen=True)
class Request:
    bucket: str
    key: str
    kind: Kind
    pod: str
    attachment_id: str

    @property
    def prefix(self) -> str:
        """Where this attachment's pages and manifest go."""
        return f"pods/{self.pod}/attachments/{self.attachment_id}/"

    @property
    def manifest_key(self) -> str:
        return f"{self.prefix}pages.json"

    def page_key(self, n: int) -> str:
        """Page n, counted from 1."""
        return f"{self.prefix}p{n}.jpg"


def source_key(pod: str, attachment_id: str, kind: Kind) -> str:
    return f"pods/{pod}/attachments/{attachment_id}.{kind}"


def parse_event(event: object, allowed_bucket: str | None) -> Request:
    """The event, checked: every field a string, the ids well formed, the key exactly the source's.

    allowed_bucket is UPLOADS_BUCKET from the function's environment; when it is set, no other
    bucket is read.
    """
    if not isinstance(event, dict):
        raise Refused(BAD_EVENT)
    fields = {}
    for name in ("bucket", "key", "media_type", "pod", "attachment_id"):
        value = event.get(name)
        if not isinstance(value, str) or not value:
            raise Refused(BAD_EVENT)
        fields[name] = value
    kind = MEDIA_TYPES.get(fields["media_type"])
    pod, attachment_id = fields["pod"], fields["attachment_id"]
    if (
        kind is None
        or not POD_ID.fullmatch(pod)
        or not ATTACHMENT_ID.fullmatch(attachment_id)
        or fields["key"] != source_key(pod, attachment_id, kind)
        or (allowed_bucket is not None and fields["bucket"] != allowed_bucket)
    ):
        raise Refused(BAD_EVENT)
    return Request(
        bucket=fields["bucket"],
        key=fields["key"],
        kind=kind,
        pod=pod,
        attachment_id=attachment_id,
    )
