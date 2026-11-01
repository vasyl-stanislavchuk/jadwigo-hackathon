---
title: Conversations with the AI
description: Start a conversation, send a message with photos, read the AI's answer as run events, stop a turn, rate it, and archive a conversation.
---

This guide is for a client that runs a parent's chat with Jadwigo's AI: the chat on the left that
becomes a lesson on the right. Every route here takes the parent's Supabase Auth token, as
[Authentication](/guides/authentication/) shows.

A conversation holds runs, one run per turn. A run's work is an append-only log of run events,
numbered by `seq` from 1. The API never waits for the AI: a message is stored and its run is queued,
and the reply comes at once. The AI's answer arrives later, as events on the run.

## 0. Turn the AI on for the family

[Reference](/api/operations/patchpod/).

```bash
curl -X PATCH https://app.jadwigo.pl/api/v1/pods/$POD_ID \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ai_consented": true}'
```

A parent gives consent once, for the whole family's pod, after the client has shown what the AI
reads and where it goes. The pod's id is in [`GET /api/v1/me`](/api/operations/getme/). The reply is
the pod, with `ai_consent_at` set; sending it again keeps the first time.

Until then, starting a conversation or sending a message is `409` `AiConsentMissing`, and nothing
is stored. `{"ai_consented": false}` withdraws it: `ai_consent_at` is null again, and the same
`409` comes back. A turn already running can still be read and stopped.

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
- A parent may send 10 messages a minute, and a family's runs may spend 10 USD a day in all. Past
  the minute the reply is `429` `MessageLimitMinute`, past the day `429` `MessageLimitDay`, and
  nothing is stored. A message that joins a running turn is never refused by the day.

A correction while the turn runs is a steer: the same route with `"kind": "steer"`. An edit in
the lesson pane also sends `"source": "lesson_edit"` and the `question_ids` it changed. A steer
joins the open turn and never starts one.

### Attach photos

[Upload](/api/operations/createattachment/) and [read](/api/operations/getattachment/).

A message may carry up to 10 photos, such as a page of homework, with or without words. Each photo
goes in 3 steps:

1. The client re-encodes the photo to a JPEG: at most 2000 px on its long edge and 4 MB. This
   also drops the camera's Exif data, its location included. A photo that still carries Exif is
   refused at step 3.
2. It asks for an upload form, then posts the form's `fields` and the file straight to S3:

   ```bash
   curl -X POST https://app.jadwigo.pl/api/v1/attachments \
     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"event_id": "5d7a1c3e-2b4f-4e6a-9c8d-0f1e2a3b4c50", "media_type": "image/jpeg", "bytes": 482113, "width": 1500, "height": 2000}'
   ```

3. It sends the message with the attachment ids, in the order the parent added them:
   `"attachment_ids": ["atch_…"]`. The text may then be empty.

When the message arrives, the server checks each photo against what step 2 declared. If one is
missing, another size, not a JPEG or still carries Exif, the reply is `409` `AttachmentMismatch`
and nothing is stored. A photo another message already carries is `409` `AttachmentAttached`. A
photo no message has carried expires after a day (`409` `AttachmentExpired`). A family may upload
200 photos a day (`429` `AttachmentLimitDay`).

`GET /api/v1/attachments/{id}` returns the stored copy, the same bytes the AI received, behind a
short-lived link. Ask again after `expires_at`. Its `preview_url` is null for a photo, which is its
own preview.

The contract also names 3 kinds a client sends as they are, with a `name` and no `width` or
`height`: `image/heic`, `application/pdf` and a DOCX, up to 10 MB. They are not taken yet: creating
one is `409` `AttachmentMismatch`. Once they are, the server turns each into page images for the AI,
and `preview_url` links the first page.

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

## 5. Rate a turn

[Reference](/api/operations/raterun/).

```bash
curl -X POST https://app.jadwigo.pl/api/v1/runs/$RUN_ID/ratings \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"verdict": "bad", "note": "It asked about subtraction"}'
```

A parent rates a turn `good` or `bad`, and may say what was missing on `bad`. Each parent has one
rating per run: rating again replaces it. The rating stays with the family's pod and is never sent
to analytics, since a note may name the child. Try again is no route: send the last message again.

## 6. List and archive conversations

[List](/api/operations/listconversations/) and [archive](/api/operations/patchconversation/).

```bash
curl https://app.jadwigo.pl/api/v1/conversations \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl -X PATCH https://app.jadwigo.pl/api/v1/conversations/$CONVERSATION_ID \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"archived": true}'
```

The list holds the family's live conversations, newest first. A parent's delete archives a
conversation: it leaves the list, and `archived_at` is set. Archiving again keeps the first time.
Nothing is deleted. The conversation and its runs stay with the family's pod and go only with it,
and an archive is never undone. A message or a steer to an archived conversation is `409`
`ConversationArchived`, and nothing is stored: start a new conversation instead.

## Whose records a caller sees

A caller sees only its own pod's conversations and runs. Another family's conversation id or run
id is `404` `NotFound`, never `403`, so a reply never tells whether the id exists.

## Next

- [Errors](/guides/errors/): what a refusal looks like, and what to do about it.
- [API reference](/api/): every route, its body and its reply.
