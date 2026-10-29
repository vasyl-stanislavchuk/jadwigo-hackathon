# modules/content

The content bucket (`dl-n9fr.43.2`): the question bodies, answer keys and pictures that never enter git.
Decisions: `jadwigo-question-bank/decisions/2026-10-29-the-monorepo-s-terraform-root-creates-the-content-bucket-and-the`,
`2026-10-29-the-content-bucket-is-keyed-by-source-first-khan-then-the-next-l` and
`2026-10-29-khan-pictures-are-served-from-a-cloudfront-path-over-the-bucket`.

## What it creates

- **The bucket**, `jadwigo-content-843109108289` by default: private, every public access setting blocked,
  owner-enforced objects, SSE-S3, versioned, with noncurrent versions expiring after 30 days. No website hosting.
- **A CloudFront distribution** over `khan/media/` only, through origin access control. Its origin path is
  `/khan/media`, so `https://<distribution>/<sha>.svg` reads `khan/media/<sha>.svg`, and no other key in the
  bucket has a URL. GET and HEAD only, compressed, price class 100, the default `*.cloudfront.net` name.
  A custom domain is a later bead.
- **A cache policy** of a year, minimum a day: a picture's key is its sha, so its bytes never change.
  No cookie, header or query string reaches the cache key.
- **The bucket policy**: `s3:GetObject` on `khan/media/*` for that distribution and nothing else.
- **2 SSM String parameters**: `/jadwigo/bank/content-bucket` (the name, for jadwigo-bank's
  `tools/khan/sync.py`) and `/jadwigo/bank/media-url` (`https://<distribution domain>`, for the player and
  the playground).

## The layout it serves

Keyed by source first, so a second library sits beside Khan under its own prefix:

| Prefix | Holds | Who reads it |
| --- | --- | --- |
| `khan/raw/{en,pl}/` | the pull as fetched | the bank's tools, through the synced copy |
| `khan/candidates/` | candidate items | the bank's tools |
| `khan/converted/{en,pl}.json` | converted items | the bank's tools; the api role |
| `khan/media/<sha>.<ext>` | pictures | CloudFront, for any browser |
| `questions/<source>/<id>.json` | one object per question, derived (`dl-n9fr.43.3`) | the api role |

The api role's grant is in `modules/app/bank.tf`: `s3:GetObject` on `questions/*` and `khan/converted/*`.
It has no `s3:ListBucket`, so a key that is not there answers 403, not 404. The bank's search function
gets nothing. The `sergii` profile, which the sync runs as, keeps its full access.

Terraform owns no object in the bucket. `tools/khan/sync.py up` in jadwigo-bank fills it.
`docs/runbooks/content-bucket.md` is the apply, the upload, the checks and the undo.
