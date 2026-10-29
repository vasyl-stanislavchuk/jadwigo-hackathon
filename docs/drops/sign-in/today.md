:::meta
eyebrow: Jadwigo · parent login
subtitle: The records and the email-code sign-in that wave 3 of dl-e8ov.2 built, as they stand on main.
by: the jadwigo platform session, for issue dl-e8ov.2.50
when: 2026-10-29T18:00:00Z
:::

# Today

A parent signs in with a [6-digit code](https://github.com/vasyl-stanislavchuk/jadwigo-hackathon/blob/main/infra/supabase-auth/prod.json) from Supabase Auth, typed into the tab the child played in. Nothing else signs anyone in, and the child never signs in at all.

## Records

Every table carries `pod_id`, and row-level security keeps each pod to itself ([`20261029120000_parent_login.sql`](https://github.com/vasyl-stanislavchuk/jadwigo-hackathon/blob/main/supabase/migrations/20261029120000_parent_login.sql)). A pod is one family.

:::table Records that sign-in touches
| Record | Columns | What it is |
| --- | --- | --- |
| `pod` | `id`, `name`, `language` | one family, and the privacy boundary |
| `account` | `id`, `pod_id`, `sub` | someone who signs in. `sub` is the Supabase user id, unique, with no foreign key to Supabase |
| `member` | `pod_id`, `account_id`, `role` | an account in a pod. Only `parent` is written today |
| `learner` | `pod_id`, `first_name`, `age_group` | a child. A learner never signs in |
| `attempt` | `learner_id`, `claimed_by` | one play of a lesson. `claimed_by` is the account that saved it to a child |
:::

**The account stores no email and no name.** Only the token carries the email. `apps/api` reads 2 claims from it, `sub` and `email` ([`auth.ts`](https://github.com/vasyl-stanislavchuk/jadwigo-hackathon/blob/main/apps/api/src/auth.ts)). Supabase's own `auth.users` and `auth.identities` tables hold the rest, and nothing of ours points into them.

## Sign-in

1. A child finishes a lesson. Their tab keeps the attempt id in `sessionStorage`, and its results screen offers the adult "save your progress".
2. An adult types an email, and Supabase mails a sign-in code.
3. Back in the same tab, the adult types the code. `verifyOtp` turns it into a session holding an RS256 access token.
4. Next, the page calls `GET /api/v1/me`. With no account yet, it calls `POST /api/v1/accounts`, which makes the pod, the account and the member in one transaction.
5. Once a child is added, `POST /api/v1/attempts/{id}/claims` saves the stored attempt to that child.

A magic link was ruled out on purpose. A link opens a new tab, a new tab has an empty `sessionStorage`, and the attempt id would be lost ([`parent-login.md`](https://github.com/vasyl-stanislavchuk/jadwigo-hackathon/blob/main/docs/research/parent-login.md)). Any new way in has to keep the same tab.

## Token check

API Gateway's JWT authorizer checks the token on the 7 routes that need one, against the Supabase project's issuer and the audience `authenticated` ([`api.tf`](https://github.com/vasyl-stanislavchuk/jadwigo-hackathon/blob/main/infra/terraform/modules/app/api.tf)). Every route a child uses to play stays open.

## Switches

- **Settings as code.** [`infra/supabase-auth/prod.json`](https://github.com/vasyl-stanislavchuk/jadwigo-hackathon/blob/main/infra/supabase-auth/prod.json) holds the site URL `https://app.jadwigo.pl`, the redirect allow list `https://app.jadwigo.pl/**` and the length of the code. `auth.sh apply` sends them to Supabase, and only the owner runs it.
- **Prod has no sign-in yet.** No Supabase project is set in the prod web build, so `/parent` there says sign-in is not switched on. Prod stays login-free until the lawyer's consent text lands (`dl-e8ov.2.9`).
