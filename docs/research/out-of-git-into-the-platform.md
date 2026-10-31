# What does the system read that no git repo holds, and how does each piece get a production home?

Issue: `dl-n9fr.45`

**The answer in 5 lines.** The system reads 27 things no git remote holds. The heaviest is the
Khan pull in `david-learns/media/khan`, the only copy of every question body and answer key. The
rest is the bank's built index, its Terraform state, the Muse ledger, 3 settings files, 2 key
sources and the bank repo itself, which has no remote. Each gets one of 4 homes: a private
versioned bucket in account 843109108289 for data, Secrets Manager or SSM for secrets, an S3
backend for state, and one documented settings file for an operator. Under the decisions in
force, content stays out of the monorepo's git, so "owned from the hackathon repo" can mean the
monorepo documents, wires and checks these homes. Whether it can also mean the monorepo creates
them, or holds the bank repo, is the owner's call, written as decisions below.

## Method

Read, in `jadwigo-bank`: `docs/drop-run/evidence/dl-remainder.json` and `docs/drop-run/spec.json`
(the sections "Where the pieces are today", "The gaps today" and "Moving the rest out of the
prototype"), `docs/runbook.md`, `docs/growing-the-bank.md`, `infra/*.tf`, `infra/.gitignore`,
`.gitignore`, `tools/build_sets.py`, `tools/khan/*.py`, `tools/muse_call.py`, `tools/with_keys.py`,
`tools/bank_publish.py`, `service/config.py`, `.github/workflows/eval-gate.yml`. In this repo:
`docs/research/bank-into-the-monorepo.md`, `infra/terraform/environments/prod.backend.hcl`,
`infra/terraform/modules/app/bank.tf` and `api.tf`, `infra/README.md`, `apps/cli/src/jw/settings_keys.py`,
`bank_client.py`, `items.py`, `muse.py`, `docs/runbooks/bank-handshake.md` and the wave 4 plan. In
`david-learns`: the layout of `media/khan` by `ls` and `du`, `frontend/src/playground/khan/`,
`frontend/vite.config.ts`, `backend/apps/drops/media.py`. Beads, read only: `dl-n9fr.43`,
`dl-n9fr.44`, `dl-e8ov.5.38` and its children, `dl-n9fr.15`, `dl-e8ov.5.2.20`, `dl-e8ov.5.2.22`.

The settings files under `~/.config/jadwigo-bank/` were listed by key name only. No value was
read or printed. Not done: nothing was applied, uploaded or synced. No AWS call was made, so what
Secrets Manager and SSM hold today is read from the Terraform and the runbooks, not from the
account. Whether the OpenAI and Voyage keys in md's work brain are the same keys as the ones in
Secrets Manager was not checked, because checking means reading the values.

## Findings

### 1. The question

The bank, the CLI, the MCP server and the lesson path read 4 kinds of thing that no git remote
holds. **Data**: the Khan pull, the built index, the function bundle and the Muse ledger.
**Secrets**: 4 vendor and service keys in Secrets Manager, the read token in SSM, and copies of
both in mode-600 files on one laptop. **State**: the bank's Terraform state, local to the machine
that applied. **Settings**: which folder, file or URL each reader uses, today spread across
environment variables, defaults hard-coded to `~/projects/david-learns`, and 3 env files.

A production home owned from the hackathon repo means, for each kind:

- **Data** sits in a private, versioned bucket in the bank's account, created by Terraform.
  [The bucket decision](https://drops.medallion.md/sites/jadwigo-bank-run-and-lesson/) places the
  Khan pull there. Which Terraform root creates the bucket is open (owner decision 2).
- **Secrets** sit in Secrets Manager or SSM in account 843109108289, set by hand and never in state
  or git, per `jadwigo-question-bank/decisions/2026-10-28-production-runs-in-account-843109108289-eu-central-1-with-keys-i`.
- **State** sits in an S3 backend with versioning and a lock, as the monorepo's own root already
  does (`infra/terraform/environments/prod.backend.hcl`).
- **Settings** sit in one documented file an operator fills, whose every key the monorepo's docs
  name, with no value in git.

The decisions bound this. Bank content, golden sets and runs never enter the monorepo's git
(`david-learns/decisions/2026-10-24-the-question-bank-is-never-committed-to-the-jadwigo-repo`). The
bank is its own private repo (`jadwigo-question-bank/decisions/2026-10-27-the-question-bank-lives-in-its-own-private-repo-separate-from-th`).
The bank repo owns data, the search service and its Terraform
(`jadwigo-question-bank/decisions/2026-10-28-the-bank-repo-owns-data-and-search-service-the-product-repo-owns`).
Callers reach the bank only through `apps/api`
(`jadwigo-question-bank/decisions/2026-10-28-callers-reach-the-bank-only-through-apps-api-which-invokes-the-b`).
Khan items never enter git (`jadwigo-platform/decisions/2026-10-28-lesson-fixtures-may-hold-steps-based-on-our-own-small-bank-khan`).
The owner's words "get it into the hackathon repo" collide with the first 3 where they would put
content, or the bank repo, inside the monorepo. This note does not resolve that collision. It is
owner decision 1.

### 2. The inventory

Counts marked "survey" are from `jadwigo-bank/docs/drop-run/evidence/dl-remainder.json`. Sizes
marked "du" are from `du -sh` on the folder named. Paths under `khan/` are relative to
`~/projects/david-learns/media/khan`.

| # | What | Where today | Size or count | Who reads it | What breaks without it | Production home | The one change that re-points the reader |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Khan raw items, English | `khan/en/items/`, `khan/en/raw/` | 8,787 items (survey), 88M (du, the whole `en/`) | `jadwigo-bank/tools/build_sets.py:205` (sample text), `tools/khan/manifest.py:82`, `tools/khan/media.py:140` | set pages cannot be rebuilt; a new grade cannot be parsed | bucket, `khan/raw/en/` | `build_sets.py:31` `DEFAULT_KHAN_DIR` becomes the setting `JADWIGO_KHAN_DIR`, a local folder or a synced copy of the bucket |
| 2 | Khan raw items, Polish | `khan/pl/items/`, `khan/pl/raw/` | 6,944 items (survey), 70M (du) | `build_sets.py:205`, the Polish conversion of `dl-e8ov.5.38.1` | Polish set text and every Polish lesson body | bucket, `khan/raw/pl/` | the same setting |
| 3 | Exercise lists per grade | `khan/{en,pl}/exercises-grade-*.json` | 4 grade lists in each of `en/` and `pl/`, plus 4 other exercise lists and 3 inventories in `en/` (ls) | `build_sets.py:450` | `build_sets` stops at its first read | bucket, `khan/raw/{en,pl}/` | the same setting |
| 4 | Parsed candidates | `khan/candidates/` | 8,787 (survey), 50M (du) | `build_sets.py:218` (families and question types), `tools/khan/gallery.py:111` | pages lose their families and question types | bucket, `khan/candidates/` | the same setting |
| 5 | Converted items, English | `khan/converted.json` | 8,787 items (survey), 50M (du) | `tools/khan/to_questions.py:62`; `apps/cli/src/jw/items.py:36` as the fallback | `jw question item` and `question_item` when no Polish file exists | bucket, `khan/converted/en.json` | `apps/cli/src/jw/settings_keys.py:51` `DEFAULT_KHAN_DIR` points at the synced copy, not the david-learns checkout |
| 6 | Converted items, Polish, and refusals | `khan/converted-pl.json`, `khan/converted-pl.refused.json` | 697 converted, 2,023 refused (survey), 3.3M and 384K (du) | `apps/cli/src/jw/items.py:35`, read by `jw question item` and the `question_item` MCP tool | every lesson draft, by `jadwigo-hackathon/decisions/2026-10-29-the-first-lesson-draft-reads-item-bodies-from-the-local-bank-che` | bucket, `khan/converted/pl.json` and `pl.refused.json` | the same `settings_keys.py:51` change; later the item route replaces the file read |
| 7 | Manifest | `khan/manifest.json`, `khan/media/manifest.json` | 9.6M (du) | `to_questions.py:425` and `:426`, `gallery.py:107`, written by `manifest.py:117` | question pages and the gallery | bucket, `khan/manifest.json`, `khan/media/manifest.json` | the same `JADWIGO_KHAN_DIR` setting, read through `tools/khan/paths.py:20` |
| 8 | Pictures by sha | `khan/media/` | 28,262 files, 469 MB (survey); 527M (du) | `david-learns/backend/apps/drops/media.py:54` through `backend/config/settings.py:109`; the playground through `frontend/vite.config.ts:52` | every picture in the playground and, later, in the player | bucket, `khan/media/<sha>.<ext>` | `vite.config.ts:52` proxies `/media/khan/` to the bucket's read path (`dl-n9fr.44`), then the player reads the same path |
| 9 | The pool database | `khan/pool.sqlite` | 55M (du) | `tools/khan/gallery.py:48` | the owner's gallery of picks | bucket, `khan/pool/pool.sqlite` | the same setting |
| 10 | Translations | `khan/translations/` | 34 files (survey), 216K (du) | `to_questions.py:434`, written by `tools/khan/translate.py:36` | translated item text on question pages | bucket, `khan/translations/` | the same setting |
| 11 | Pull side files: `alt.json`, `picks.json`, `queries/`, `tmp/`, the gallery's `index.html`, 3 logs | `khan/` | `alt.json` 592K, `index.html` 3.3M, logs 312K (du) | `to_family.py` (alt text), `gallery.py:47` (picks), `capture.py:32` (queries) | alt text and picks; the logs and `index.html` are rebuilt | bucket for `alt.json`, `picks.json`, `queries/`; none for `tmp/`, logs and `index.html` | the same setting; the sync skips the rebuilt files |
| 12 | The built index | `jadwigo-bank/index/klasa3-enriched/`, an older `index/` beside it | 50M, plus 8M of cache and 4.4M of the older index (du) | `tools/bank_publish.py:53`, `tools/bank_gate.py` through `--index`; `eval-gate.yml` has a placeholder fetch | publish and the gate; it is rebuilt from the set pages with the OpenAI key | bucket, `index/<bank_rev>/`, so the CI gate can fetch it | the gate workflow's placeholder step downloads `index/<bank_rev>/` |
| 13 | Eval runs | `jadwigo-bank/evals/runs/` | in git (`git ls-files evals/runs`) | `tools/eval_report.py`, the gate | nothing; they are tracked | the bank repo's remote, once it exists | none |
| 14 | The function bundle | `jadwigo-bank/infra/build/` (`search.zip`, `service/`) | 70M (du) | `infra/main.tf:19` and `:21` | `terraform plan` refuses a missing or stale bundle | none: `tools/build_service.py` rebuilds it with one zip hash | none |
| 15 | The saved plan | `jadwigo-bank/infra/plan.tfplan` | 1 file (ls) | the owner's `terraform apply` | nothing; it is made by `plan` | none | none |
| 16 | The Muse ledger, bank | `jadwigo-bank/runs/muse/*.jsonl` | 2 files, 3,109 lines, 1.0M (wc, du) | `tools/muse_call.py:41`, which sums it before each call | the spend cap stops counting, so the next call starts from zero | owner decision 3 | `muse_call.py:41` `LOG_DIR` follows the chosen home |
| 17 | The Muse ledger, CLI | `apps/cli/logs/muse/` in this repo, gitignored | absent on the main checkout (ls) | `apps/cli/src/jw/muse.py:47` | the CLI's spend cap | owner decision 3 | `muse.py:47` follows the same home |
| 18 | `bank.env` | `~/.config/jadwigo-bank/bank.env`, mode 600 | 4 keys: `JW_BANK_URL`, `JW_BANK_TOKEN`, `JW_API_URL`, `JW_BANK_READ_TOKEN` | `apps/cli/src/jw/bank_client.py:103` through `settings_keys.py:37`, for `jw question` and `jw mcp serve` | the CLI and the MCP server find no bank when the environment is unset | the operator's settings file (section 3.4) | none for the file; its values are filled from SSM and Secrets Manager |
| 19 | `read.env` | `~/.config/jadwigo-bank/read.env`, mode 600 | 2 keys: `JW_API_URL`, `JW_BANK_READ_TOKEN` | no reader in either repo (`git grep read.env`) | nothing found | folded into `bank.env`, then removed | none |
| 20 | `muse.env` | `~/.config/jadwigo-bank/muse.env`, mode 600 | 1 key: `META_API_KEY` | `jadwigo-bank/tools/muse_call.py:46`; `apps/cli/src/jw/muse.py:8` | enrichment, needs and labels | Secrets Manager `jadwigo-bank/meta-api-key`, which already exists | `muse_call.py:46` reads the secret when the file is absent |
| 21 | The embedding and rerank keys for tools | md's work brain: `~/.config/medallion-dev/context/brain/.gbrain/env` and `config.json` | 2 keys: `OPENAI_API_KEY`, `VOYAGE_API_KEY` | `jadwigo-bank/tools/with_keys.py:19`, `:24` and `:30`, in front of `bank_index`, `bank_gate` and `golden_sets pool` | index builds, the gate and pooling on any machine without md | Secrets Manager `jadwigo-bank/openai-api-key` and `voyage-api-key`, which already exist | `with_keys.py` reads the 2 secrets through the `jadwigo` profile when the brain files are absent |
| 22 | The bank's Terraform state | `jadwigo-bank/infra/terraform.tfstate` and `.backup`, `.terraform/` | 51,096 and 52,624 bytes (ls) | `terraform plan` and `apply` in `jadwigo-bank/infra`; `infra/versions.tf:4` says "Local state for now" | no other machine can plan; a lost laptop orphans every bank resource | an S3 backend (owner decision 5) | a `backend "s3" {}` block in `versions.tf` and `terraform init -migrate-state` |
| 23 | The bank's 4 secrets | Secrets Manager, `jadwigo-bank/{openai-api-key,voyage-api-key,meta-api-key,api-token}` | 4 (`infra/secrets.tf`) | `jadwigo-bank/service/config.py:8` to `:12` | the search function | already home; values set by hand | none |
| 24 | The read token | SSM `/jadwigo/prod/bank-read-token` | 1 (`infra/terraform/modules/app/bank.tf:20`) | `apps/api` at run time through `BANK_READ_TOKEN_PARAM` (`api.tf:100`) | `POST /api/v1/question-searches` refuses every caller | already home; value set by hand | none |
| 25 | The database URL | SSM, `aws_ssm_parameter.database_url` | 1 (`infra/terraform/modules/app/api.tf:22`) | `apps/api` through `JADWIGO_DB_URL_PARAM` (`api.tf:98`) | every route | already home; value set by hand | none |
| 26 | The bank repo itself | `~/projects/jadwigo-bank`, no remote (`git remote` is empty) | 145 set files tracked (`git ls-files sets`), 12M of `.git` (du) | every bank tool, and `jw question show` through `JADWIGO_BANK_DIR` (`bank_client.py:278`) | set pages, golden sets, eval runs and the Terraform code exist on one laptop | a private remote (`dl-n9fr.15`) | none for readers; `JADWIGO_BANK_DIR` goes once the set route lands (`dl-e8ov.5.2.22`) |
| 27 | Question pages in dl-brain, and the playground's samples | `~/projects/dl-brain/questions/` (no remote, 58M for the whole repo, du); `david-learns/frontend/src/playground/khan/items.json`, committed | `items.json` is 1,076,640 bytes (ls) | `to_questions.py` writes pages into dl-brain; `tools/khan/to_family.py:57` writes `items.json` into the david-learns checkout through `paths.py:23` | the playground's samples; nothing in the bank or the monorepo reads the dl-brain pages | the bank repo for pages, by the 2026-10-27 decision; `items.json` is owner decision 4 | `paths.py:23` `DL_REPO` stops being a write target, per `dl-n9fr.43` |

Rows 13, 14, 15, 23, 24 and 25 need no move. They are listed so the inventory is whole.

### 3. The homes

#### 3.1 The bucket

- **Name and place.** A bucket such as `jadwigo-bank-content-843109108289` in eu-central-1. It is
  private, versioned, encrypted at rest, and blocks all public access, as `dl-n9fr.43` scopes.
- **Layout.** A source prefix first, so a second library fits beside Khan:
  `khan/raw/{en,pl}/` (items, raw, exercise lists, `pl/media.json`), `khan/candidates/`,
  `khan/converted/{en,pl}.json` with `pl.refused.json`, `khan/manifest.json`, `khan/media/<sha>.<ext>`
  with its manifest, `khan/translations/`, `khan/pool/pool.sqlite`, and `khan/side/` for
  `alt.json`, `picks.json` and `queries/`. A separate `index/<bank_rev>/` prefix holds each
  published index. `dl-n9fr.43` names the same prefixes without `khan/`. The drop names
  `questions/<source>/<id>`. Which layout wins is owner decision 6.
- **Who may read.** The publisher role (`jadwigo-bank-publisher`, `infra/iam.tf`) reads and writes.
  A new read role reads `khan/converted/` and `khan/media/` for the item route. The search
  function's role gets nothing, because the search serves public pages only. CI gets read access
  to `index/` for the gate once the repo has a remote.
- **How the readers read it.** The bank's tools read a synced local copy. A new
  `tools/khan/sync.py` copies the bucket down to `~/.cache/jadwigo-bank/khan` and the laptop
  folder up to the bucket. `JADWIGO_KHAN_DIR` names the copy. The future item route reads
  `khan/converted/pl.json` straight from the bucket through the read role.
- **The sync.** One way per run, `up` or `down`, with `--dry-run` and `--check`. `--check` prints
  counts and bytes per prefix against the numbers in `dl-remainder.json`. It never deletes on the
  bucket side without `--delete`, and versioning keeps any overwritten object.
- **The change.** A new `infra/khan_bucket.tf`, a read role and a publisher policy line in
  `infra/iam.tf`, an output with the bucket's name, all in `jadwigo-bank/infra`. That root is the
  bank's by the 2026-10-28 repo-split decision, unless owner decision 2 moves it.
- **By hand.** The owner applies, runs the first `sync up`, and reads `--check`.
- **Pictures.** The player needs pictures a child's browser can load. A private bucket serves
  them either through a public CloudFront path or through signed links from `apps/api`. That is
  owner decision 7. `dl-n9fr.44` waits on it.

#### 3.2 Secrets and parameters

- **Already in Secrets Manager**, created by `jadwigo-bank/infra/secrets.tf` with the placeholder
  "unset" and filled by hand: the OpenAI, Voyage and Meta keys and the bank's bearer token.
- **Already in SSM**: `/jadwigo/bank/search-alias-arn`, written by the bank's Terraform
  (`infra/ssm.tf`). `/jadwigo/prod/bank-read-token` and the database URL are written as
  placeholders by the monorepo's Terraform and filled by hand (`docs/runbooks/bank-handshake.md`).
- **Still only on the laptop**: the Meta key in `muse.env`, the OpenAI and Voyage keys `with_keys.py`
  reads from md's work brain, and copies of the bank token and the read token in `bank.env` and
  `read.env`. The CI gate also needs `OPENAI_API_KEY` and `VOYAGE_API_KEY` as repository secrets
  once the bank repo has a remote (`dl-n9fr.15` notes).
- **The change.** In `jadwigo-bank`, `with_keys.py` and `muse_call.py` fall back to Secrets Manager
  through the `jadwigo` profile when their files are absent. They never print a value and still
  strip `ANTHROPIC_API_KEY`. No new secret is created.
- **By hand.** The owner confirms the 2 vendor keys in Secrets Manager are the ones the tools should
  use, and adds the 2 repository secrets once the remote exists.

#### 3.3 State

- **Today.** The bank's state is local (`infra/versions.tf:4`, `docs/runbook.md:82`). The
  monorepo's state is in `jadwigo-terraform-state-843109108289` under `prod/terraform.tfstate`,
  versioned, with an S3 lock file (`prod.backend.hcl`). That bucket was made by hand
  (`infra/README.md:80`). Both roots run in the same account, 843109108289.
- **The 2 shapes.** Either the bank root uses the monorepo's state bucket under its own key, such
  as `bank/terraform.tfstate`, or a new bucket made the same way by hand. The first needs one
  more line in `infra/bootstrap/plan-policy.json`, which scopes the plan role to the `prod/` key
  today. The second keeps the 2 roots' blast radius apart. That is owner decision 5.
- **The change.** In `jadwigo-bank/infra`, a `backend "s3" {}` block in `versions.tf` and an
  `environments/prod.backend.hcl` in the monorepo's shape. `infra/README.md` and the runbook drop
  "plan from that machine". This is `dl-e8ov.5.2.20`.
- **By hand.** The owner runs `terraform init -backend-config=environments/prod.backend.hcl
  -migrate-state`, checks that `terraform plan` from a fresh clone is clean, and then deletes the
  local state files. State holds only the "unset" placeholders for secrets (`infra/secrets.tf`).

#### 3.4 Settings

- **Today.** The CLI and `jw mcp serve` read the URL and token pairs from the environment, then
  from `bank.env` (`bank_client.py:103`). They read `JADWIGO_BANK_DIR` and `JW_KHAN_CONVERTED` from
  the environment only. The bank's tools read `muse.env`, md's work brain, `JADWIGO_MUSE_LOG_DIR`,
  `DL_REPO` and `DL_BRAIN_DIR`, and fall back to paths inside `~/projects/david-learns`.
- **The one file.** `~/.config/jadwigo-bank/bank.env` stays the file an operator fills, mode 600.
  It gains the path keys: `JADWIGO_KHAN_DIR`, `JW_KHAN_CONVERTED` and `JADWIGO_BANK_DIR`, each
  until a route replaces it. `read.env` folds into it. `muse.env` goes once the Meta key comes
  from Secrets Manager.
- **Who reads it.** The CLI and the MCP server through one loader in `apps/cli/src/jw/settings_keys.py`,
  for every key, not only the URL pairs. The bank's tools through a small loader of their own in
  `jadwigo-bank/tools`, for `JADWIGO_KHAN_DIR` only. The bank repo never imports the monorepo.
- **The change.** The loader in `apps/cli`, every key named in this repo's `.env.example` and in a
  runbook section, and the defaults that point at `~/projects/david-learns` replaced by
  `~/.cache/jadwigo-bank/khan`.
- **By hand.** The operator fills the file once. Its token values come from SSM and Secrets Manager.
  Whether the direct pair `JW_BANK_URL` and `JW_BANK_TOKEN` stays in it is owner decision 8, since
  the function URL stays until the owner retires it.

### 4. The order

1. **The bank repo gets its private remote** (`dl-n9fr.15`). Needs nothing. Unblocks CI for the
   gate, a second machine, and the CI read of `index/`. By hand: the owner creates the remote.
2. **The bank's state moves to S3** (`dl-e8ov.5.2.20`). Needs owner decision 5. Unblocks every
   later apply from more than one machine, so the bucket is created into shared state.
3. **The bucket and its roles** (`dl-n9fr.43`, part 1). Needs step 2 and owner decisions 2 and 6.
   Unblocks the sync. By hand: the owner applies.
4. **The sync, and the first upload** (`dl-n9fr.43`, part 2). The code needs nothing and can be
   written beside step 2. The upload needs step 3. Unblocks "the laptop is not the only copy". The
   Polish conversion (`dl-e8ov.5.38.1`) keeps writing to the laptop folder by decision. Its output
   rides up with the next `sync up`.
5. **The readers re-pointed** (`dl-n9fr.43`, part 3, and one CLI change). `build_sets.py` and
   `tools/khan/paths.py` read `JADWIGO_KHAN_DIR`. `paths.py` stops writing into david-learns.
   `jw` defaults to the synced copy. The code needs nothing. It is useful once step 4 has run.
6. **Keys from Secrets Manager** for `with_keys.py` and `muse_call.py`. Needs nothing. Unblocks
   index builds and the gate on a machine without md.
7. **The settings file and its loader.** Needs step 5's keys to be named. Unblocks a fresh
   operator following one runbook.
8. **The index in the bucket and the CI gate.** Needs steps 1, 3 and 6. Replaces the placeholder
   fetch in `eval-gate.yml`.
9. **Pictures from the bucket.** Needs step 4 and owner decision 7. Unblocks `dl-n9fr.44`, which
   deletes the Django route and the Python lesson path.
10. **The set route and the item route** (`dl-e8ov.5.2.22`, and a new item route). Needs step 3's
    read role and the first publish. Unblocks agents without a checkout. `JADWIGO_BANK_DIR` and
    `JW_KHAN_CONVERTED` leave the settings file.
11. **The ledger home.** Needs owner decision 3. It can run at any point after step 1.

A wave a lead could run next, in the wave 4 plan's shape:

| Lane | Repo | Owns | Must not touch | Starts when | Done when |
| --- | --- | --- | --- | --- | --- |
| `state` | `jadwigo-bank` | `infra/versions.tf` (the backend block), `infra/environments/prod.backend.hcl` (new), `infra/README.md` and `docs/runbook.md` (the state lines) | every other `.tf` file, any `init`, `apply` or migration | the owner answers decision 5 | `terraform validate` passes; the owner migrates and a plan from a fresh clone is clean |
| `bucket` | `jadwigo-bank` | `infra/khan_bucket.tf` (new), `infra/iam.tf` (the read role and the publisher's lines), `infra/outputs.tf` (one output) | `function.tf`, `secrets.tf`, `main.tf`, any apply | the owner answers decisions 2 and 6 | `terraform validate` passes and the plan adds only the bucket, its settings and the role |
| `sync` | `jadwigo-bank` | `tools/khan/sync.py` (new), `tools/build_sets.py` (the setting), `tools/khan/paths.py`, `tests/test_khan_sync.py`, `docs/runbook.md` (the sync step), `docs/growing-the-bank.md` (step 1 inputs) | `infra/`, `service/`, the Khan folder itself | at once; tests use a fake S3 client | `uv run pytest -q` passes and `sync up --dry-run` on the laptop prints counts that match `dl-remainder.json` |
| `keys` | `jadwigo-bank` | `tools/with_keys.py`, `tools/muse_call.py` (the key source only), their tests | the ledger code, `infra/`, any secret value | at once | `uv run pytest -q` passes with a fake Secrets Manager client and no value in any output |
| `cli` | this repo | `apps/cli/src/jw/settings_keys.py`, `items.py`, `bank_client.py` (the loader), their tests, `apps/cli/README.md`, `.env.example` | `packages/`, `infra/`, `apps/api` | at once | `cd apps/cli && uv run --frozen pytest -q` passes and no default path names david-learns |

The pictures, the routes and the ledger wait on owner decisions 3 and 7 and on the bucket's first
upload, so they belong to the wave after this one.

### 5. What stays out of git on purpose

- **Bank content** stays out of the monorepo's git. That covers set pages, Khan items, the
  converted file, pictures and the built index. `david-learns/decisions/2026-10-24-the-question-bank-is-never-committed-to-the-jadwigo-repo`
  says so, and `jadwigo-platform/decisions/2026-10-28-lesson-fixtures-may-hold-steps-based-on-our-own-small-bank-khan`
  repeats it for Khan items in lesson fixtures.
- **Khan items and pictures** stay out of every git repo. They are large, licensed CC BY-NC-SA,
  and hold the answer keys. Their home is the bucket by the 2026-10-29 bucket decision.
- **Golden sets and eval runs** are in the bank repo's git, not the monorepo's. The 2026-10-28
  repo-split decision gives them to the bank repo.
- **The Muse ledger** is out of git in both repos (`.gitignore`, `apps/cli/.gitignore`). It is a
  running spend record that every lane appends to. A committed snapshot,
  `docs/drop-run/evidence/muse-spent.json`, carries its totals.
- **Secrets and state** never enter git, by the 2026-10-28 production decision.
- **The bundle, the plan and the caches** are rebuilt from git, so they need no home.

## What this means for jadwigo

The monorepo's part of the move is small and does not hold content. It is the CLI's settings
loader and defaults, the docs that name every key an operator fills, and the read path the item
route will take through `apps/api`. The rest lands in `jadwigo-bank`: the state backend, the
bucket, the sync, the key fallbacks and the gate's index fetch. If the owner wants the monorepo to
own more than that, decisions 1 and 2 are where it changes. The lead files the proposed issues
below. This note edits no bead.

```json jadwigo-outcome
{
  "issue": "dl-n9fr.45",
  "question": "What does the system read that no git repo holds, and how does each piece get a production home owned from the hackathon repo?",
  "answer": "27 out-of-git dependencies, led by the Khan pull that holds every question body and key on one laptop; each goes to a private versioned bucket in 843109108289 (data), Secrets Manager or SSM (secrets, mostly there already), an S3 backend (the bank's local state) or one documented settings file, in an order that starts with the bank repo's remote and its state, then the bucket, the sync and the readers; content stays out of the monorepo's git, so whether the monorepo also creates these homes or holds the bank repo is the owner's call.",
  "status": "answered",
  "sources": [
    "https://drops.medallion.md/sites/jadwigo-bank-run-and-lesson/",
    "https://drops.medallion.md/sites/jadwigo-bank-architecture/",
    "jadwigo-bank/docs/drop-run/evidence/dl-remainder.json",
    "jadwigo-bank/docs/runbook.md",
    "jadwigo-bank/infra/secrets.tf",
    "infra/terraform/environments/prod.backend.hcl",
    "apps/cli/src/jw/settings_keys.py"
  ],
  "citations": [
    "jadwigo-question-bank/decisions/2026-10-29-the-question-bodies-and-answer-keys-live-in-a-private-bucket-in",
    "david-learns/decisions/2026-10-29-the-django-backend-and-the-python-lesson-path-in-david-learns-ar",
    "david-learns/decisions/2026-10-24-the-question-bank-is-never-committed-to-the-jadwigo-repo",
    "jadwigo-question-bank/decisions/2026-10-27-the-question-bank-lives-in-its-own-private-repo-separate-from-th",
    "jadwigo-question-bank/decisions/2026-10-28-the-bank-repo-owns-data-and-search-service-the-product-repo-owns",
    "jadwigo-question-bank/decisions/2026-10-28-callers-reach-the-bank-only-through-apps-api-which-invokes-the-b",
    "jadwigo-question-bank/decisions/2026-10-28-production-runs-in-account-843109108289-eu-central-1-with-keys-i",
    "jadwigo-hackathon/decisions/2026-10-29-the-first-lesson-draft-reads-item-bodies-from-the-local-bank-che",
    "jadwigo-platform/decisions/2026-10-28-lesson-fixtures-may-hold-steps-based-on-our-own-small-bank-khan"
  ],
  "owner_decisions": [
    {
      "question": "Does the private bank repo stay separate, or fold into the monorepo, given that bank content never enters the monorepo's git and the bank is its own private repo?",
      "options": [
        "it stays a separate private repo with its own remote; the monorepo pins the envelope by commit and documents the homes, as the 2026-10-24, 2026-10-27 and 2026-10-28 decisions say",
        "it becomes a git submodule of the monorepo pointing at the bank's private remote, so the monorepo's git holds only a commit pointer and the content stays in the bank repo",
        "its code (tools, service, infra) folds into the monorepo as a private package, and its content (sets, golden sets, runs) stays in the bank repo or the bucket; this supersedes the 2026-10-28 repo-split decision",
        "all of it folds into the monorepo; this withdraws the 2026-10-24 and 2026-10-27 decisions"
      ]
    },
    {
      "question": "Which Terraform root creates the content bucket?",
      "options": [
        "the bank's root in jadwigo-bank/infra, beside the vectors and the table, as the 2026-10-28 repo-split decision places the bank's Terraform",
        "the monorepo's root in infra/terraform, as a new module, with the bank's tools given its name through SSM the way the alias ARN travels today"
      ]
    },
    {
      "question": "Do the Muse ledger and the eval runs get a home beyond the bank repo?",
      "options": [
        "no: the ledger stays gitignored on the laptop with a committed totals snapshot, and the eval runs stay in the bank repo's git",
        "the ledger is synced to a ledger/ prefix in the bank's bucket and every lane reads the merged total from there; the eval runs stay in git",
        "the ledger moves to a DynamoDB table every caller writes and sums; the eval runs are also copied to the bucket beside the index they scored"
      ]
    },
    {
      "question": "Does the playground keep its own 1 MB Khan sample file?",
      "options": [
        "yes, committed in david-learns as it is, as dl-n9fr.44 scopes",
        "no: the playground fetches its samples from the bucket's converted files at start, and the file leaves git",
        "no: the playground is retired with the Django backend and the file goes with it"
      ]
    },
    {
      "question": "Which state bucket does the bank's Terraform root use?",
      "options": [
        "the monorepo's jadwigo-terraform-state-843109108289 under a key of its own, with one more line in the plan role's policy",
        "a new state bucket for the bank, made by hand the same way, so the 2 roots share no state bucket"
      ]
    },
    {
      "question": "Which prefix layout does the content bucket use?",
      "options": [
        "the bead's: raw/{en,pl}/, candidates/, converted/{en,pl}.json, media/<sha>",
        "the same under a source prefix: khan/raw/{en,pl}/, khan/converted/..., khan/media/<sha>, so a second library sits beside it",
        "the drop's: questions/<source>/<id> per item, with pictures by sha"
      ]
    },
    {
      "question": "How does a child's browser load a Khan picture from a private bucket?",
      "options": [
        "a public CloudFront path over khan/media/ only, with the bucket itself still private",
        "short-lived signed links that apps/api issues with each lesson step"
      ]
    },
    {
      "question": "Does the direct pair JW_BANK_URL and JW_BANK_TOKEN stay in the operator's settings file?",
      "options": [
        "yes, for the owner's curls and the route eval until the function URL is retired",
        "no: the file holds only JW_API_URL and the read token, and the direct pair lives in the owner's shell when needed"
      ]
    }
  ],
  "proposed_issues": [
    {
      "title": "jw: one settings loader for every key in ~/.config/jadwigo-bank/bank.env, and defaults that no longer name david-learns",
      "scope": "apps/cli/src/jw/settings_keys.py, items.py and bank_client.py: the env file read for JADWIGO_BANK_DIR, JW_KHAN_CONVERTED and JADWIGO_KHAN_DIR as well as the URL pairs; DEFAULT_KHAN_DIR becomes ~/.cache/jadwigo-bank/khan; .env.example and apps/cli/README.md name every key",
      "done_when": "cd apps/cli && uv run --frozen pytest -q passes, no test reads the real file, and git grep david-learns/media in apps/cli finds nothing",
      "depends_on": [],
      "labels": ["project:jadwigo-question-bank"]
    },
    {
      "title": "jadwigo-bank: with_keys and muse_call read the OpenAI, Voyage and Meta keys from Secrets Manager when their local files are absent",
      "scope": "tools/with_keys.py and tools/muse_call.py fall back to jadwigo-bank/openai-api-key, voyage-api-key and meta-api-key through the jadwigo profile; values go to the child only, never printed; ANTHROPIC_API_KEY still stripped",
      "done_when": "uv run pytest -q passes with a fake Secrets Manager client, and a run with the brain files moved aside builds a hashing index",
      "depends_on": [],
      "labels": ["project:jadwigo-question-bank"]
    },
    {
      "title": "jadwigo-bank: the built index is published to index/<bank_rev>/ in the content bucket and the CI gate fetches it",
      "scope": "tools/bank_publish.py uploads the index directory it publishes; .github/workflows/eval-gate.yml replaces its placeholder step with a download through a read-only role; evals/README.md names the prefix",
      "done_when": "the gate job runs green on the bank's remote against the published index",
      "depends_on": ["dl-n9fr.15", "dl-n9fr.43"],
      "labels": ["project:jadwigo-question-bank"]
    },
    {
      "title": "jadwigo-bank: an item route returns one converted item's body from the bucket, reached only through apps/api",
      "scope": "the bank service reads khan/converted/pl.json through the read role from dl-n9fr.43; a route in apps/api behind authorize(); jw question item and question_item call it, and JW_KHAN_CONVERTED leaves the settings file",
      "done_when": "jw question item <id> against the deployed route prints the family step with no local file, and the search function's role still has no bucket access",
      "depends_on": ["dl-n9fr.43", "dl-e8ov.5.2.22"],
      "labels": ["project:jadwigo-question-bank"]
    },
    {
      "title": "Pictures for the playground and the player load from the content bucket",
      "scope": "the read path chosen in owner decision 7 over khan/media/; david-learns frontend/vite.config.ts proxies /media/khan/ to it; the player's image source names the same path",
      "done_when": "the playground shows every picture with Django stopped, and dl-n9fr.44 can start",
      "depends_on": ["dl-n9fr.43"],
      "labels": ["project:jadwigo-question-bank"]
    },
    {
      "title": "The Muse ledger's home, as the owner answers decision 3",
      "scope": "tools/muse_call.py LOG_DIR in jadwigo-bank and apps/cli/src/jw/muse.py LOG_DIR in this repo read and write the chosen home; the spend cap sums one total across both",
      "done_when": "a call from a second machine is refused once the shared total passes the cap",
      "depends_on": ["dl-n9fr.15"],
      "labels": ["project:jadwigo-question-bank"]
    },
    {
      "title": "Retire read.env and stop writing question pages into dl-brain",
      "scope": "fold ~/.config/jadwigo-bank/read.env into bank.env in the runbook and remove it; tools/khan/to_questions.py writes nowhere outside the bank repo, per the 2026-10-27 decision",
      "done_when": "git grep in both repos finds no read.env and no DL_BRAIN_DIR write target",
      "depends_on": [],
      "labels": ["project:jadwigo-question-bank"]
    }
  ],
  "page_changes": [
    {
      "section": "jadwigo-bank docs/runbook.md, Prerequisites",
      "change": "name the one settings file and every key in it, the sync step, and the state backend in place of 'plan from that machine'"
    },
    {
      "section": "jadwigo-bank docs/drop-run, Moving the rest out of the prototype",
      "change": "link this note's inventory and order"
    }
  ]
}
```
