# dl-n9fr wave 5, lane pictures (dl-n9fr.52): Khan pictures from CloudFront, playground samples from the bucket

- **Done:** apps/web and the playground ask for pictures at the CloudFront media path. A PNG item and an SVG item both render there, and pictures need no Django.
- **Fixed on the way:** the bank's sync uploaded every picture as `binary/octet-stream`, which left SVGs blank. The lead fixed the upload, retyped the keys and invalidated CloudFront at 22:58 UTC.
- **Monorepo:** commit db7c53e on lane/pictures. apps/web lint, typecheck and test are green, 891 tests.
- **david-learns:** local commit f2e0180c, not pushed. Frontend typecheck is green, and vitest passes 6181 tests with the samples and 5914 plus 38 skipped without them.
- **Samples:** `make playground` downloads them from the bucket into a gitignored items.json. They are byte-identical to the file that left git.
- **Git:** `git ls-files frontend/src/playground/khan/items.json` in david-learns prints nothing.
- **Curl:** a picture ref on the media URL returns 200, and through Vite's `/media/khan/` proxy it is 200 with Django down.
- **Proposed bead changes:** a note on dl-n9fr.44 that the page shell still needs Django, and the david-learns `khan-items` target. Details below.
- No lesson-kit change: refs are resolved in apps/web before the kit sees a `src`.

## Monorepo (lane/pictures, db7c53e)

| File | What |
|---|---|
| `apps/web/src/media.ts` | `mediaUrl()` reads `VITE_MEDIA_URL`, the one place it is read. `mediaSrc(ref)` maps a bare `<sha>.<ext>`, a `media:<ref>` or the prototype's `/media/khan/<ref>` to `<media url>/<ref>`. It leaves `http(s)://`, `data:` and other paths alone. `withMedia(data)` applies it to every `src`, `image` and `picture` string. |
| `apps/web/src/play/PlayScreen.tsx` | The question's data and the released help go through `withMedia` before `FamilyView`. |
| `apps/web/src/review/ReviewStep.tsx` | `specOf` does the same for the review. |
| `apps/web/src/media.test.ts` | Covers bare ref, `media:` and `/media/khan/`, absolute http(s), `data:` and non-refs, reading the variable, and `withMedia` depth and immutability. 6 tests. |
| `apps/web/src/play/PlayScreen.test.tsx` | A question whose stem picture is a bare ref renders `<img src="https://dx5i3bka3zn5f.cloudfront.net/<ref>">` (dl-n9fr.52's "a lesson fixture with a picture ref renders it from the media URL in a test"). |
| `apps/web/README.md`, `apps/web/.env.example` | The settings section names `VITE_MEDIA_URL`, the URL, the SSM key and the 3 spellings of a ref. |

```
mise exec -- bunx turbo run lint typecheck test --filter=./apps/web
@jadwigo/web:test:  Test Files  18 passed (18)
@jadwigo/web:test:       Tests  891 passed (891)
 Tasks:    3 successful, 3 total
```

`VITE_MEDIA_URL` follows the brief's name. Vite reads it from `.env*` natively. The repo's `JW_*` keys go through `src/config.ts` and `define`, but this one is a page setting that needs no config module, and the lint rule only covers `process.env`.

## david-learns (main, local commit f2e0180c, not pushed)

| File | What |
|---|---|
| `frontend/vite.config.ts` | `/media/khan/` is proxied to `DL_KHAN_MEDIA_URL`, default `https://dx5i3bka3zn5f.cloudfront.net`, with the prefix stripped. The rule sits ahead of Django's `/media`. |
| `frontend/src/playground/khan/items.json` | Removed with `git rm --cached` and added to `.gitignore`. The file stays on disk. |
| `scripts/playground_samples.py` | Downloads `khan/converted/en.json` and `khan/side/picks.json` with the bank's `tools.khan.sync down --prefix <key>`. It then writes the share `to_family.py` used to commit: picked, translated and frontend-named items, plus the first 3 per grade, family, question type and issue. It never fails the playground, and keeps the last copy when offline. |
| `scripts/playground.sh` | Runs the script before Django and Vite start. |
| `frontend/src/playground/khan/index.ts` | Imports the file with an eager `import.meta.glob`, so a checkout without it still builds. `HAS_KHAN_ITEMS` reports whether it is there. |
| 9 test files | The 21 tests that read Khan items `skipIf(!HAS_KHAN_ITEMS)`. The lesson-file check skips only the 3 files that borrow a Khan item. |

```
bun run typecheck                                 # ok, with and without items.json
bunx vitest run   (samples present)               Test Files 200 passed; Tests 6181 passed
bunx vitest run   (samples absent)                Test Files 198 passed | 2 skipped; Tests 5914 passed | 38 skipped
python3 scripts/playground_samples.py             200 samples, unchanged   (from the bucket; identical bytes to the old committed file)
```

**Why a sync step, not a fetch:** the bucket is private, so a browser cannot read it, and a signed URL would need minting on every start. A sync step also keeps the playground's no-API rule, since the file is imported and never fetched. The bank's sync only downloads a key whose size changed, so a restart costs one list call. CI runs frontend typecheck and vitest, so a missing file must not break them, and the glob import with skips handles that.

`khan/side/picks.json` is not in the bucket yet. The share still came out identical, because the picked items are also translated or named in the frontend.

## Live checks

```
curl -sI https://dx5i3bka3zn5f.cloudfront.net/002f51e0ff8a56969c5d0c1f96e9ad5200288e76544ed1797567252749c0d9cc.png
HTTP/2 200
# Vite alone, Django on 8345 down:
/media/khan/0008dd07...a4.svg -> 200 199 bytes
/media/khan/002f51e0...cc.png -> 200 16207 bytes
/playground shell            -> 500   (Django serves the shell)
```

These were checked in a headless browser with the full `make playground` running.

| Item | Result |
|---|---|
| `/playground/slots/fill_gaps/x4a4417f7b43a6185` | The PNG `0d2458ab...png` renders with naturalWidth 400 |
| `/playground/enter/production/x089f47caad041faa` | Before the retype: the SVG `0b91aab2...svg` was blank with naturalWidth 0, because its type was `binary/octet-stream`. After the invalidation it renders 4 groups of 5 clocks, naturalWidth 320 |

After the invalidation, the edge serves the same key with the right type:

```
curl -sI https://dx5i3bka3zn5f.cloudfront.net/0b91aab290b0f63669b7622615f1bbbd61c95d22fee6c4f230c7b84e67346ffd.svg
HTTP/2 200
content-type: image/svg+xml
x-cache: Hit from cloudfront
```

At 23:45, 36 of the 225 sample refs returned 200. The rest were 403, because they were not uploaded yet.

## What I could not do

- **SVGs, now fixed:** the bank's sync (`tools/khan/sync.py:285`) called `upload_file` without a ContentType, so S3 stored `binary/octet-stream`. CloudFront added `nosniff` and cached that type, ignoring query strings. The lead fixed the upload, added a `sync retype` mode and invalidated `/*`. Those steps were AWS writes, so this lane did not make them.
- **"With Django stopped":** pictures need no Django. The playground's page shell does, and `make playground` starts Django for it. Removing that dependency belongs with dl-n9fr.44.

## Proposed bead changes

- **dl-n9fr.44:** note that the playground shell still needs Django. Only pictures and samples are off it now.
- **david-learns Makefile:** `khan-items` still names `scripts/khan/to_family.py` and its committed output. That target should point at `scripts/playground_samples.py` or go. It is not in this lane.
