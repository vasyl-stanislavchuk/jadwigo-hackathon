# apps/site

The marketing site at jadwigo.pl and jadwigo.kids: Astro, `pl` and `en`.

- **Not here:** Anything behind a login; that is `apps/web`.
- **Owner:** the marketing workstream (`docs/workstreams/marketing.md`). **Filled by:** `dl-w0b4.1` fills it.
- **Imports:** packages: `config` (hosts), `ui`, `copy`.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./apps/site`

## Rules here

- Hosts come from `packages/config`, never a hard-coded domain.
- Content lives in `src/content/pl/` and `src/content/en/` once the site lands.
