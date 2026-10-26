# Research

One note per question: `docs/research/<topic>.md`. A research issue's description is the whole
prompt, and the note is its only output. The outcome block at the end is what the next session
reads: it closes the issue, raises the owner's questions and files the follow-up issues.

## The shape of a note

1. `# <the question, as a question>`, then `Issue: \`<id>\``.
2. **The answer in 5 lines**, first, for the reader who stops there.
3. **Method:** what was read, run or measured, and what was not.
4. The findings, each with its source.
5. `## What this means for jadwigo`: the changes to code, docs or the board it argues for.
6. The outcome block, the last thing in the file:

```json jadwigo-outcome
{
  "issue": "dl-xxxx.n",
  "question": "the question, one line",
  "answer": "the answer, one or two sentences",
  "status": "answered",
  "sources": ["https://…", "docs/…"],
  "owner_decisions": [
    { "question": "what the owner must decide", "options": ["one", "another"] }
  ],
  "proposed_issues": [
    { "title": "…", "scope": "…", "done_when": "…", "depends_on": [], "labels": [] }
  ],
  "page_changes": [{ "section": "…", "change": "…" }]
}
```

- `status` is `answered` or `partial`.
- `sources` must include at least 1 link.
- An owner decision gives at least 2 options and never a pick: there is no `recommended`,
  `pick`, `choice` or `decision` key.
- File each proposed issue in the same session (`bd create`), and close the research issue
  with the note's path.

`tools/src/check-research.ts` checks every note here. Run it on one note with
`bun tools/src/check-research.ts docs/research/<topic>.md --issue <id>`.

Notes written before this repo existed stay in david-learns (`docs/research/`). They carry the
family's names, which this repo never holds.
