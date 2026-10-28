# apps/site

The marketing site at jadwigo.pl: Astro, static output, Polish only for the hackathon
(`jadwigo-marketing/decisions/2026-10-27-for-the-hackathon-jadwigo-is-jadwigo-pl-only-in-polish-with-no-e`).
jadwigo.kids and English wait.

- **Not here:** Anything behind a login; that is `apps/web`.
- **Owner:** the marketing workstream (`docs/workstreams/marketing.md`). **Filled by:** `dl-w0b4.1` and the issues it blocks.
- **Imports:** packages: `config` (hosts), later `ui` and `copy`.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test build --filter=./apps/site`, then `bun run check:dist`.
- **Deploy:** the owner runs `make -C infra site-deploy` (build, `check:dist`, sync to the bucket, invalidate). A merge deploys nothing.

## How it is laid out

- `src/content/pl/*.md`: each page's words, one file per page. Frontmatter: `title`, `description`,
  `heading`, `ogImage` (optional, a path under `public/`) and `reviewed`. The schema is `pageSchema` in `src/lib/seo.ts`.
- `src/lib/seo.ts`: the head every page carries (canonical on the apex, Open Graph, Twitter, JSON-LD),
  `robots.txt`, and `assertReviewed`. Pure, so `seo.test.ts` checks it without a build.
- `src/layouts/Base.astro`: the frame every page renders in. `src/pages/`: the routes.
- `scripts/check-dist.ts`: what the built `dist/` must carry before it is uploaded.

## Rules here

- Hosts come from `packages/config`, never a hard-coded domain.
- A page with `reviewed: false` builds in dev and stops a prod build. A native speaker reviews the
  Polish before it is flipped.
- The placeholder page says only "Jadwigo. Wkrótce."
  (`jadwigo-marketing/decisions/2026-10-27-the-jadwigo-pl-placeholder-says-jadwigo-wkrotce-and-is-built-in`),
  plus one link to the app, "Zagraj w lekcję", at `appUrl` from `hosts.prod.app` (`dl-e8ov.2.41`).
