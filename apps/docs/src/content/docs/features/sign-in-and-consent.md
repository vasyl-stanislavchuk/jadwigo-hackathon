---
title: Sign-in and consent
description: A parent signs in with an email code, Google or Facebook. A child never signs in. Consent gates analytics and any connected AI app.
status: live
as_of: 2026-11-04
prs: [717]
---

A parent signs in with an email code, Google or Facebook, a child never signs in, and nothing
about a family leaves Jadwigo without the parent's yes.

## How it works

### The parent signs in

A parent signs in with a 6-digit code sent by email, or with Google or Facebook. The token is
checked before any of Jadwigo's code runs. A child never signs in: a
[play link](/features/share-and-play/) made for a child starts the lesson as that child.

### Analytics waits for a yes

1 cookie banner covers jadwigo.pl and app.jadwigo.pl. Analytics runs only after the parent
accepts. Session replay then records the screens with every input masked. An analytics event
carries no learner id, name, answer or score.

### A connected AI app needs a 2nd yes

[Connecting an AI app](/features/connect-your-ai/) takes a 2nd consent, on its own page. The page
names the app and what it may read. The parent's yes there lets that app receive the family's
data, names included. Nothing else receives it. The database keeps each family's rows to that
family on every route.

## Limits

- **There's no password, Apple or phone sign-in.** On 2026-11-04 prod offered the email code,
  Google and Facebook only.
- **A disconnected AI app keeps working for up to 1 hour,** until its current token expires.

## Next

- [Connect your AI](/features/connect-your-ai/): what the 2nd consent unlocks.
- [Authentication](/guides/authentication/): every credential, route by route.
