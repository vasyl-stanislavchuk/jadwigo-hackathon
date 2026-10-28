# Credits

`mk-story` is the `brand-story` skill from
[arnab's Brand-building-skills](https://github.com/arnabbagxd/Brand-building-skills),
`skills/brand-story` at commit `4a0a8b5b7a0f64bf0fc551978a18a591670a5223`, under the MIT licence
in [`LICENSE`](LICENSE).

What changed here (dl-w0b4.56):

- The story's facts come from the owner's words in the md context brain, not from
  `.agents/brand-context.md` or questions to the user. A missing fact is an owner question, not a
  scene the model invents.
- It is written under 3 decisions: the family's own story with consent, the patron-only rule,
  and the O nas page with the family's photos. The skill says what the story may and may not
  hold.
- Family names are placeholders the owner fills outside git (fence 9).
- Polish first, English after, and each version in 2 registers while the voice is undecided.
- The output is a research note with a `jadwigo-outcome` block.

Kept from upstream: the storytelling philosophy, the 6 things a story needs, the 3 versions with
their lengths and arcs, the one-liner frame, and the story principles.
