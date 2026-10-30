:::meta
eyebrow: Jadwigo · parent login
subtitle: Google and Facebook side by side: what each asks of the parent and of the owner, and where each can go wrong.
by: the jadwigo platform session, for issue dl-e8ov.2.50
when: 2026-10-29T18:00:00Z
:::

# Google and Facebook

Both providers reach Supabase the same way, through a redirect and a client id and secret. They differ in the paperwork before a stranger can sign in, and in whether an email always comes back.

:::table Google beside Facebook
| | Google | Facebook |
| --- | --- | --- |
| What we ask for | `openid`, `email`, `profile` | `email`, `public_profile` |
| Email always returned | yes, with `email_verified` | no. An account registered by phone may have none |
| How Supabase treats the email | verified when Google says so | always verified |
| Before strangers can sign in | publish the app. Branding needs verification to show our name and logo | App Review for `email`, then switch the app to Live |
| How long review takes | "a few business days", by [Supabase's Google guide](https://supabase.com/docs/guides/auth/social-login/auth-google) | 1 to 5 business days, by [Supabase's Facebook guide](https://supabase.com/docs/guides/auth/social-login/auth-facebook) |
| Who can sign in before that | any Google account, with Google's "unverified app" warning | only people with a role on the Meta app |
| What the site must have | home page, privacy policy, terms | the same, plus instructions for deleting data |
| What the parent sees without a custom domain | `<ref>.supabase.co` on Google's consent screen | the same host in Meta's dialog |
:::

## Missing email

A Facebook account can exist with a phone number and no email. Supabase stops that sign-in before it makes a user. Our page then explains that this account can't be used and offers the email code. **The refusal is on purpose.** The email code could never find a user with no email. The parent would end up with a second family and no way to join the two.

## The supabase.co host

Without a custom domain, the parent sees `<ref>.supabase.co` as the app they are signing in to. `dl-e8ov.2.8` already says that must not happen. Developers on Google's forum also report brand verification being refused over the Supabase host ([one thread](https://discuss.google.dev/t/oauth-branding-verification-stuck-name-mismatch-due-to-supabase-callback-domain-no-trust-safety-email-received/389007)). Those are reports, not Google's published rule.

- **A Supabase custom domain** such as `auth.jadwigo.pl` hides the host for both providers. The domain costs $10 a month, and a project takes exactly one ([Supabase](https://supabase.com/docs/guides/platform/manage-your-usage/custom-domains)).
- **Google's own sign-in button** hands a token straight to Supabase with no redirect, so a Google parent never sees the host. Facebook has no supported web equivalent, so Meta's dialog would still show it.

The owner picks between them in `dl-e8ov.2.55`.

## Data deletion

Meta requires the privacy policy to say how a person asks for their data to be deleted, with instructions and not only a statement. A callback that Meta calls on deletion is optional, and once built it has to delete ([Meta](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback)). `dl-w0b4.64` writes the page on the site, and `dl-e8ov.2.56` asks the owner whether a page is enough.
