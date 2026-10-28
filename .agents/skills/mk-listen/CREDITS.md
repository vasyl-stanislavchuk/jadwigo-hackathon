# Credits

`mk-listen` is the `customer-research` skill from
[Corey Haines' marketingskills](https://github.com/coreyhaines31/marketingskills),
`skills/customer-research` at commit `0cd9b3a0ef4c411a1d690419ce843f2a1da32cce`, under the MIT
licence in [`LICENSE`](LICENSE).

What changed here (dl-w0b4.56):

- Only mode 2, mining public signal, is active. It is aimed at Polish parenting forums and 1 to
  3 star app-store reviews of the 8 products named in `docs/research/jadwigo-go-to-market.md`.
  Modes 1 (own assets) and 3 (interviews and surveys) wait until real families give feedback,
  which the owner decided on 2026-10-28.
- Every quote is labelled "proxy, not our families", carries its URL and date, and is kept in
  Polish with an English gloss. The note ends with a "To confirm with families" list.
- No personas are built. Jadwigo's 2 personas, the parent and the child, come from a decision.
- The output is a research note with a `jadwigo-outcome` block, not one of upstream's 6
  deliverable formats.
- `references/source-guides.md` and `references/interviews-and-surveys.md` are vendored
  unchanged. The skill points at the 2 sections of the source guide that apply. Upstream's
  `evals/` folder is not vendored.

Kept from upstream: the untrusted-data warning, the extraction fields, the confidence table, the
sample-bias checks, the "don't invent details" rule and the theme template.
