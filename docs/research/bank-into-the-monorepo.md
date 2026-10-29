# How does the prototype bank reach the monorepo and the production platform?

Issue: `dl-n9fr.32`

**The answer in 5 lines.** The bank service stays a Python Lambda deployed from the
`jadwigo-bank` repo, as the repo split decision says; the monorepo never holds the bank, its
pipeline or its index, only the contract, a client, one route and a test double. The seam is the
search envelope, already pinned in both repos at the same commit, so the move is a port of
clients, not a rewrite of search. `packages/contracts` gains the need and envelope schemas and one
route; `apps/api` gains that route, authorized like every other, which invokes the bank Lambda's
`live` alias through the SDK so the bank's own token and URL never enter the monorepo;
`packages/bank` becomes `createBank` over a `fixture` and an `api` backend with the shared doubles
and one conformance suite; `apps/cli` receives the `dl` modules file for file. What the vision
described and the prototype replaced is the import-then-S3-event index: the bank publishes from a
clean main only after the eval gate passes, which the vision lacked.

## Method

Read: the 3 vision pages (`jadwigo-aws-platform/bank.html`, `jadwigo-monorepo/bank.html`,
`jadwigo-data-model/library.html`, sources in `david-learns/docs/drops/` and the monorepo drop's
home), this repo's `AGENTS.md`, `docs/workstreams/question-bank.md`, `packages/bank/src/index.ts`,
`packages/contracts/src/routes.ts`, `apps/api/src/app.ts` and `authorize.ts`, `infra/Makefile`
and `infra/terraform/modules/app/api.tf`, `docs/runbooks/README.md`; in `jadwigo-bank`, every
handoff under `handoffs/`, `infra/README.md`, `service/README.md`, `evals/runs/README.md`,
`docs/drop/evidence/route-timings.json`; in `david-learns`, `handoffs/product.md` and
`docs/reference/question-tools.md`. Not done: nothing in this repo was changed or deployed, and
the latency of a call through API Gateway and `apps/api` into the bank Lambda was not measured.

## Findings

### 1. What the monorepo holds for the bank today

- `packages/bank/src/index.ts` is 7 lines: the `BankSource` names `fixture`, `local`, `remote`.
- `packages/contracts/src/routes.ts` has no questions route; its table covers featured lessons,
  assignments and attempts under `/api/v1`, with the rule that paths are plural nouns nested by
  ownership and never verbs (`packages/contracts/RULES.md`, rules 14 and 15).
- `apps/api/src/app.ts` registers every route from `ROUTES` on the Powertools router and parses
  each reply with the route's response schema; `authorize()` runs first on every route and scopes
  by pod (`apps/api/src/authorize.ts`), with a token able to replace the id later without changing
  a route.
- `infra/Makefile` lets only the owner deploy (`NOT_FROM_AGENT`), and `infra/terraform/modules/app`
  holds one Lambda behind API Gateway v2 with its log groups and an SSM parameter for the database
  URL.
- `apps/cli` is a Python and Click project that imports nothing of ours and talks to the API over
  HTTP (`apps/cli/AGENTS.md`); `jw mcp serve` is named there as later work.

### 2. What the prototype has, and what is live

From `jadwigo-bank/handoffs/service.md`, `infra/README.md` and `evals/runs/README.md`:

- A Python Lambda `jadwigo-bank-search` behind a function URL with a bearer token from Secrets
  Manager, arm C with the A1 fallback on a time budget, staged results, a cache by need, the
  version 1 envelope on every answer with `bank_rev` and per-stage timing, SnapStart and a
  keep-warm ping. S3 Vectors holds the index and DynamoDB the rows.
- Its own Terraform root, `jadwigo-bank/infra/`, applied in account 843109108289, eu-central-1.
- `tools/bank_publish.py` puts rows and vectors by content hash and checks them in sync;
  `tools/bank_eval.py` and `tools/bank_gate.py` score and block; the first publish is in
  (`handoffs/service.md`, "The lead's next commands", and the bead `dl-e8ov.5.2.10`).
- On the product side, `david-learns/src/dl/bank_client.py`, the `dl question search` command,
  `dl mcp serve` with the 3 question tools, the model client on the shared ledger, the PII guard
  and the lesson draw (`david-learns/handoffs/product.md`).
- The envelope schema is pinned in both repos at bank commit `ac60440`
  (`david-learns/src/dl/contracts/search-envelope.schema.json`, header comment), with 14 contract
  tests against a fake bank (`david-learns/tests/contract/test_bank_client.py`).

### 3. Where the vision and the prototype differ

| Topic | The vision pages | The prototype, live | What to keep |
| --- | --- | --- | --- |
| How a change reaches the index | `jw question import` uploads pages to S3, an S3 event runs an index function, a sweep every 15 minutes re-embeds drift, `sync --check` compares 4 places (`jadwigo-aws-platform/bank.html`, "Re-index and extend") | pages live in git in `jadwigo-bank`; `bank_publish` writes rows, vectors and `bank_rev` from a clean main, only after `make gate` passes; `--check` compares git, the index and the table | the prototype: fewer moving parts, and the gate is the one thing the vision had no place for |
| The searches | 4 searches (meaning, skill, type, mistake), each a filtered vector query, merged by turns | 1 need carrying words, skills and mistakes; hard filters off, because the needs' free-text skills never meet the rows' proposed ids and 162 of 215 needs got 0 candidates (`evals/runs/README.md`, "Filters on") | the prototype's one need; the skill mapping is `dl-n9fr.31.11` |
| Rerank depth | top 25 | Voyage over the top 50, S3 Vectors at depth 300, because depth 100 lost 0.015 recall at 10 (`handoffs/service.md`) | the measured values |
| Page grain | one markdown page per question with frontmatter filters | one JSON set page per Khan exercise with its items, under `schemas/set.schema.json` (decision: search returns question sets) | the set page |
| The served copy | S3 `questions/` behind a read-only role, media by hash behind CloudFront, keys in a private bucket | the public page fields in DynamoDB rows; media shas on the rows, no media served; private bodies never published | the rows as the served copy; media and keys are open work |
| Who calls | one gateway, `jgw_` tokens from `jw login`, `GET /api/questions/search` | one bank bearer token for every caller, `POST <url>/questions/search` | the platform's `authorize()` on the route, the bank token kept server-side |
| MCP | stdio `jw mcp serve`, a remote address later | `dl mcp serve` exists with the 3 tools (`david-learns/handoffs/product.md`) | move it as it is |

### 4. The seam that makes the move cheap

Both repos already build against the same envelope and need schemas at the same commit, so a
TypeScript client and a Python client can be checked against the same fixture
(`david-learns/tests/fixtures/bank/envelope.json`). `apps/api` parses every reply with the
route's response schema (`apps/api/src/app.ts`), which drops any field the envelope does not name,
so a private body can never leave through this route even if a row carried one.

### 5. What is not measured

A call through API Gateway, `apps/api` and an SDK invoke of the bank Lambda adds a hop the
prototype's numbers do not include. The bank's own route sits at 950ms server-side p95 for the
reranked answer and about 428ms at the median for the first stage, against a budget of 1s and
400ms (`jadwigo-bank/docs/drop/evidence/route-timings.json`). The first-stage line is already
over, so the hop has to be measured before the owner chooses between the proxy and a direct call.

## What this means for jadwigo

The order below is by dependency; each wave is small enough for one lane, and none changes AWS
until the owner applies.

1. **Contract.** `packages/contracts` takes `need` and `search-envelope` as JSON Schema snapshots
   pinned to the bank commit, Zod schemas made from them, and one route in `ROUTES` for a search
   (its exact name is the owner's call under rule 14, below). `apps/api` registers it with
   `authorize()` first and a fake bank behind it in tests. No AWS.
2. **The bank package.** `createBank(profile)` with `fixture` (factory envelopes and the doubles
   the vision named: empty, abstaining, degraded rerank, times out, key leak) and `api` (the
   `/api/v1` route through `packages/api-client`). `local` and `remote` as the vision described
   them are not needed for the hackathon: the Python service with its Fake index plays that role in
   `jadwigo-bank` (`service/local.py`), and the CI bank job runs there as `make gate`. One
   conformance suite: the envelope validates, every state row is one of the 5, no private body
   field appears, a degraded rerank still returns A1's rows.
3. **The CLI.** `apps/cli` receives `bank_client`, the `question` command, `mcp`, `muse`, `pii`,
   `draw` and `explain` from `david-learns/src/dl` file for file, under the `jw <record> <verb>`
   rule, reading the bank through `/api/v1` once `jw login` exists (`dl-e8ov.2.11`) and through
   `JW_BANK_URL` until then. The MCP registration lines move with `docs/reference/question-tools.md`.
4. **The handshake in infra.** The bank's Terraform root stays in `jadwigo-bank` and writes the
   `live` alias ARN to an SSM parameter; this repo's `modules/app` reads it as a data source,
   grants `lambda:InvokeFunction` on that alias to the api role, and sets it in the function's env.
   The owner applies each root from a terminal, per `infra/Makefile`. The function URL stays for
   the owner's curls and the route eval until the owner retires it.
5. **Measure the hop.** The 150-need route eval (`jadwigo-bank/tools/bank_eval.py --url`) once
   through `/api/v1` and once direct, recorded beside `evals/runs/route-tune-C-950.json`.
6. **Content homes.** The Khan pipeline (`david-learns/scripts/khan`) and `build_sets.py` home in
   `jadwigo-bank` (`dl-n9fr.30`), so every step of `jadwigo-bank/docs/growing-the-bank.md` runs
   from one repo. The next slice follows that document.
7. **The rest of the vision**, each already a bead: the page route (`dl-e8ov.5.2.22`), the gaps
   route (`dl-e8ov.5.2.23`), the first search view (`dl-e8ov.5.2.24`), media by hash behind
   CloudFront, the private bodies and keys, and a remote MCP address.

```json jadwigo-outcome
{
  "issue": "dl-n9fr.32",
  "question": "How does the prototype bank reach the monorepo and the production platform?",
  "answer": "The bank service stays a Python Lambda deployed from jadwigo-bank behind the search envelope; the monorepo adds the schemas and one route to contracts, a fixture and api backend with doubles and a conformance suite to packages/bank, the route to apps/api with authorize() invoking the bank alias through the SDK, the dl modules to apps/cli, and an SSM handshake between the 2 Terraform roots.",
  "status": "answered",
  "sources": [
    "https://drops.medallion.md/sites/jadwigo-aws-platform/bank.html",
    "https://drops.medallion.md/sites/jadwigo-monorepo/bank.html",
    "https://drops.medallion.md/sites/jadwigo-data-model/library.html",
    "https://drops.medallion.md/sites/jadwigo-bank-architecture/",
    "docs/workstreams/question-bank.md",
    "packages/contracts/src/routes.ts",
    "apps/api/src/app.ts"
  ],
  "owner_decisions": [
    {
      "question": "How do web, cli and MCP reach the bank?",
      "options": [
        "only through apps/api under /api/v1 with authorize(), the bank's URL and token kept server-side",
        "directly against the bank's function URL with a per-caller token, no hop through apps/api",
        "both for the hackathon, the direct URL retired once the hop is measured inside the latency budget"
      ]
    },
    {
      "question": "What is the search route called under rule 14 (plural nouns, no verbs)?",
      "options": [
        "POST /api/v1/question-searches, a search as a created resource",
        "POST /api/v1/question-sets/searches, nested under the sets it returns",
        "GET /api/v1/question-sets with the need's fields as query parameters"
      ]
    },
    {
      "question": "Where does the bank's Terraform root live?",
      "options": [
        "in jadwigo-bank/infra as today, with an SSM parameter as the handshake",
        "moved into infra/terraform/modules/bank here, applied with the platform from one root"
      ]
    },
    {
      "question": "Where does the Khan pipeline home (dl-n9fr.30)?",
      "options": [
        "in jadwigo-bank/tools beside build_sets.py, so one repo runs every growth step",
        "stays in david-learns/scripts/khan until david-learns is retired"
      ]
    },
    {
      "question": "What is the bank's served copy, as the private-repo decision words it?",
      "options": [
        "the public page fields in the DynamoDB rows, as the prototype does today",
        "an S3 questions/ copy of the set pages beside the rows, as the vision drew it"
      ]
    }
  ],
  "proposed_issues": [
    {
      "title": "contracts: the need and search-envelope schemas pinned to the bank commit, Zod from them, and one search route in ROUTES",
      "scope": "packages/contracts: schemas/need.json and schemas/search-envelope.json copied from jadwigo-bank at a named commit, Zod schemas in src, the route entry with params, body, response and status; a test that the fixture envelope from david-learns parses",
      "done_when": "bunx turbo run lint typecheck test --filter=./packages/contracts passes and the route's response schema rejects a row with a private body field",
      "depends_on": [],
      "labels": ["project:jadwigo-question-bank"]
    },
    {
      "title": "apps/api: the search route, authorize() first, invoking the bank Lambda's live alias through the SDK, a fake bank in tests",
      "scope": "apps/api/src/questions.ts registered from ROUTES; the bank alias ARN from the env; a fake invoke in routes.test.ts returning the fixture envelope; the reply parsed by the response schema",
      "done_when": "the route test passes on the fake, a request without authorization is refused as every route is, and the reply validates against the envelope",
      "depends_on": ["the contracts issue"],
      "labels": ["project:jadwigo-question-bank"]
    },
    {
      "title": "packages/bank: createBank over fixture and api, the shared doubles, one conformance suite",
      "scope": "src/index.ts createBank(profile); src/fixture.ts with fakeBank, emptyBank, bankThatAbstains, degradedRerank, bankThatTimesOut, keyLeakAttempt; src/api.ts over packages/api-client; @jadwigo/bank/testing exported for tests only; the conformance suite run on both",
      "done_when": "bunx turbo run lint typecheck test --filter=./packages/bank passes with the suite green on fixture and api against a fake route",
      "depends_on": ["the contracts issue"],
      "labels": ["project:jadwigo-question-bank"]
    },
    {
      "title": "apps/cli: the dl bank modules moved file for file: client, question verbs, mcp serve, muse client, PII guard, draw, explain",
      "scope": "apps/cli/src/jw gains bank_client, commands/question, commands/mcp, muse, pii, draw, explain and their tests from david-learns/src/dl; jw question search, show, gaps and jw mcp serve under the record-verb rule; the registration lines in docs; JW_BANK_URL until jw login exists",
      "done_when": "cd apps/cli && uv run --frozen pytest -q passes with the moved tests, and jw mcp serve lists the 3 tools to an MCP client",
      "depends_on": [],
      "labels": ["project:jadwigo-ai-workflows"]
    },
    {
      "title": "infra: the SSM handshake between the bank's Terraform root and modules/app, with the invoke grant on the live alias",
      "scope": "jadwigo-bank/infra writes /jadwigo/bank/search-alias-arn; infra/terraform/modules/app reads it as a data source, grants lambda:InvokeFunction on it to the api role and sets BANK_SEARCH_ALIAS_ARN; a runbook in docs/runbooks for applying both roots in order",
      "done_when": "terraform plan is clean in both roots, the owner applies, and the api route answers a need through the alias",
      "depends_on": ["the apps/api issue"],
      "labels": ["project:jadwigo-platform"]
    },
    {
      "title": "Measure the gateway hop: the 150-need route eval through /api/v1 beside the direct function URL",
      "scope": "jadwigo-bank/tools/bank_eval.py run --url against the /api/v1 route with the platform's authorization, written to evals/runs/route-tune-C-gateway.json; the per-stage timings from both function logs",
      "done_when": "the run file exists and evals/runs/README.md states the hop's p50 and p95 beside the direct route's",
      "depends_on": ["the infra handshake issue"],
      "labels": ["project:jadwigo-question-bank"]
    }
  ],
  "page_changes": [
    { "section": "jadwigo-monorepo bank.html, The backends", "change": "fixture and api are the hackathon backends; local and remote are served by the Python service and its Fake index in jadwigo-bank" },
    { "section": "jadwigo-aws-platform bank.html, Re-index and extend", "change": "the import, S3 event and 15-minute sweep are replaced by publish from a clean main after the eval gate, with --check" },
    { "section": "docs/workstreams/question-bank.md, Open", "change": "add the 5 owner decisions above and link this note" }
  ]
}
```
