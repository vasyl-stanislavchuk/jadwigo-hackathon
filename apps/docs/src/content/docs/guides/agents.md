---
title: Use with agents
description: What an AI agent can read from these docs, and how to connect one to Jadwigo's 2 MCP servers.
---

This page is for anyone pointing an AI agent at Jadwigo: how to hand it one page, where it finds
the whole docs, and how to connect it to Jadwigo's MCP servers.

## Hand an agent one page

Every page has a **Copy page** menu beside its title:

- **Copy page** puts the page on your clipboard as Markdown.
- **View as Markdown** opens the same Markdown in a new tab.
- **Open in Claude** and **Open in ChatGPT** start a chat that reads the page.
- **Copy for Muse** copies a prompt to paste into Muse Code, which runs in a terminal. The prompt
  names the page's Markdown and the local MCP server.

The Markdown is a file of its own, so an agent can fetch it without the menu. Replace a page's
trailing slash with `.md`: `/guides/first-call/` is `/guides/first-call.md`. Each page's HTML
names its Markdown in a `<link rel="alternate" type="text/markdown">`. The API reference's pages
have none. An agent reads `/openapi.json` for them.

## Give an agent the whole docs

`/llms.txt` is the index an agent starts from. It links each set in the table below, and every
page's Markdown is on the same host. Give an agent `/llms.txt` when it should choose what to read,
and one set when you know the topic.

## Connect an MCP server

Jadwigo has 2 MCP servers, and [MCP](/mcp/) compares them.

- **`jw mcp serve`** runs on your machine, on stdio. It searches the question bank and drafts a
  lesson for a lesson author. [MCP](/mcp/) registers it with Claude Code or Codex and lists every
  tool.
- **`https://app.jadwigo.pl/api/mcp`** is the remote server, for a parent's own AI app. The app
  signs in by OAuth 2.1 and gets a token that acts as that parent. Point a client that speaks
  remote MCP at the URL, for example
  `claude mcp add --transport http jadwigo https://app.jadwigo.pl/api/mcp`. The client finds the
  sign-in on its own, from the server's first `401`. [Authentication](/guides/authentication/)
  explains the token.

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
| `/openapi.json` | The OpenAPI 3.1 document for every route. Every page's HTML links it as `rel="alternate"` |
| `/mcp-tools.json` | Every MCP tool with its input and output schema |

## Next

- [MCP](/mcp/)
- [Your first call](/guides/first-call/)
