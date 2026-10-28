# Data model and API rules

How jadwigo names its records, columns, types and routes, and how its API behaves. They apply to
every layer: SQL in `supabase/migrations`, Zod in this package, `/api/v1` routes, and `jw`. When a
layer and this file disagree, this file wins and the layer is fixed.

Decided by the owner on 2026-10-27, decision
`jadwigo-platform/decisions/2026-10-27-jadwigo-s-data-model-and-api-follow-one-set-of-naming-and-design`.
The words themselves are in the root `GLOSSARY.md`. Rules marked **(tested)** fail `src/naming.test.ts`.

## Names

1. **A record that belongs to another is named owner first:** `<owner>_<thing>`. It has no identity
   outside its owner: `lesson_version`, `lesson_version_question`, `lesson_question`,
   `attempt_question`, `attempt_answer`, `attempt_result`. A record that stands on its own is a bare
   noun: `pod`, `learner`, `lesson`, `assignment`, `attempt`. Never `version_lesson`. **(tested)**
2. **Singular, `snake_case`** for tables, views, columns and Zod fields. A TypeScript type is the table
   name in `PascalCase`: `attempt_answer` is `AttemptAnswer`. **(tested)**
3. **One word for one thing.** Each word is the one in `GLOSSARY.md`, and the others are refused: **(tested)**

   | Use | Never |
   | --- | --- |
   | question | step, item, task, exercise |
   | help (the ladder, its release, its use) | hint, except `help.hints[]`, Khan's cards inside the ladder |
   | correct | right, ok, success |
   | try (`try_no`) | attempt_no; an attempt is a record |
   | attempt | session, play |
   | skip | pass |

4. **Keys:** a record's own key is `id`. A foreign key is `<record>_id`, as in `lesson_question_id`. A
   reference to the same table names the relation instead: `twin_of`, `added_for`. **(tested)**
5. **An enum says one thing.** Its values are lowercase `snake_case` and answer one question. What a
   row is and where it goes are 2 columns: `added` (`planned | twin`) and `placed`
   (`now | review_round`).
6. **Shapes of a column name:**
   - a time is `<verb>_at` (`published_at`, `answered_at`);
   - a duration carries its unit (`latency_ms`, `time_ms`);
   - a count is `<thing>_<verb>` (`help_released`) or a plural noun (`tries`);
   - a boolean is an adjective or a verb phrase (`correct`, `hold_verdicts`), never `is_`;
   - a jsonb column is a noun for what it holds (`data`, `key`, `help`, `credit`, `based_on`). **(tested: `_at`, `_ms`)**
7. **Order has 3 words, each a dense count from 1:**
   - `position` is a question's place in a version's list: the planned questions first, 1 to n,
     then the spares from n + 1. It is fixed when the version is published.
   - `seq` is a question's place in what one attempt actually played. An attempt question is written
     when it is asked, never ahead, so `seq` is the play order, a twin placed `now` simply takes the
     next `seq`, and nothing is ever renumbered. What comes next is worked out from the version's
     positions, the questions already asked and the twins still owed.
   - `try_no` counts the rows of one attempt question, 1, 2, 3. A skip is a row too and takes the
     next `try_no`, so `unique (attempt_id, seq, try_no)` covers it.
8. **Ids** are `uuid` columns, v4 by default. On the wire and in `jw`, an id is its prefix plus 26
   lowercase Crockford base32 characters. The prefixes are registered in `src/ids.ts`: `pod_`,
   `lrn_`, `les_`, `lesv_`, `lq_`, `asg_`, `att_`. A record keyed by its owner's key, such as
   (`attempt_id`, `seq`), has no prefix. `event_id` is the page's bare uuid. **(tested: every id schema uses the codec)**
9. **Words from the data-model drop's Names page win** where it has one: `resume_at`, `player_name`,
   `mode`, `try_no`, `skip_reason`, `mistake_class`, `judged_by`, `revises`.

## Records

10. **Content is write-once and versioned.** An edit to a `lesson_question` makes a new row. An edit
    to a lesson makes its next `lesson_version`. Neither is ever updated once published, and triggers
    refuse the update.
11. **Evidence is append-only.** `attempt_answer` rows are never updated or deleted. On
    `attempt_question`, only `help_released` and `ended` change. On `attempt`, only `status`,
    `resume_at` and `finished_at` change.
12. **Every row carries `pod_id`**, except `pod` itself, and row-level security compares it with
    the caller's pod. A view is created `with (security_invoker = true)`.
13. **Every edge points from evidence up to content**, never back down. A later layer attaches as a
    new table or a nullable column, without rewriting the rows above it.

## API

14. **Every route is under `/api/v1/`.** A breaking change to a route's contract adds `/api/v2/` beside
    it, and the old one stays until nothing calls it. `/api/health` sits outside the version.
15. **A path is plural nouns of records, nested by ownership.** The parent segment names the owner,
    so the child drops it: `attempt_answer` is `/attempts/{id}/answers`, and `attempt_question` is
    `/attempts/{id}/questions/{seq}`. A name of 2 or more words is kebab-case in a path
    (`/lesson-questions`). No verbs in a path. Two segments are not plural: `help`, the one
    uncountable record, and `/api/v1/me`, the signed-in caller. **(tested)**
16. **Methods:**
    - `GET` reads and changes nothing;
    - `POST` creates or appends (`/attempts`, `/answers`, `/help`);
    - `PATCH` changes a field the record allows to change (`attempt.status`);
    - v0 has no `PUT` or `DELETE`, because evidence is append-only.
17. **Bodies are JSON whose fields are the column names**, in `snake_case`. Ids are prefixed, and
    times are ISO 8601 in UTC. A field the server owns (a verdict, `seq` for an added question, a
    timestamp) is refused when a client sends it.
18. **Every input and output is a schema here**, and the route table is named once, in `src/routes.ts`.
    `apps/api` and `packages/api-client` import it, and a handler parses and never trusts.
19. **Writes from the page are idempotent by `event_id`.**
    - A replay with the same body returns the stored result.
    - The same `event_id` with another body is 409 `EventIdMismatch`.
    - A 2nd `event_id` for the same try is 409 `AnswerConflict`.
20. **Errors are `{error: {type, message}}`.** `type` is a `PascalCase` name listed here: 400 for a
    body that fails its schema, 401 for a token route called without a valid token
    (`NotSignedIn`), 404 for an unknown record, 409 for a conflict with stored state, 429 for a
    limit the request is past (`LIMITS`). Another pod's record is 404, never 403.
    `message` is for a person and never names the key.
21. **The server owns the lesson's course.** It decides the next question, a growth question and when
    an attempt finishes. A response never carries a question's `key` or help that has not been
    released.

## Code

22. **A value that crosses a boundary is written through its constant here**, so it has one place
    to rename and to search: an error type as `ErrorType.enum.WriteOnce`, a route through `ROUTES`,
    an id prefix through `ID_PREFIXES`. A comparison with an enum's value stays a literal
    (`status === "finished"`): TypeScript checks it against the union. Tests, SQL and the files
    that define the constants are left out. Biome fails the rest (`lint/boundary-constants.grit`).
