:::meta
eyebrow: Jadwigo · parent login
subtitle: What the owner decides before Google and Facebook reach prod. Each question lists its options and the issue that waits on the answer.
by: the jadwigo platform session, for issue dl-e8ov.2.50
when: 2026-10-29T18:00:00Z
:::

# Open questions

Each question is an issue labelled `needs-owner` on the board. The research note gives the lead's recommendation for each one. This page lists the options only.

## supabase.co host

`dl-e8ov.2.55`. Without a custom domain, the parent sees `<ref>.supabase.co` as the app they are signing in to.

- A Supabase custom domain `auth.jadwigo.pl` on prod, for both providers. The domain costs [$10 a month](https://supabase.com/docs/guides/platform/manage-your-usage/custom-domains). Jadwigo runs on `jadwigo.pl` only, so one domain covers every parent.
- Google's own button, with no redirect. Facebook's dialog keeps the Supabase host.
- Accept the Supabase host until after the classmates pilot.

Waiting on it: `dl-e8ov.2.8`, Google going live.

## Profile metadata

`dl-e8ov.2.16`. Google and Facebook put the parent's full name and avatar into Supabase's user metadata, which rides in every token.

- Trim it, and keep nothing from either provider.
- Accept it, and disclose it in the privacy notice.

Waiting on it: the privacy text in `dl-w0b4.64`.

## Data deletion

`dl-e8ov.2.56`. Meta needs instructions for asking Jadwigo to delete a parent's data.

- An instructions page on the site that names where to write.
- A callback that Meta calls, which deletes the parent's account and family. Jadwigo has no deletion route yet, and deleting learner data is a one-way door in this repo.

Waiting on it: `dl-w0b4.64`, then Meta's review in `dl-e8ov.2.54`.

## Button order

`dl-e8ov.2.57`. The sign-in screen gets a Google button and a Facebook button beside the email field.

- Email code first, then Google, then Facebook.
- Google and Facebook first, then the email code.

Waiting on it: the layout in `dl-e8ov.2.51`, which builds the first order until the owner answers.
