---
title: Contracts and generated docs
description: How one route table in the contracts feeds the API, its client, the infrastructure and this site, so the docs never drift.
---

Every route, record and error is defined once, as a Zod schema in the `contracts` package. The
route table, `ROUTES`, names each route's method, path, credential, body and reply. Everything
else is built from it or checked against it.

## One table, many readers

```mermaid
flowchart LR
  routes["ROUTES<br/><i>contracts: method, path, credential, schemas</i>"]
  api["API Lambda<br/><i>parses every request and reply</i>"]
  client["api-client<br/><i>typed calls for the web app</i>"]
  web["Web app"]
  infra["Terraform route list<br/><i>throttles and the JWT authorizer</i>"]
  openapi["openapi.json<br/><i>OpenAPI 3.1 snapshot</i>"]
  site["This site<br/><i>API reference, guides' tables</i>"]
  llm["/openapi.json and llms.txt<br/><i>for agents</i>"]

  routes --> api
  routes --> client --> web
  routes -. "checked equal" .-> infra
  routes -- "generated, snapshot test" --> openapi
  openapi -- "copied at build time" --> site
  site --> llm
  routes -- "error and access tables" --> site
```

- **The API** looks up each route in the table and parses the request and its own reply against
  the route's schemas. A handler never trusts its input.
- **The client** takes its types from the same schemas, so a changed field is a type error in the
  web app before anything runs.
- **The infrastructure** lists every route too, because API Gateway needs each one to throttle it
  and to put the JWT authorizer on the parent routes. A check compares that list with `ROUTES`
  and fails the build when they differ, so a new route can't slip past its limits.
- **The OpenAPI document** is generated from the table and kept as a snapshot. A test fails when
  the document and the snapshot differ, so a contract change is always visible in review.

## The living-docs loop

This site is built from the code each time it is published. A table the code can make is
generated, never typed by hand.

```mermaid
flowchart TB
  change["A change in the code<br/><i>a route, an error, an MCP tool, a design token</i>"]
  snapshot["Its snapshot or source<br/><i>openapi.json, mcp-tools.json, foundation.css, the question-type catalog</i>"]
  build["The docs build<br/><i>reads them as files and modules</i>"]
  check["check-dist<br/><i>every page and generated table is there, no link into the repo</i>"]
  publish["docs.jadwigo.pl<br/><i>published by hand</i>"]

  change -- "same pull request" --> snapshot
  snapshot --> build
  build --> check
  check --> publish
```

| What changes | Where it shows here |
| --- | --- |
| A route, its body or its reply | [API reference](/api/), from the OpenAPI document |
| An error type or its status | The table in [Errors](/guides/errors/) |
| Which credential a route takes | The tables in [Authentication](/guides/authentication/) |
| An MCP tool, its arguments or its reply | [MCP](/mcp/), from the tool list `jw` writes |
| A design token | [Tokens](/design-system/tokens/), from the stylesheet |
| A question type | [Question types](/design-system/question-types/), from the lesson kit's catalog |

The rule that keeps the loop closed: a change to a route, an MCP tool or a design token brings its
docs in the same pull request. For a generated table that is free, since the next build redraws
it. A written page is updated by hand.

Before a publish, `check-dist` reads the built site. It fails when a page or a generated table is
missing, or when any page links into the source repository: these docs restate what a reader
needs and stand on their own.
