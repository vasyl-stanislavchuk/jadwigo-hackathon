---
title: TypeScript client
description: The typed client the web app calls the API with, and the contracts every request and reply is checked against.
---

This section is for anyone calling Jadwigo's API from TypeScript inside the monorepo: the typed
client in `@jadwigo/api-client`, and the schemas, ids and errors in `@jadwigo/contracts` that it
sends and returns.

Both packages are private to the monorepo, so you import them from a workspace package, not from
npm. Every page under them is generated from the package's public surface, its `src/index.ts`, when
these docs are built, so it never drifts from the code.

## Start with the client

`createClient` gives one object with a method per route. Each method builds the path from
`ROUTES`, sends the body and parses the reply with the route's own schema, so what it returns is
already checked.

```ts
import { createClient } from "@jadwigo/api-client";

const api = createClient({ base: "https://app.jadwigo.pl" });
const { lessons } = await api.featuredLessons();
```

A request can fail in 2 ways. A `TransientError` means no answer came, or a 5xx did, so the same
request may be sent again. An `ApiError` is the server's refusal, and its `type` is the error type
it named, one of the [errors](/guides/errors/).

## Then the contracts

The contracts define every route, record and error once, as a Zod schema. Ids such as
`AttemptId` are branded types that only the contracts' parsers make, so a plain string never
passes for one. Reach for them when you build a request body or check a value before you send it.

## Next

- [api-client](/typescript/api-client/): `createClient` and the calls it gives.
- [Your first call](/guides/first-call/): the same calls with `curl`.
- [Contracts and generated docs](/architecture/contracts/): how one route table feeds the API and this client.
