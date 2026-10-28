# Credits

`mk-brief` is the `product-marketing` skill from
[Corey Haines' marketingskills](https://github.com/coreyhaines31/marketingskills),
`skills/product-marketing` at commit `0cd9b3a0ef4c411a1d690419ce843f2a1da32cce`, under the MIT
licence in [`LICENSE`](LICENSE).

What changed here (dl-w0b4.56):

- The context is assembled from the md context brain and the research notes, never from an
  interview or the codebase, and every claim is cited. Upstream's "auto-draft from codebase" and
  "start from scratch" modes are gone.
- The output is a research note, `docs/research/jadwigo-brief.md`, with a `jadwigo-outcome`
  block, not a `.agents/product-marketing.md` document with versions and a changelog.
- The sections are Jadwigo's 6: what it is and does, who decides and who studies, decided, open,
  story seeds, not known yet. Upstream's Personas (B2B), Objections, Switching Dynamics, Proof
  Points, Goals, Paid Ads, Learnings and Changelog sections are dropped, each with its reason in
  the skill.
- `references/brand-voice.md` moved to `mk-voice`, which is where Jadwigo's voice is written.
- Upstream's `evals/` folder is not vendored.

Kept from upstream: the idea of one shared context every other command reads, the "push for
verbatim language" rule, and the section outline for product, audience, problems, competitors
and differentiation.
