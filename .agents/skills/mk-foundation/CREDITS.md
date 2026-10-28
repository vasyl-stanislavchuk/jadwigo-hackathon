# Credits

`mk-foundation` is sections 02 (Brand Vision), 03 (Brand Mission) and 04 (Brand Values) of the
`brand-strategy` skill from
[arnab's Brand-building-skills](https://github.com/arnabbagxd/Brand-building-skills),
`skills/brand-strategy` at commit `4a0a8b5b7a0f64bf0fc551978a18a591670a5223`, under the MIT
licence in [`LICENSE`](LICENSE).

What changed here (dl-w0b4.56):

- Upstream's report rule that fills missing client information with a strategic guess, so that
  no section is empty (`skills/brand-strategy/SKILL.md` line 112 at that commit), is removed. In
  Jadwigo an unknown stays empty and becomes an owner question.
- "Always suggest a tagline" is removed. Jadwigo's copy says what the system does, by decision.
- The questionnaire (step 2) is replaced by a table filled from the md context brain, with each
  row labelled supplied fact, evidence, assumption or blank.
- Only the vision, mission and values sections are kept. The origin story, goals, audience
  personas, personality, voice, competitor analysis, positioning and taglines are other
  commands' work or the owner's.
- Each value gets a "we do" behaviour and a "we never" boundary from the charter's own text, and
  the 5 values are the charter's, with no 6th.
- The mission and vision start from the 3 options already in
  `docs/research/jadwigo-mission-and-value.md`.
- The output is a research note with a `jadwigo-outcome` block. Upstream's `evals/` folder is
  not vendored.

Kept from upstream: the vision and mission frames with their 4 one-word pillars, the 2-sentence
value descriptions, and the tone guidance.
