---
name: jadwigo-drop
description: "Use when a drop is to be made, updated, checked or published from the jadwigo repo: a small password-protected site that explains a design, plan or result. Keeps the source in docs/drops/<folder>/, runs the checks, and stops before publishing until the owner says yes."
---

# /jadwigo-drop

The contract is `docs/drops/README.md`. Read it first.

## Make or update

1. A new drop: `md drops new <pattern> --out docs/drops/<folder>` (`md drops blocks` lists the
   patterns), or copy the `site.json` from an existing drop under `docs/drops/`. The folder name is
   short and lowercase, and the slug becomes `jadwigo-<folder>`.
2. Write the pages. List every repo file a claim rests on in `site.json` `evidence`. Put issue
   ids and code in backticks. Export each diagram from `diagrams/` to `img/`.
3. Check, and fix what each check reports:
   - `bun tools/src/check-drops.ts`
   - `make drops` (`md drops check`: evidence, links, secrets, size)
   - `md drops shot docs/drops/<folder>/site.json`, then look at the screenshots
4. Add a row to `docs/drops/index.md`. Commit on a branch and open the PR with `/jadwigo-pr`.

## Publish (the owner's yes first)

Publishing sends the drop outward. Ask the owner, then run it from merged `main` only:

```bash
md drops publish docs/drops/<folder>/site.json --name jadwigo-<folder> --password auto \
  --summary "<what this version adds, under 300 characters>"
```

For a republish, add `--force --password <current>`, taking the password from
`md drops history --json`. Never write a password into the repo, a PR or an issue. Give the owner the
link and point them to `md drops history` for the password.

## Comment rounds

1. `md drops comments plan jadwigo-<folder> --source docs/drops/<folder>/site.json` writes
   `docs/drops/<folder>/.drop-comments/round-<n>.json`, with one entry for each open thread.
2. Fill in each entry's `decision`: `resolve`, `ask`, `owner` or `skip`. Give each one `text` and
   `evidence`, and give the round a `summary`. A thread that asks a product question gets `owner`.
3. Commit the plan, and run `md drops comments apply <plan> --dry-run`.
4. The owner approves, and then `md drops comments apply <plan>` republishes the drop and posts
   the answers. Run it from merged `main`.
