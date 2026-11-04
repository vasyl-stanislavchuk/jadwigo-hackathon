# Diagrams for the docs

Every diagram on docs.jadwigo.pl is drawn with the diagram-design skill in its Medallion profile
and embedded as an exported SVG, by day and by night (`dl-5ssh.90.53.19`).

- The `.diagram-design` marker in `apps/docs` (`profile: medallion`) selects the profile, which
  the skill reads from `~/.diagram-design/profiles/medallion.md`.
- A diagram's mermaid source sits in `src/lib/diagrams/<name>.mmd`, the skill's import source.
  Its exports sit beside it as `<name>.light.svg` and `<name>.dark.svg`, and a page embeds it
  with `<Diagram name="<name>" />`.
- One diagram answers one question, at about 9 nodes or fewer, with one accent. A bigger picture
  becomes 2 diagrams at 2 levels (context, then containers), never one crowded canvas.
- `src/lib/diagrams.test.ts` holds the set together: every `.mmd` parses, each has both SVGs,
  and every `<Diagram>` on a page resolves.
