# Where does Jadwigo trim the Google and Facebook name and avatar: a token hook, a trigger, or both?

Issue: `dl-e8ov.2.66`

## The answer in 5 lines

1. Both. Triggers on `auth.users` and `auth.identities` trim what is stored, and a custom access token hook trims what a token carries.
2. A trigger alone leaves a gap: Supabase Auth builds the token from the user it holds in memory, before the trigger trims the row, so the first token of an implicit or ID-token sign-in would still carry the name.
3. A hook alone leaves the name and the avatar stored, and Supabase Auth writes them again on every sign-in.
4. The trim is an allow list. It keeps `iss`, `sub`, `provider_id`, `email`, `email_verified` and `phone_verified`, and drops everything else, including `name`, `full_name`, `picture`, `avatar_url`, `nickname` and `custom_claims`.
5. The hook is `app.custom_access_token(event jsonb)`. Infra switches it on with `pg-functions://postgres/app/custom_access_token` (`dl-e8ov.2.67`), and a `pod_id` claim joins it later.

## Method

Read:

- the decision in force, `jadwigo-platform/decisions/2026-10-30-google-and-facebook-profile-data-is-trimmed-no-parent-name-or-av` (`dl-zt14`), and `docs/research/social-sign-in.md`
- `supabase/migrations/20261029120000_parent_login.sql`, which plans the hook for `pod_id`
- Supabase's [custom access token hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) guide, its [managing user data](https://supabase.com/docs/guides/auth/managing-user-data) guide, and the [changelog](https://supabase.com/changelog/34270-restricting-access-on-auth-storage-and-realtime-schemas-on-april-21-2025) that restricted the `auth` schema on April 21, 2025
- Supabase Auth's source on `master` (commit `a7e97d6`): [`external.go`](https://github.com/supabase/auth/blob/master/internal/api/external.go), [`token_oidc.go`](https://github.com/supabase/auth/blob/master/internal/api/token_oidc.go), [`token.go`](https://github.com/supabase/auth/blob/master/internal/api/token.go), [`user.go`](https://github.com/supabase/auth/blob/master/internal/models/user.go), [`identity.go`](https://github.com/supabase/auth/blob/master/internal/models/identity.go), [`linking.go`](https://github.com/supabase/auth/blob/master/internal/models/linking.go), [`provider.go`](https://github.com/supabase/auth/blob/master/internal/api/provider/provider.go), [`google.go`](https://github.com/supabase/auth/blob/master/internal/api/provider/google.go), [`facebook.go`](https://github.com/supabase/auth/blob/master/internal/api/provider/facebook.go), [`tokens/service.go`](https://github.com/supabase/auth/blob/master/internal/tokens/service.go) and the migration that adds [`identities.email`](https://github.com/supabase/auth/blob/master/migrations/20221215195800_add_identities_email_column.up.sql)

Ran: the migration and its pgTAP test on local Postgres 17, on the shim's stand-ins for `auth.users` and `auth.identities`. An AI read the sources and wrote this note. Nothing was applied to `jadwigo-dev` or `jadwigo-prod`, and nobody signed in with Google or Facebook.

## Findings

### Supabase Auth rewrites the metadata on every sign-in

`createAccountFromExternalIdentity` in `external.go` handles every provider sign-in. For a returning user (`AccountExists`), it sets `identity.IdentityData` to the provider's claims and saves it whole. Then it calls `user.UpdateUserMetaData(tx, identityData)`, which merges every non-null claim into `raw_user_meta_data` (`user.go`). A new user gets the claims through the sign-up, and a linked identity through `createNewIdentity` and the same merge.

So a one-time cleanup is not enough. Without a trigger, the next Google sign-in writes the name and avatar back.

### What the providers send

The provider's claims go through `structs.Map(userData.Metadata)` (`provider.go`, `Claims`). Google sets `iss`, `sub`, `name`, `picture`, `email`, `email_verified`, `full_name`, `avatar_url` and `provider_id` (`google.go`). Facebook sets `iss`, `sub`, `name`, `nickname`, `picture`, `slug`, `full_name`, `avatar_url` and `provider_id` (`facebook.go`). Its email goes only into the list linking reads, not into the claims, so a Facebook identity's `identity_data` has no `email`. `email_verified` and `phone_verified` are always present, because they have no `omitempty`. `custom_claims` can hold more, such as Google's hosted domain.

### What identity linking reads

- **`sub`:** `NewIdentity` takes the identity's `provider_id` from `identityData["sub"]` and fails without it (`identity.go`). The next sign-in finds the identity by `(provider_id, provider)` (`linking.go`).
- **`email`:** `auth.identities.email` is a generated column, `lower(identity_data->>'email')`. `DetermineAccountLinking` looks for a matching identity by that column, and for a matching user by `auth.users.email` (`linking.go`).
- **`email_verified`:** linking decides from the provider's `Email` list, read before anything is stored, so the stored flag is not read. It stays because it is not profile data and the decision names it.

Nothing in Supabase Auth reads `name`, `full_name`, `picture` or `avatar_url` back from the database. The OIDC ID token reads `name` and `picture` from `UserMetaData` when they are there (`tokens/service.go`). With them trimmed, that token just leaves them out.

### The token is built from memory

`generateAccessToken` in `tokens/service.go` sets the `user_metadata` claim from `params.User.UserMetaData`, the struct in memory.

- **Implicit flow:** `external.go` issues the token in the same transaction, from the `user` it just merged the claims into. A `before` trigger trims the row, not that struct.
- **Google's ID-token button** (`signInWithIdToken`, an option in `social-sign-in.md`): `token_oidc.go` does the same.
- **PKCE flow:** the web app uses this today. `/token?grant_type=pkce` loads the user again with `FindUserByID` (`token.go`), so the token reads the trimmed row.
- **A refreshed token** also loads the user from the database.

So the trigger covers PKCE and every refresh, and the hook covers the 2 paths that build the token from memory.

### What a custom access token hook may change

Supabase's guide lists the required claims: `iss`, `aud`, `exp`, `iat`, `sub`, `role`, `aal`, `session_id`, `email`, `phone` and `is_anonymous`. `user_metadata` and `app_metadata` are optional and may be changed or removed. Supabase Auth checks the hook's output against a JSON schema (`tokens/service.go`). The hook takes `{user_id, claims, authentication_method}` and returns the event with its claims changed. The guide grants `execute` to `supabase_auth_admin` and revokes it from `authenticated`, `anon` and `public`.

### Triggers on the auth tables are still allowed

Since April 21, 2025, a project can't create tables or functions in the `auth` schema. It can still create triggers and row-level security policies on `auth.users`, `auth.identities` and 3 other auth tables ([changelog](https://supabase.com/changelog/34270-restricting-access-on-auth-storage-and-realtime-schemas-on-april-21-2025)). The trigger functions live in our `app` schema. Supabase's own `handle_new_user` example makes its function `security definer` with an empty `search_path`, and ours follows it.

## The design

The migration is `supabase/migrations/20261030120000_trim_profile.sql`.

| Object | What it does | Who may run it |
| --- | --- | --- |
| `app.profile_trimmed(jsonb)` | keeps `iss`, `sub`, `provider_id`, `email`, `email_verified`, `phone_verified`, and drops the rest | `supabase_auth_admin` and the owner |
| `app.trim_profile()` | a trigger function, `security definer`: trims `raw_user_meta_data` or `identity_data` | nobody directly. The triggers run it as its owner |
| trigger `trim_profile` on `auth.users` | `before insert or update of raw_user_meta_data` | fires on Supabase Auth's writes |
| trigger `trim_profile` on `auth.identities` | `before insert or update of identity_data` | fires on Supabase Auth's writes |
| `app.custom_access_token(jsonb)` | the hook: trims `claims.user_metadata` and leaves every other claim alone | `supabase_auth_admin` only |

The grants are `grant usage on schema app to supabase_auth_admin` and `grant execute on function app.custom_access_token(jsonb), app.profile_trimmed(jsonb) to supabase_auth_admin`. Execute on all 3 functions is revoked from `public`, `jadwigo_api`, `anon`, `authenticated` and `service_role`.

The migration also trims rows already stored. It sets each untrimmed row's metadata to itself, which fires the triggers.

The allow list is the safe direction. A claim a provider adds later is dropped unless it is listed. The app sets no `user_metadata` of its own: `apps/web` and `apps/api` never write it, and `account` keeps only `sub`.

For `pod_id`, the hook later becomes `claims || jsonb_build_object('pod_id', …)` beside the trim, read from `member` through a grant to `supabase_auth_admin`. Its name and its config URI stay the same.

## What this means for jadwigo

- **The migration and its pgTAP test land under `dl-e8ov.2.66`.** `supabase/tests/shim.sql` gains `supabase_auth_admin` and the sign-in columns of `auth.users` and `auth.identities`, so the triggers can be tested as Supabase Auth's role.
- **`dl-e8ov.2.67` switches the hook on** in `infra/supabase-auth/dev.json` and `prod.json`: `hook_custom_access_token_enabled: true` and `hook_custom_access_token_uri: "pg-functions://postgres/app/custom_access_token"`. Enabling it before the migration is pushed would break every sign-in, so push the migration first.
- **Check it on dev after the push:** sign in with Google, then check that `select raw_user_meta_data from auth.users` and the decoded access token show no `name` or `picture`.
- **The triggers depend on Supabase allowing `postgres` to create them on `auth.users`.** The changelog says it may. If `make db-push ENV=dev` refuses, that is the first thing to look at.
- **`tools/src/check-supabase-match.ts` doesn't compare `supabase_auth_admin` or the auth tables yet.** Comparing them is a small follow-up.

```json jadwigo-outcome
{
  "issue": "dl-e8ov.2.66",
  "question": "Where does Jadwigo trim the Google and Facebook name and avatar: a custom access token hook, a trigger on the auth tables, or both?",
  "answer": "Both: triggers on auth.users and auth.identities keep an allow list (iss, sub, provider_id, email, email_verified, phone_verified) in what Supabase Auth stores on every sign-in, and the custom access token hook app.custom_access_token trims user_metadata, because the implicit and ID-token flows build the token from the user in memory before the trigger's trim.",
  "status": "answered",
  "sources": [
    "https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook",
    "https://supabase.com/docs/guides/auth/managing-user-data",
    "https://supabase.com/changelog/34270-restricting-access-on-auth-storage-and-realtime-schemas-on-april-21-2025",
    "https://github.com/supabase/auth/blob/master/internal/api/external.go",
    "https://github.com/supabase/auth/blob/master/internal/api/token_oidc.go",
    "https://github.com/supabase/auth/blob/master/internal/api/token.go",
    "https://github.com/supabase/auth/blob/master/internal/models/user.go",
    "https://github.com/supabase/auth/blob/master/internal/models/identity.go",
    "https://github.com/supabase/auth/blob/master/internal/models/linking.go",
    "https://github.com/supabase/auth/blob/master/internal/api/provider/provider.go",
    "https://github.com/supabase/auth/blob/master/internal/api/provider/google.go",
    "https://github.com/supabase/auth/blob/master/internal/api/provider/facebook.go",
    "https://github.com/supabase/auth/blob/master/internal/tokens/service.go",
    "https://github.com/supabase/auth/blob/master/migrations/20221215195800_add_identities_email_column.up.sql",
    "docs/research/social-sign-in.md",
    "jadwigo-platform/decisions/2026-10-30-google-and-facebook-profile-data-is-trimmed-no-parent-name-or-av"
  ],
  "owner_decisions": [],
  "proposed_issues": [
    {
      "title": "tools: check-supabase-match compares supabase_auth_admin and the auth.users and auth.identities columns the shim stands in for",
      "scope": "tools/src/check-supabase-match.ts and its test: add supabase_auth_admin to ROLES and the shim's auth table columns to the facts",
      "done_when": "bun tools/src/check-supabase-match.ts dev reports the role and the columns, and its unit test plants a missing column",
      "depends_on": ["dl-e8ov.2.66"],
      "labels": ["project:jadwigo-platform"]
    }
  ],
  "page_changes": [
    {
      "section": "supabase/README.md, Rules",
      "change": "names the trim, its triggers and the hook app.custom_access_token, which pod_id joins later"
    }
  ]
}
```
