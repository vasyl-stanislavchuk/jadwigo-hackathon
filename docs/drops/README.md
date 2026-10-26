# Drops

A drop is a small published site that explains a design, a plan or a result to the owner and the
team: a few pages, diagrams, an "open questions" page. Its source lives here, one folder per drop,
so every drop is reviewed in a PR, kept in git, and readable without a password.

```
docs/drops/<folder>/
├── site.json          # the site: title, nav, pages, what to copy, evidence
├── index.md           # the overview page; every page is markdown or a JSON page spec
├── <page>.md
├── diagrams/<x>.html  # editable diagram sources
├── img/<x>.svg        # the exports the pages show
└── .drop-comments/round-<n>.json   # a comment round: each thread and what was decided
```

The published slug is `jadwigo-<folder>`, at `https://drops.medallion.md/sites/jadwigo-<folder>/`.

## site.json

```json
{
  "version": 1,
  "title": "The jadwigo repo",
  "password": "auto",
  "sequence": true,
  "nav": [{ "page": "index.html", "label": "Overview" }],
  "pages": { "index.html": "index.md" },
  "copy": ["img"],
  "evidence": ["../../../AGENTS.md"]
}
```

- `pages` maps each published page to its source.
- `nav` lists the pages in reading order.
- `copy` names the folders that ship as they are.
- `evidence` lists the repo files the drop's claims rest on. They are relative to the drop folder and must exist.

A markdown page opens with a `:::meta` block (`eyebrow`, `subtitle`, `by`, `when`) and may use the
`:::table <caption>` and `:::aside` blocks. `md drops new <pattern> --out docs/drops/<folder>`
starts one, and `md drops --help` covers the rest.

## Making and publishing one

1. `md drops new … --out docs/drops/<folder>`, or copy an existing drop's `site.json`.
2. Write the pages. Export each diagram to `img/`.
3. `make drops` runs `md drops check` (evidence, links, leaked secrets, size) on every drop.
   `bun run lint:repo` runs `tools/src/check-drops.ts`, the structural check CI also runs.
4. Open the PR. Publishing is outward, so it waits for the owner's yes and runs from merged `main`:
   `md drops publish docs/drops/<folder>/site.json --name jadwigo-<folder> --password auto --summary "<what changed>"`.
   Always pass `--summary`; it heads the drop's worklog in md (`md drops where jadwigo-<folder>`).
5. To republish, pass `--force --password <the current one>`. `md drops history --json` holds the
   current password. Without `--force` md makes a second site (`-2`), and `--password auto --force`
   rotates the password.

`/dev-drop` walks through these steps for jadwigo. It is a dev command in `.agents/skills/`, layered on md's own `/md-drops`, which says how any drop is built. A one-page drop can be a `spec.json` alone, written by a `build.ts` beside it and stops before the publish.

## Never in a drop source

- a password, or a link carrying `?password=` (`check-drops.ts` fails it, in a `site.json` drop or a one-page `spec.json` drop)
- a family member's name or real learner data (gitleaks, and `AGENTS.md` fence 9)
- question bank content (`check-no-bank.ts`)
- a generated page edited by hand: rerun its generator instead, and on a merge conflict regenerate it

Drops made before this repo existed are listed in [`index.md`](index.md). Their sources stay where
they were written.
