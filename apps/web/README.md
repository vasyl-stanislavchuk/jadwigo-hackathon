# apps/web

The app at app.jadwigo.pl: the lesson player, the child's review and the parent screens. What
this folder holds and its rules are in [AGENTS.md](AGENTS.md).

```
bunx turbo run lint typecheck test --filter=./apps/web
```

## Settings

Build settings are Vite's: a `VITE_*` key in the environment, or in `.env` or `.env.local` in this
folder, is baked into the page. `.env.example` lists them with their values for production.

| Key | What it is | Default |
|---|---|---|
| `VITE_MEDIA_URL` | Where question pictures are served. `src/media.ts` turns a picture ref into `<VITE_MEDIA_URL>/<sha>.<ext>` | empty: the ref stays a same-origin path |

The media URL is `https://dx5i3bka3zn5f.cloudfront.net`, also in SSM at `/jadwigo/bank/media-url`.
It is a CloudFront path over the private content bucket: a request for `/<sha>.<ext>` serves
`khan/media/<sha>.<ext>` and nothing else (decision
`2026-10-29-khan-pictures-are-served-from-a-cloudfront-path-over-the-bucket`).

A ref reaches the player in 3 spellings, and `mediaSrc` maps each to the same address: a bare
`<sha>.<ext>`, `media:<sha>.<ext>`, and the prototype's `/media/khan/<sha>.<ext>`. An absolute
`http(s)://` address, a `data:` URL and any other path are left as they are. The player and the
review rewrite a question's data and its released help with `withMedia` before lesson-kit sees a
step, so the kit's parts keep taking a plain `src`.

The dev server's own settings (`WEB_PORT`, `JW_API_URL`, `JW_SUPABASE_URL`, `JW_SUPABASE_KEY`,
`JW_E2E_API`) are read in `src/config.ts`.
