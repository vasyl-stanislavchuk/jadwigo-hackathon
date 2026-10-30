---
title: Privacy · Jadwigo
description: What Jadwigo receives when a parent signs in with Google or Facebook, and what it does with it.
heading: Privacy
lang: en
path: /en/privacy
translation: /prywatnosc
draftNote: Draft. This text is waiting for a lawyer's review and may still change.
reviewed: false
---

Jadwigo is a learning app for children in the first grades of primary school. A parent sets up the
account. This page says what we receive when a parent signs in, and what we do with it.

## How a parent signs in

A parent signs in in one of 3 ways: with a code sent to their email address, with a Google account or
with a Facebook account. Supabase, the sign-in service Jadwigo uses, handles sign-in for us.

## What Google and Facebook send us

When a parent signs in with Google or Facebook, that service sends us:

- the parent's email address,
- whether Google or Facebook has verified that address,
- the identifier of the parent's Google or Facebook account.

From Facebook we ask only for the email address and the public profile (the `email` and
`public_profile` permissions).

Google and Facebook also send the parent's name and profile picture. We don't keep them and don't
use them.

We never receive the password to a Google or Facebook account. We don't see the parent's friends,
posts, photos or contacts, and we never post anything on their behalf.

## Where the data is kept

Supabase keeps the email address and the Google or Facebook account identifier, because a parent
can't sign in without them. From sign-in, Jadwigo's own database keeps only the user identifier
Supabase assigns. That is how we recognise the parent's account.

## Deleting your data

A parent can ask at any time for their account and the data linked to it to be deleted. The
[Data deletion](/en/privacy/data-deletion/) page says how.
