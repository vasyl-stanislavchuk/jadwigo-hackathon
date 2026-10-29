---
title: Your first call
description: Check the API is up, find a featured lesson, start an attempt and read it back.
---

These calls need no credential. Each one is a single `curl`.

## 1. Check the API is up

```bash
curl https://app.jadwigo.pl/api/health
```

```json
{ "status": "ok" }
```

## 2. Find a lesson anyone may play

```bash
curl https://app.jadwigo.pl/api/v1/featured-lessons
```

```json
{
  "lessons": [
    {
      "assignment_id": "asg_…",
      "lesson_id": "les_…",
      "title": "…",
      "language": "pl"
    }
  ]
}
```

Keep an `assignment_id`. You start an attempt at an assignment, not at a lesson.

## 3. Start an attempt

```bash
curl -X POST https://app.jadwigo.pl/api/v1/assignments/$ASSIGNMENT_ID/attempts \
  -H "Content-Type: application/json" \
  -d '{"mode": "preview"}'
```

`201` means the attempt started. The reply is the attempt's snapshot:

- `attempt`: the record. `attempt.id` is the handle for every call that follows.
- `plan`: the whole lesson, in order, so you know its length from the start.
- `questions`: what has been asked so far. The open question is last.
- `open_seq`: the `seq` of the question waiting for an answer, or `null` once the attempt ends.

A `preview` attempt counts toward no learner and is never claimed. Use it to try the API.
Leave `mode` out, or send `"real"`, for a child's real play.

The body is strict. A field the API does not know, or one the server owns, is `400`.

## 4. Read the attempt back

```bash
curl https://app.jadwigo.pl/api/v1/attempts/$ATTEMPT_ID
```

This returns the same snapshot. Call it after a reload to pick up where the child left off.

## 5. Answer

An answer is a `POST` to `/api/v1/attempts/{id}/answers`. It names the question's `seq`, the
`try_no`, an `event_id` and the value. A repeat with the same `event_id` and body returns the
stored result, so a retry after a dropped connection is safe. The [API reference](/api/) shows
every field.

## Next

- [Authentication](/guides/authentication/) for the routes a parent calls.
- [Errors](/guides/errors/) for what a refusal looks like.
