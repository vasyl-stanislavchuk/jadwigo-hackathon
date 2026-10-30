# Publish the docs at docs.jadwigo.pl

Creates the docs' edge the first time and publishes `apps/docs` to it, then again after each change
worth publishing (`dl-5ssh.90`). The owner runs it: a merge publishes nothing
(`jadwigo-platform/decisions/2026-10-26-a-green-merge-does-not-deploy-to-prod-the-owner-deploys-manually`).

`module "docs"` in `infra/terraform/main.tf` is `modules/site` again, for `docs.jadwigo.pl` in the
`jadwigo.pl` zone and with no www: a certificate, a private bucket `jadwigo-docs-prod-843109108289`,
a CloudFront distribution that maps a page path to its `index.html`, and an A and AAAA alias record.
`make -C infra docs-deploy` builds `apps/docs`, checks `dist/`, syncs it to the bucket and invalidates.
Hashed files under `_astro/` cache for a year, everything else for 5 minutes, which includes the
files agents read: `/llms.txt`, `/openapi.json` and `/mcp-tools.json`.

## Before

- You are in a terminal, not an agent's shell: `docs-deploy` refuses when `CLAUDECODE` is set.
- The AWS profile works: `aws --profile sergii sts get-caller-identity` prints account `843109108289`.
- The docs build here: `cd apps/docs && bun run build && bun run check:dist` ends with no error.
- `main` has `module "docs"`: `grep -n 'module "docs"' infra/terraform/main.tf` prints a line.

## Steps

1. Plan, and read it before you apply:

   ```sh
   make -C infra plan
   ```

   The first time you should see 13 additions under `module.docs`: the certificate, its validation
   record and validation, the bucket with its 3 settings and its policy, the origin access control,
   the edge function, the distribution and 2 alias records. Nothing under `module.site`. A module
   not applied yet (`module.content`, say) shows its own additions; read those as its own.
   Any change under `module.site` means stop: the docs' options should leave the marketing site as
   it is (`dl-5ssh.90.11`).

2. Apply:

   ```sh
   make -C infra apply
   ```

   The certificate and the distribution take 10 to 15 minutes. Until step 3, the docs answer 404.

3. Publish:

   ```sh
   make -C infra docs-deploy
   ```

   It ends with the invalidation's id. `make -n -C infra docs-deploy` prints the same steps without
   running them.

After a docs change, only step 3 is needed.

## After

- `curl -sI https://docs.jadwigo.pl/` answers `HTTP/2 200` with `content-type: text/html`.
- `curl -sI https://docs.jadwigo.pl/llms.txt` answers `200` with `cache-control: public, max-age=300`.
- `curl -sI https://docs.jadwigo.pl/openapi.json` answers `200` with `content-type: application/json`.
- `curl -sI https://docs.jadwigo.pl/no-such-page` answers `404`, the docs' own 404 page.
- `curl -sI https://jadwigo.pl/` still answers `200`: the marketing site is untouched.

## Undo

- A bad publish: check out the last good commit and run step 3 again. The invalidation clears the
  5-minute files; old hashed files under `_astro/` stay in the bucket and do no harm.
- The whole edge: empty the bucket (`aws --profile sergii s3 rm s3://jadwigo-docs-prod-843109108289 --recursive`),
  remove `module "docs"` and its outputs, then plan and apply. One-way for the URL: anyone who copied
  a docs link sees an error until it is back.
