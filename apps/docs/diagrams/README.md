# Diagrams for the docs

Every diagram on docs.jadwigo.pl is drawn with the diagram-design skill in the Jadwigo profile
and embedded as an exported SVG, by day and by night (`dl-5ssh.90.53.1`).

- The profile's source of truth is `jadwigo-profile.md` here: the skill's style guide with every
  colour set to a `--jw-*` token from `packages/ui` and Andika as its face.
  `src/lib/diagram-profile.test.ts` fails a colour that differs from its token.
- The skill reads profiles only from `~/.diagram-design/profiles/`. Install this one with
  `bun run diagram-profile` in `apps/docs`; the `.diagram-design` marker in `apps/docs`
  (`profile: jadwigo`) selects it for work rooted here. The repo root's own marker selects
  another profile and is not ours to change.
- A diagram's mermaid source sits in `src/lib/diagrams/<name>.mmd`, the skill's import source.
  Its exports sit beside it as `<name>.light.svg` and `<name>.dark.svg`, and a page embeds it
  with `<Diagram name="<name>" />`.
- `src/lib/diagrams.test.ts` holds the set together: every `.mmd` parses, each has both SVGs,
  and every `<Diagram>` on a page resolves.
