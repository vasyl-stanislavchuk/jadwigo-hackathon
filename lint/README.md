# lint

House rules for Biome, written in GritQL. `biome.json` loads every `lint/*.grit` as a plugin
through an override, so a rule applies only to `apps/*/src` and `packages/*/src`. Tests,
`packages/testing` and each `src/config.ts` are left out.

| Rule | Fails |
| --- | --- |
| `no-raw-process-env.grit` | `process.env` read anywhere but a `src/config.ts` |
| `boundary-constants.grit` | an error type, an `/api/` path or an id prefix written as a string, not through `ErrorType.enum`, `ROUTES` or `ID_PREFIXES` (`packages/contracts/RULES.md` rule 22) |

## Adding a rule

1. Write `lint/<rule>.grit`, with a message that says what to do instead.
2. Add the file to `plugins` in the `biome.json` override.
3. Plant a violation in the Biome test in `tools/src/fences.test.ts`, and assert on the message.
4. Add a row here and a line in the Fences list in `AGENTS.md`.

A rule that can't be written in GritQL becomes a script in `tools/` with its own test.
