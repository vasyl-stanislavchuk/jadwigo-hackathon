---
title: Sign-in and consent
description: A parent signs in with a 6-digit email code. A child never signs in. Consent gates analytics and any connected AI app.
status: live
as_of: 2026-11-03
prs: [717]
---

This page is for a judge who wants to see who signs in, who does not, and what a parent agrees
to.

A parent signs in with a 6-digit code sent by email, through Supabase Auth. The token is RS256,
so API Gateway verifies it before the API Lambda runs. A child never signs in: a play link with a
learner in it starts the lesson as that child.

1 cookie banner covers jadwigo.pl and app.jadwigo.pl. PostHog analytics runs only after the
parent accepts. Session replay then records screens with every input masked. An analytics event
carries no learner id, name, answer, or score.

Connecting an AI app takes a 2nd consent, on `/oauth/consent` (#717, on `main`). The page names
the app and what it may read. The parent's yes there lets that app receive their family's data,
names included, through the remote MCP. Nothing else receives it. Row-level security in Postgres
keeps each pod's rows to that pod on every route.

## Next

- [Connect your AI](/features/connect-your-ai/): what the OAuth consent unlocks.
- [Authentication](/guides/authentication/): every credential, route by route.
