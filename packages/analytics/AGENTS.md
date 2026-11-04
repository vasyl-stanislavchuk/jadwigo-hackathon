# packages/analytics

PostHog for the site and the app: the event catalogue, the one init config, consent and
`before_send` (decision dl-376c8, `jadwigo-hackathon/decisions/2026-11-02-posthog-runs-on-the-site-and-in-the-app-with-session-replay-afte`).

- **Not here:** the consent banner's words (`packages/copy`) and its markup (each app's own).
- **Owner:** the marketing workstream (`docs/workstreams/marketing.md`). **Filled by:** `dl-w0b4.13`.
- **Imports:** `config`, `posthog-js` and `posthog-node`, which nothing else in the repo imports.
- **Public surface:** `src/index.ts` for browsers, `src/server.ts` (`@jadwigo/analytics/server`) for
  the Lambdas. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/analytics`

## Rules here

- An event is sent only through `track()`, and exists only once `src/catalog.ts` names it with
  the question it answers. `catalog.test.ts` refuses a key that could carry a learner's data
  (name, email, learner, child, parent, answer, score, age, token, an id) and any free string.
  A boolean named `has_*` or `is_*` is allowed: it carries one bit.
- Every visitor is opted in from the first page (the owner's call on 2026-11-04, `dl-w0b4.129`,
  superseding `dl-376c8`'s consent gate until the privacy pages are rewritten): `startAnalytics`
  opts in a browser that has not answered, so the banner never shows. A browser whose cookie says
  no stays out; `rejectConsent()` opts out. There are no person profiles and no `identify`.
- Replay masks every input. Text on screen is recorded, by the owner's decision. Wrap anything
  else that must never be recorded in the `ph-no-capture` class.
- `before_send` cuts ids, queries and hashes out of every URL, drops `title` and person properties,
  and adds `surface` and `$geoip_disable` to every event.
- An uncaught error leaves as its type, its stack and a scrubbed message, and nothing else
  (`src/scrub.ts`, the owner's 2026-11-04 decision, `dl-9tuku`,
  `jadwigo-hackathon/notes/2026-11-04-posthog-error-tracking-runs-on-web-site-api-and-runner-with-scru`).
  Scrubbing works on patterns, so never write a learner's name into an error of our own.
  Browser noise and visitors' extensions are dropped, and a caught error goes through `reportError`.
- Without a key, `startAnalytics` loads nothing, so tests and local dev stay off the network.
