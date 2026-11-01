# apps/site

The marketing site at jadwigo.pl: Astro, static output, Polish only for the hackathon
(`jadwigo-marketing/decisions/2026-10-27-for-the-hackathon-jadwigo-is-jadwigo-pl-only-in-polish-with-no-e`).
jadwigo.kids and English wait.

- **Not here:** Anything behind a login; that is `apps/web`.
- **Owner:** the marketing workstream (`docs/workstreams/marketing.md`). **Filled by:** `dl-w0b4.1` and the issues it blocks.
- **Imports:** packages: `config` (hosts) and `ui` (the brand SVGs, `@jadwigo/ui/brand/*`, and `foundation.css`), later `copy`.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test build --filter=./apps/site`, then `bun run check:dist`.
- **Deploy:** the owner runs `make -C infra site-deploy` (build, `check:dist`, sync to the bucket, invalidate). A merge deploys nothing.

## How it is laid out

- `src/content/<lang>/*.md`: each page's words, one file per page; the entry id is its path (`pl/index`).
  Frontmatter: `title`, `description`, `heading`, `ogImage` (optional, a path under `public/`) and
  `reviewed`; optional `lang`, `path`, `translation` and `draftNote`. The schema is `pageSchema` in `src/lib/seo.ts`.
- `src/pages/[...path].astro`: renders every page that names a `path`. A `path` is a stable URL, so
  never move one: the privacy pages' paths are in the Meta app's settings (dl-w0b4.64).
- English carries only the privacy pages (`src/content/en/`); the rest of the site waits on `dl-w0b4.7`.
- `src/lib/seo.ts`: the head every page carries (canonical on the apex, Open Graph, Twitter, JSON-LD),
  `robots.txt`, and `assertReviewed`. Pure, so `seo.test.ts` checks it without a build.
- `src/layouts/Base.astro`: the frame every page renders in. `src/pages/`: the routes.
- `scripts/check-dist.ts`: what the built `dist/` must carry before it is uploaded.

## Rules here

- Hosts come from `packages/config`, never a hard-coded domain.
- A page with `reviewed: false` builds in dev and stops a prod build. A native speaker reviews the
  Polish before it is flipped. A page with its own `path` is left out of a prod build instead, with
  a log line, and `check:dist` requires it once its source says `reviewed: true` (`src/lib/dist.ts`).
- The landing page (`dl-5ssh.4`) speaks to the parent, who decides, and the child, who studies
  (`jadwigo-marketing/decisions/2026-10-27-parents-decide-and-children-study-both-feel-at-home-on-the-landi`).
  Its head and h1 are in `src/content/pl/index.md`, its section words in `src/content/pl/landing.yaml`
  (`src/lib/landing.ts` is the schema), and the index's `reviewed` covers both. Copy says what Jadwigo
  does, never a slogan; numbers are digits; "diagnostic" is never shown.
- The header carries the crown wordmark (`dl-w0b4.68`) as a link home, a link to each page in
  `landing.yaml`'s `links` (each its own page, never an anchor), and "Zaloguj się" to `/zaloguj`. Links to the app come from `hosts.prod.app`, never typed.
- Colours and type come from `@jadwigo/ui/foundation.css` (Zeszyt) and Andika. Crown yellow is for
  the brand only.
- A link to a page with a `path` appears only when the build serves that page (`servedPathPages`),
  so a draft such as `/o-nas` is never linked.
- O nas names the son's school only after the school consents
  (`jadwigo-marketing/decisions/2026-10-31-the-o-nas-page-on-jadwigo-pl-names-the-son-s-school-jadwiga-scho`).
- `public/` holds the favicon files `tools/src/brand-icons.ts` writes. Edit their sources in
  `packages/ui/src/brand`, then run `make icons`.
