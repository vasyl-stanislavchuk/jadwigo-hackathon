# How does a parent sign in with Google or Facebook, on the Supabase Auth we already run?

Issue: `dl-e8ov.2.50`

## The answer in 5 lines

1. Google and Facebook become 2 more ways into the same Supabase user. `account.sub` stays the key, so no table, route, contract or gateway setting changes.
2. The button sends the tab to the provider and back with a PKCE code. `/parent` swaps the code for a session, so the tab and its stored attempt id survive.
3. Supabase links a provider sign-in to the parent who already has that verified email. A parent who signed up with the email code and later taps Google keeps the same pod.
4. A Facebook account can come back with no email. Supabase refuses that sign-in, and our page points the parent to the email code instead of making a second pod.
5. Most of the work is the owner's paperwork. Google needs an OAuth client with verified branding. Meta needs an app that passes review, and the site needs a data-deletion page.

## Method

Read:

- `docs/research/parent-login.md`, the design wave 3 of `dl-e8ov.2` built
- `apps/web/src/parent/auth.ts`, `apps/web/src/parent/route.ts` and `apps/web/e2e/auth-server.ts`
- `supabase/migrations/20261029120000_parent_login.sql` and `apps/api/src/auth.ts`
- `infra/supabase-auth/auth.sh`, `infra/supabase-auth/dev.json`, `infra/supabase-auth/prod.json` and `infra/terraform/modules/app/api.tf`
- Supabase's guides for [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [Facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook), [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking) and [custom domains](https://supabase.com/docs/guides/platform/custom-domains)
- Supabase Auth's own source, for the 2 cases the guides leave out: [`external.go`](https://github.com/supabase/auth/blob/master/internal/api/external.go), [`linking.go`](https://github.com/supabase/auth/blob/master/internal/models/linking.go), [`facebook.go`](https://github.com/supabase/auth/blob/master/internal/api/provider/facebook.go) and [`google.go`](https://github.com/supabase/auth/blob/master/internal/api/provider/google.go)
- Meta's [data deletion callback](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback) page and Google's [brand verification](https://support.google.com/cloud/answer/13463073) help.

An AI read the sources and wrote this note. No provider app was made, no Supabase setting changed, and nobody signed in with Google or Facebook. Every claim about how a real sign-in behaves comes from Supabase's docs or source, not from a run.

## Findings

### Today's sign-in

The parent types a 6-digit code in the same tab, and `verifyOtp` turns it into a Supabase session. The tab keeps the attempt id in `sessionStorage`, and a magic link would have opened a new tab without it (`docs/research/parent-login.md`, "Email code").

Supabase signs an RS256 access token with `sub`, `email`, `aud: authenticated` and the project's issuer. API Gateway's JWT authorizer checks it on the 7 token routes, and `apps/api/src/auth.ts` reads only `sub` and `email`.

`account` holds `id`, `pod_id`, `sub` and `created_at`. `sub` is the Supabase user id, kept as a plain unique column with no foreign key to `auth.users`. The account stores no email and no name.

### Where a provider identity lives

Supabase keeps one row in `auth.users` per person and one row in `auth.identities` per way in: `email`, `google` or `facebook`. Every identity of one user shares that user's id, so it shares the `sub` our account is keyed on. A token minted after a Google sign-in has the same issuer, audience and signing key as one minted after the email code. **Nothing on Jadwigo's side changes: no migration, no contract, no route, no authorizer setting.**

### The redirect

`supabase.auth.signInWithOAuth({ provider })` sends the tab to `<ref>.supabase.co/auth/v1/authorize`. Supabase sends it to Google or Facebook, which sends it back to `<ref>.supabase.co/auth/v1/callback`. Supabase then sends it to the `redirectTo` we passed, if that URL is on the project's allow list.

With `flowType: "pkce"`, supabase-js keeps a code verifier in the tab's storage before it leaves, and Supabase adds `?code=` to the return URL. `exchangeCodeForSession(code)` swaps the code and the verifier for a session ([Google guide](https://supabase.com/docs/guides/auth/social-login/auth-google), "PKCE").

The return lands in the same tab, at the same origin. A same-tab navigation away and back keeps `sessionStorage`, so the attempt id is still there for the claim. That is the property the email code was chosen for, and a redirect keeps it.

`redirectTo` can be `/parent?claim=<assignment>` itself. Prod's allow list is already `https://app.jadwigo.pl/**`, and dev's covers `localhost` and `127.0.0.1` on any port, so neither list needs a new entry. `auth.ts` creates the client with `detectSessionInUrl: false`. Keeping it false means only `/parent` reads `?code=`, by calling the exchange on purpose.

### Same email, same parent

Supabase links a new identity to an existing user when the provider returns a verified email that matches the user's email ([identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)). The source shows where "verified" comes from for each provider:

- **Google:** an email counts as verified when Google's `email_verified` or `verified_email` is true ([`google.go`](https://github.com/supabase/auth/blob/master/internal/api/provider/google.go)).
- **Facebook:** every email Facebook returns is marked verified, with no check ([`facebook.go`](https://github.com/supabase/auth/blob/master/internal/api/provider/facebook.go)). Supabase trusts that Facebook confirmed the address.
- **The email code:** typing the code confirms the email, so an email-code parent is always a link target.

A verified email with no matching user makes a new Supabase user. Our page then finds no account in `GET /api/v1/me` and calls `POST /api/v1/accounts`, as it does after a first email code. An unverified email is never linked, so it also makes a new user ([`linking.go`](https://github.com/supabase/auth/blob/master/internal/models/linking.go)).

### No email

A Facebook account can be registered with a phone number and no email. When the provider returns no email, Supabase stops the sign-in with "Error getting user email from external provider", unless the provider's `email_optional` setting is on ([`external.go`](https://github.com/supabase/auth/blob/master/internal/api/external.go), line 184). Supabase's Facebook guide warns about the same case when the `email` permission is missing.

We leave `email_optional` off. A parent with no email then never gets a Supabase user that no email-code sign-in could ever reach. Supabase sends the tab back to `redirectTo` with `error` and `error_description` in the URL, and `/parent` shows a kind line that offers the email code.

### What the providers put in Supabase

Google's default scopes are `email` and `profile`, and Facebook's default is `email`, with `public_profile` granted to every Facebook Login app. Both put the parent's full name and avatar URL into `auth.users.raw_user_meta_data` and `auth.identities.identity_data`. That metadata then rides in every access token as `user_metadata`. `dl-e8ov.2.16` asks whether to trim it, and Facebook adds a second source to that question. Jadwigo's own tables take nothing from it either way.

### Settings as code

Supabase's Management API takes `external_google_enabled`, `external_google_client_id`, `external_google_secret`, and the same 3 keys for `facebook`, on `PATCH /v1/projects/{ref}/config/auth`. `infra/supabase-auth/auth.sh` already diffs and applies that endpoint from `<env>.json`.

The client ids and the `enabled` flags can sit in `dev.json` and `prod.json`. The secrets can't, because `auth.sh` diffs what is in the file and the files are in git. The script needs to read each secret from the keychain, the way it reads the Supabase access token today. It must never print a secret, so its diff names a secret as set or missing and shows no value.

### The consent screen and the supabase.co host

Without a custom domain, Google's consent screen names `<ref>.supabase.co` as the app the parent is signing in to ([Google guide](https://supabase.com/docs/guides/auth/social-login/auth-google)). `dl-e8ov.2.8` says the parent must not see that host. There are 2 ways around it:

- **A Supabase custom domain**, such as `auth.jadwigo.pl`. It costs $10 a month ([custom domain usage](https://supabase.com/docs/guides/platform/manage-your-usage/custom-domains)), and each project takes exactly one ([custom domains](https://supabase.com/docs/guides/platform/custom-domains)). Each provider console needs the new callback URL before the domain is switched on.
- **Google's own sign-in button**, which hands an ID token to `signInWithIdToken({ provider: "google", token, nonce })` with no redirect. The parent sees Google's sheet over our page and never sees a Supabase URL. Supabase documents an ID-token path for Facebook only through native SDKs, and [one report](https://github.com/supabase/supabase-flutter/issues/1259) shows older versions refusing it. So the Facebook button still redirects and still shows the Supabase host in Meta's dialog.

Google's brand verification may also trip on the supabase.co host. Developers on Google's forum report rejections over the Supabase domain ([one thread](https://discuss.google.dev/t/oauth-branding-verification-stuck-name-mismatch-due-to-supabase-callback-domain-no-trust-safety-email-received/389007)). Those are reports, not Google's rule.

### Paperwork and lead time

- **Google:** scopes `openid`, `email` and `profile` are non-sensitive, so the app needs no security review. Showing our name and logo needs brand verification, which Supabase says takes "a few business days" ([Google guide](https://supabase.com/docs/guides/auth/social-login/auth-google)).
- **Facebook:** a new Meta app runs in Development mode. Only people with a role on the app can sign in until it goes Live. Going Live needs an icon, a privacy policy URL and a request for `email` in App Review. Supabase says the review takes 1 to 5 business days ([Facebook guide](https://supabase.com/docs/guides/auth/social-login/auth-facebook)).
- **Facebook data deletion:** Meta's own page says a deletion callback is optional. The privacy policy must still tell people how to ask for deletion, with instructions and not only a statement ([Meta](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback)). The site has no such page today.

### Testing without a provider

`apps/web/e2e/auth-server.ts` stands in for Supabase Auth on port 54321 for the email code. It can grow `/authorize` and `/token?grant_type=pkce` routes that skip the provider and return a session signed by the test key. Unit tests fake the `Auth` interface, as they do now. A real provider sign-in is a manual check by the owner, on `jadwigo-dev` from `localhost`.

## What this means for jadwigo

- **The build is small and lives in 2 places.** `apps/web` gains 2 buttons, the redirect and the exchange on `/parent`, the no-email message, and new copy keys in `pl` and `en`. `infra/supabase-auth` gains the provider keys and keychain secrets. No migration, contract, API route or Terraform change.
- **The owner's steps are the long pole.** `docs/runbooks/social-sign-in.md` has them in order: Google Cloud, Meta, then `auth.sh apply dev`.
- **Prod waits on the same gate as the email code.** `infra/Makefile`'s `web-deploy` sets no `JW_SUPABASE_*` today, so prod has no sign-in at all until `dl-e8ov.2.9`'s lawyer text lands.
- **Facebook is built beside Google**, by the owner's decision `jadwigo-platform/notes/2026-10-29-facebook-sign-in-is-built-beside-google-sign-in` (`dl-na1u`).

### Owner questions

The outcome block lists the options only, as the research check requires. The recommendations live here.

1. **How the parent avoids seeing supabase.co.** Recommend the custom domain `auth.jadwigo.pl` on prod only. Jadwigo runs on `jadwigo.pl` only, so one setting covers both providers, and $10 a month is the whole cost. Google's button alone leaves Facebook's dialog showing the Supabase host.
2. **Google and Facebook profile metadata (`dl-e8ov.2.16`).** Recommend trimming, as `parent-login.md` did for Google. The account row holds only `sub`, so nothing of ours needs the name or the avatar.
3. **Where Facebook data deletion is answered.** Recommend an instructions page on the site that names the email to write to, and no callback for now. Meta asks for no more, and a callback commits us to deleting within Meta's terms.
4. **Which button comes first on the sign-in screen.** Recommend the email code first, then Google, then Facebook. The email code needs no third party. It is also the only way in for a parent with no Google or Facebook account.

```json jadwigo-outcome
{
  "issue": "dl-e8ov.2.50",
  "question": "How does a parent sign in with Google or Facebook, on the Supabase Auth we already run?",
  "answer": "As 2 more identities on the same Supabase user: a same-tab PKCE redirect back to /parent keeps the stored attempt id, Supabase links a verified email to the existing parent, a sign-in with no email is refused and pointed to the email code, and nothing in Jadwigo's tables, contracts, routes or gateway changes; the work is 2 buttons in apps/web, provider keys in infra/supabase-auth, and the owner's Google and Meta setup.",
  "status": "answered",
  "sources": [
    "https://supabase.com/docs/guides/auth/social-login/auth-google",
    "https://supabase.com/docs/guides/auth/social-login/auth-facebook",
    "https://supabase.com/docs/guides/auth/auth-identity-linking",
    "https://supabase.com/docs/guides/platform/custom-domains",
    "https://supabase.com/docs/guides/platform/manage-your-usage/custom-domains",
    "https://github.com/supabase/auth/blob/master/internal/api/external.go",
    "https://github.com/supabase/auth/blob/master/internal/models/linking.go",
    "https://github.com/supabase/auth/blob/master/internal/api/provider/facebook.go",
    "https://github.com/supabase/auth/blob/master/internal/api/provider/google.go",
    "https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback",
    "https://support.google.com/cloud/answer/13463073",
    "docs/research/parent-login.md",
    "jadwigo-platform/notes/2026-10-29-facebook-sign-in-is-built-beside-google-sign-in"
  ],
  "owner_decisions": [
    {
      "question": "How does the parent avoid seeing the <ref>.supabase.co host when signing in with Google or Facebook?",
      "options": [
        "A Supabase custom domain auth.jadwigo.pl on prod, for both providers",
        "Google's own button with signInWithIdToken, and Facebook's dialog keeps the Supabase host",
        "Accept the Supabase host until after the classmates pilot"
      ]
    },
    {
      "question": "Is the Google and Facebook profile (name, avatar) in Supabase user metadata trimmed or accepted and disclosed? (dl-e8ov.2.16)",
      "options": [
        "Trim: keep nothing from either provider and clear the metadata",
        "Accept it and disclose it in the privacy notice"
      ]
    },
    {
      "question": "How does Jadwigo answer a Facebook data deletion request?",
      "options": [
        "An instructions page on the site that names where to write",
        "A data deletion callback that deletes the parent's account and pod"
      ]
    },
    {
      "question": "In what order do the ways in sit on the sign-in screen?",
      "options": [
        "Email code, then Google, then Facebook",
        "Google and Facebook first, then the email code"
      ]
    }
  ],
  "proposed_issues": [
    {
      "title": "apps/web: Continue with Google and Facebook on /parent, the PKCE exchange and the no-email message",
      "scope": "apps/web/src/parent (auth.ts, ParentScreen.tsx), packages/copy pl and en, apps/web/e2e/auth-server.ts. flowType pkce, redirectTo /parent?claim=…, exchangeCodeForSession on ?code=, a kind error line on ?error=. No contract or API change.",
      "done_when": "make check is green; an e2e test signs in through the stand-in's /authorize and /token and claims the tab's attempt",
      "depends_on": [],
      "labels": ["project:jadwigo-platform", "auth"]
    },
    {
      "title": "infra/supabase-auth: Google and Facebook provider settings, secrets from the keychain",
      "scope": "dev.json and prod.json gain external_google_* and external_facebook_* ids and enabled flags; auth.sh reads each secret from the keychain and shows only whether it is set. The owner applies.",
      "done_when": "auth.sh diff dev prints the provider keys it would set and no secret value; its test passes",
      "depends_on": [],
      "labels": ["project:jadwigo-platform", "auth"]
    },
    {
      "title": "Facebook sign-in, live after Meta's review",
      "scope": "The Facebook half of dl-e8ov.2.8: the button on, the Meta app Live, and the same account as the same email by code.",
      "done_when": "Continue with Facebook signs in a parent who is not an app tester, and lands on the same account as the same email by code",
      "depends_on": [],
      "labels": ["project:jadwigo-platform", "auth"]
    },
    {
      "title": "A data deletion instructions page and privacy section for social sign-in on jadwigo.pl",
      "scope": "apps/site: what Google and Facebook sign-in send to Jadwigo and how a parent asks for deletion, in pl and en. The lawyer reads it with dl-e8ov.2.9.",
      "done_when": "The page is reachable on jadwigo.pl and its URL is in the Meta app's settings",
      "depends_on": [],
      "labels": ["project:jadwigo-marketing"]
    }
  ],
  "page_changes": [
    {
      "section": "docs/research/parent-login.md, The owner's questions",
      "change": "Question 3 (when Google comes) now has a design in docs/research/social-sign-in.md, and Facebook comes with it"
    }
  ]
}
```
