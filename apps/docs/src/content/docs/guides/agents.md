---
title: Use with agents
description: What an AI agent can read from these docs, and how to connect one to Jadwigo's MCP server.
---

This page is for anyone pointing an AI agent at Jadwigo: how to hand it one page, where it finds
the whole docs, and how to connect it to the MCP server.

## Hand an agent one page

Every page has a **Copy page** menu beside its title:

- **Copy page** puts the page on your clipboard as Markdown.
- **View as Markdown** opens the same Markdown in a new tab.
- **Open in Claude** and **Open in ChatGPT** start a chat that reads the page.
- **Copy for Muse** copies a prompt to paste into Muse Code, which runs in a terminal. The prompt
  names the page's Markdown and the MCP server.

The Markdown is a file of its own, so an agent can fetch it without the menu. Replace a page's
trailing slash with `.md`: `/guides/first-call/` is `/guides/first-call.md`. Each page's HTML
names its Markdown in a `<link rel="alternate" type="text/markdown">`. The API reference's pages
have none; an agent reads `/openapi.json` for them.

## Give an agent the whole docs

`/llms.txt` is the index an agent starts from. It links each set in the table below, and every
page's Markdown is on the same host. Give an agent `/llms.txt` when it should choose what to read,
and one set when you know the topic.

## Connect the MCP server

`jw mcp serve` is Jadwigo's MCP server: it searches the question bank and drafts a lesson.
[MCP](/mcp/) registers it with Claude Code, Codex or Muse Code and lists every tool.

## Every file for agents

| Path | What it holds |
| --- | --- |
| `/llms.txt` | The index: the API's base URL, and a link to each set |
| `/llms-full.txt` | Every page, in one file |
| `/llms-small.txt` | Every page, with the notes and tips left out |
| `/_llms-txt/api.txt` | Calling the API: the base URL, signing in, the first call, the errors |
| `/_llms-txt/mcp.txt` | This page, the MCP page and every tool |
| `/_llms-txt/design-system.txt` | The tokens, primitives, question types and copy |
| `/<page>.md` | One page as Markdown |
| `/openapi.json` | The OpenAPI 3.1 document for every route; every page's HTML links it as `rel="alternate"` |
| `/mcp-tools.json` | Every MCP tool with its input and output schema |

## Next

- [MCP](/mcp/)
- [Your first call](/guides/first-call/)
