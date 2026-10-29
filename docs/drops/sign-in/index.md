:::meta
eyebrow: Jadwigo · parent login
subtitle: How a parent signs in with Google or Facebook on the Supabase Auth we already run. Also what the owner sets up by hand, and what is still open.
by: the jadwigo platform session, for issue dl-e8ov.2.50
when: 2026-10-29T18:00:00Z
tile: Migrations | 0 | good
tile: API routes changed | 0 | good
tile: Owner questions | 4 | warn
:::

# Google and Facebook sign-in for parents, on Supabase Auth

## TL;DR

- **Google and Facebook become more ways into the same Supabase user.** Jadwigo's `account` row is keyed on that user's id, so no table, route, contract or gateway setting changes. More on [Today](today.html) and [The design](vision.html).
- **The parent leaves the tab and comes back to it.** The page swaps a one-time code for a session on `/parent`, so the attempt the child played can still be saved to the right child.
- **One email is one parent.** Supabase links a Google or Facebook sign-in to the parent who already has that verified email. A Facebook account with no email is refused and offered the email code, so it never makes a second family.
- **Most of the work is the owner's.** Google needs an OAuth client and verified branding. Meta needs an app that passes review, and the site needs a page on deleting data. More on [Owner steps](steps.html).
- **The code side is small.** `dl-e8ov.2.51` adds the buttons and the code exchange to `apps/web`. `dl-e8ov.2.52` teaches `infra/supabase-auth/auth.sh` the provider settings and keeps the secrets in the keychain.
- **Facebook is built beside Google.** The owner decided this on 2026-10-29, recorded as `dl-na1u`.

## Pages

:::table The pages of this drop
| Page | What it answers |
| --- | --- |
| [Today](today.html) | the data model and the email-code sign-in that wave 3 of `dl-e8ov.2` built |
| [The design](vision.html) | where a provider sign-in lands, the redirect in the same tab, which parent it becomes |
| [Google and Facebook](providers.html) | the two providers side by side: scopes, review, the missing email, the supabase.co host |
| [Owner steps](steps.html) | what the owner does in Google Cloud, Meta and Supabase, and who owns each piece |
| [Open questions](questions.html) | what the owner decides before prod, with the options and the issue that waits |
:::

## Done when

- A parent who signed up with the email code taps **Continue with Google** on `jadwigo-dev` and lands on the same children (`dl-e8ov.2.8`).
- A parent who is not a Meta app tester signs in with Facebook, after Meta's review (`dl-e8ov.2.58`).
- A Facebook account with no email sees the line offering the email code, and no new pod appears.

The full design, with every source, is [`docs/research/social-sign-in.md`](https://github.com/vasyl-stanislavchuk/jadwigo-hackathon/blob/main/docs/research/social-sign-in.md).
