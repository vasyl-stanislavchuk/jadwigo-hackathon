---
title: Conversations with the AI
description: Start a conversation, send a message, read the AI's answer as run events, and stop a turn.
---

This guide is for a client that runs a parent's chat with Jadwigo's AI: the chat on the left that
becomes a lesson on the right. Every route here takes the parent's Supabase Auth token, as
[Authentication](/guides/authentication/) shows.

A conversation holds runs, one run per turn. A run's work is an append-only log of run events,
numbered by `seq` from 1. The API never waits for the AI: a message is stored and its run is queued,
and the reply comes at once. The AI's answer arrives later, as events on the run.

## 1. Start a conversation

[Reference](/api/operations/createconversation/).

```bash
curl -X POST https://app.jadwigo.pl/api/v1/conversations \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_id": "3f0c9a52-6d1e-4b7a-8c2d-5e9f1a3b7c40", "title": "Adding to 10"}'
```

The client makes `event_id`, a new uuid for each conversation. Sending the same one again makes
nothing new and returns the same conversation, so a retry is safe.

## 2. Send a message

[Reference](/api/operations/postmessage/).

```bash
curl -X POST https://app.jadwigo.pl/api/v1/conversations/$CONVERSATION_ID/messages \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_id": "8b2e4f61-0a3c-4d5e-9f7a-1c2b3d4e5f60", "text": "A short lesson on adding to 10"}'
```

The reply is the run that holds the message, `queued` while the AI has not started. A message
sent while a turn is open joins that turn. Otherwise it starts a new run.

- A resend with the same `event_id` and text returns the same run.
- The same `event_id` with other text is `409` `EventIdMismatch`.

## 3. Read the answer

[Reference](/api/operations/listrunevents/).

```bash
curl "https://app.jadwigo.pl/api/v1/runs/$RUN_ID/events?after=0" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

`after` is the last `seq` the client holds. Ask again with the highest `seq` it has read, and it
gets only what is new. The log never changes, so a cursor never misses an event. A
`turn_complete` event ends the turn.
[List a conversation's runs](/api/operations/listconversationruns/) to find every turn again.

## 4. Stop a turn

[Reference](/api/operations/cancelrun/).

```bash
curl -X POST https://app.jadwigo.pl/api/v1/runs/$RUN_ID/cancellations \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_id": "c41d7e2a-9b3f-4a6c-8d5e-2f1a0b9c8d70"}'
```

The run stops at its next step, and its events then show it `cancelled`. A run that has already
ended comes back as it is.

## Whose records a caller sees

A caller sees only its own pod's conversations and runs. Another family's conversation id or run
id is `404` `NotFound`, never `403`, so a reply never tells whether the id exists.

## Next

- [Errors](/guides/errors/): what a refusal looks like, and what to do about it.
- [API reference](/api/): every route, its body and its reply.
