# apps/site

The marketing site at jadwigo.pl: Astro, static output, in Polish and in English under `/en/`
(`jadwigo-marketing/decisions/2026-11-01-for-the-hackathon-jadwigo-is-live-in-polish-and-english-on-jadwi`).
There is no jadwigo.kids. English reaches a deploy only once `en` is `live` in `packages/config`
(`dl-5ssh.34.70`) and its pages are reviewed.

- **Not here:** Anything behind a login; that is `apps/web`.
- **Owner:** the marketing workstream (`docs/workstreams/marketing.md`). **Filled by:** `dl-w0b4.1` and the issues it blocks.
- **Imports:** packages: `config` (hosts and languages), `ui` (the brand SVGs, `@jadwigo/ui/brand/*`, and `foundation.css`) and `copy` (the `site_*` messages).
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test build --filter=./apps/site`, then `bun run check:dist`.
  `bun run build:preview` writes `dist-preview`: every listed language and every unreviewed page,
  for checking the `/en/` twins before English is live. It is never deployed.
- **Deploy:** the owner runs `make -C infra site-deploy` (build, `check:dist`, sync to the bucket, invalidate). A merge deploys nothing.

## How it is laid out

- `src/content/<lang>/*.md`: each page's words, one file per page; the entry id is its path (`pl/index`).
  Frontmatter: `title`, `description`, `heading`, `ogImage` (optional, a path under `public/`) and
  `reviewed`; optional `lang`, `path`, `translation` and `draftNote`. The schema is `pageSchema` in `src/lib/seo.ts`.
- `src/pages/[...path].astro`: renders every page that names a `path`. A `path` is a stable URL, so
  never move one: the privacy pages' paths are in the Meta app's settings (dl-w0b4.64).
- Every page has an English twin. A page in `src/pages` is one rest-param file named after its key in
  `src/content/twins.ts` (`[...lessons].astro` builds `/lekcje` and `/en/lessons`), and its words
  come from `src/content/<lang>/landing.yaml`. A content page with a `path` names its twin in
  `translation`. The header's switch, the hreflang alternates and every link name only a served page.
- `src/lib/i18n.ts`: which languages a build serves (`servedLanguages`), the static paths, and `?lang=`
  on links into the app from an English page. `src/lib/build.ts`: `strictBuild`, true for the build
  that is deployed.
- The frame's own words (nav labels, sign-in, footer, the switch, the 404) are the `site_*` Paraglide
  messages in `packages/copy/messages`; recompile with `bun run messages` there. Long words stay in
  the content collections.
- `src/lib/seo.ts`: the head every page carries (canonical on the apex, Open Graph, Twitter, JSON-LD),
  `robots.txt`, and `assertReviewed`. Pure, so `seo.test.ts` checks it without a build.
- `src/layouts/Base.astro`: the frame every page renders in. `src/pages/`: the routes.
- `scripts/check-dist.ts`: what the built `dist/` must carry before it is uploaded.

## Rules here

- Hosts come from `packages/config`, never a hard-coded domain.
- A page with `reviewed: false` builds in dev and stops a prod build. A native speaker reviews the
  Polish before it is flipped; English is passed by the AI reviewer with its English checklist.
  Only the languages a build serves count, so an English draft never stops a Polish build. A page with its own `path` is left out of a prod build instead, with
  a log line, and `check:dist` requires it once its source says `reviewed: true` (`src/lib/dist.ts`).
- The landing page (`dl-5ssh.4`) speaks to the parent, who decides, and the child, who studies
  (`jadwigo-marketing/decisions/2026-10-27-parents-decide-and-children-study-both-feel-at-home-on-the-landi`).
  Its head and h1 are in `src/content/<lang>/index.md`, its section words in `src/content/<lang>/landing.yaml`
  (`src/lib/landing.ts` is the schema), and each language's index `reviewed` covers both. Copy says what Jadwigo
  does, never a slogan; numbers are digits; "diagnostic" is never shown.
- The header carries the crown wordmark (`dl-w0b4.68`) as a link home, a link to each page in
  `landing.yaml`'s `links` (each its own page, never an anchor), the switch to the page's twin, and
  the sign-in (`/zaloguj`, `/en/sign-in`). Links to the app come from `hosts.prod.app`, never typed.
- Colours and type come from `@jadwigo/ui/foundation.css` (Zeszyt) and Andika. Crown yellow is for
  the brand only.
- A link to a page with a `path` appears only when the build serves that page (`servedPathPages`),
  so a draft such as `/o-nas` is never linked.
- O nas names the son's school only after the school consents
  (`jadwigo-marketing/decisions/2026-10-31-the-o-nas-page-on-jadwigo-pl-names-the-son-s-school-jadwiga-scho`).
- `public/` holds the favicon files `tools/src/brand-icons.ts` writes. Edit their sources in
  `packages/ui/src/brand`, then run `make icons`.
