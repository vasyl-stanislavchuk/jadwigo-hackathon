# apps/converter

The attachments converter (`dl-z5ja.11.8`, wave 6 decision 58): one container Lambda that turns a
parent's PDF, DOCX or HEIC into page JPEGs the model reads. Python 3.12, a uv project.

- **Not here:** TypeScript. Its `package.json` exists only so turbo runs its tests.
- **Owner:** the platform workstream. The runner (`apps/runner`, `dl-z5ja.11.7`) is its only caller.
- **Imports:** nothing of ours. The limits it copies from `packages/contracts` are named where they
  are set: `LIMITS.documentPages` (`tools.MAX_PAGES`) and `LIMITS.attachmentBytes` (`encode.MAX_BYTES`).
- **Test:** `cd apps/converter && uv run --frozen pytest -q`.

## The wire

```
event:   {"bucket", "key", "media_type", "pod", "attachment_id"}
success: {"pages": [{"key", "width", "height", "bytes"}, ...]}
refusal: FunctionError, errorType "Refused", errorMessage one of
         bad_event | too_many_pages | encrypted | unreadable
```

- `key` is exactly `pods/<pod>/attachments/<attachment_id>.<heic|pdf|docx>`, matching `media_type`;
  anything else is `bad_event`.
- Pages go to `pods/<pod>/attachments/<attachment_id>/p<n>.jpg`, then `pages.json` beside them,
  last. A call that finds `pages.json` returns it without converting.
- Every page is a fresh JPEG: at most 2000 px on the long edge, quality 85 lowered until it is at
  most 4 MB, and no Exif, XMP, ICC or comment.
- Any other error (S3, a missing binary) is ours, not the file's, and keeps its own type.

## Rules here

- Pin dependencies exact in `pyproject.toml`, each with a comment naming what needs it, and lock
  with `uv lock --exclude-newer <7 days ago>` (Renovate's hold).
- The binary tests (`fixtures.needs_*`) run where soffice, poppler or heif-convert start, and skip
  elsewhere. The key checks, the manifest, the re-encode and the refusals run everywhere.
- Fixtures are built in code (`tests/fixtures.py`). No real file, ever.
- Log ids, kinds, counts and outcomes. Never a file's name, its text or a tool's output.
- The image is the owner's: `make image image-check push`, then the tag goes into
  `infra/terraform/environments/prod.tfvars` as `converter_image_tag` (`infra/README.md`).
