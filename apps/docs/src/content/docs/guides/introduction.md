---
title: Introduction
description: What Jadwigo's API is, where it lives, how it behaves and the words it uses.
---

This guide is for anyone who calls Jadwigo's API: where it lives, how it behaves, and the words
the other guides use.

Jadwigo is a learning app for children in the first school grades, in Polish and English.
A child plays a lesson. A parent sees what the child played. Everything the app does goes
through one HTTP API.

## Base URL

The API lives on the app's own host:

```text
https://app.jadwigo.pl
```

Every route is under `/api/v1/`. The one exception is `/api/health`, which sits outside the version.
A breaking change to a route adds `/api/v2/` beside it. The old route stays until nothing calls it.

## How the API behaves

- **JSON in, JSON out.** Field names are `snake_case`. Times are ISO 8601 in UTC.
- **Ids carry a prefix.** An attempt id is `att_` followed by 26 lowercase characters.
  The prefix tells you what kind of record it is: `asg_` is an assignment, `lrn_` a learner.
- **The server owns the lesson.** It picks the next question and decides when an attempt ends.
  A reply never carries a question's answer key.
- **Evidence is append-only.** An answer, once sent, is never changed or deleted. That is why
  there is no `PUT` and no `DELETE`.
- **Writes are safe to repeat.** An answer carries an `event_id`. Sending the same answer again
  returns the stored result.
- **One error shape.** Every refusal is `{"error": {"type", "message"}}`. See [Errors](/guides/errors/).

## Every word the API uses

| Word | What it means |
| --- | --- |
| lesson | A set of questions, published as numbered versions. |
| assignment | A lesson given to someone to play. A featured lesson is an assignment anyone may play. |
| attempt | One play of an assignment, from the first question to the end. |
| question | One thing the child is asked. Its place in the attempt is `seq`, from 1. |
| try | One answer to one question. A question may take more than 1 try. |
| help | The hints a child may ask for on a question, released one rung at a time. |
| learner | A child, added by a parent. |
| pod | A family's space. Every record belongs to one pod, and a pod sees only its own. |

## Next

- [Authentication](/guides/authentication/): which routes need a credential, and which one.
- [Your first call](/guides/first-call/): start an attempt and read it back.
- [Errors](/guides/errors/): what a refusal looks like, and what to do about it.
