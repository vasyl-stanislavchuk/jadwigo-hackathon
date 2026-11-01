# Social sign-in: Google and Facebook apps for Supabase Auth

The owner runs this. It makes accounts with Google and Meta, publishes the Jadwigo name and logo to both, and puts client secrets in the keychain. Issues: Google `dl-e8ov.2.53`, Meta `dl-e8ov.2.54`, the switch-on `dl-e8ov.2.8` and `dl-e8ov.2.58`. The design is `docs/research/social-sign-in.md`.

Decisions:
- `jadwigo-platform/notes/2026-10-29-facebook-sign-in-is-built-beside-google-sign-in` (`dl-na1u`)
- `jadwigo-platform/decisions/2026-10-27-jadwigo-s-supabase-projects-are-recreated-in-frankfurt-and-sign`
- `jadwigo-hackathon/notes/2026-11-01-prod-sign-in-is-switched-on-and-linked-from-jadwigo-pl-before-th` (`dl-asgl`)
- `jadwigo-platform/notes/2026-11-01-facebook-sign-in-is-on-in-jadwigo-prod-for-the-meta-app-s-tester` (`dl-ovva`)
- `jadwigo-platform/notes/2026-11-01-prod-sign-in-ships-on-the-supabase-co-host-now-and-moves-to-auth` (`dl-2qke`)

It ends with a Google OAuth client for each Supabase project and one Meta app for both. Their secrets sit in the keychain, and both providers are switched on in `jadwigo-dev`. Prod is switched on by the same script (`dl-e8ov.2.92`, decision `dl-asgl`): the lawyer-reviewed consent text in `dl-e8ov.2.9` no longer gates it and stays a follow-up before families are invited.

## Before

- **The 2 project refs.** `jadwigo-dev` is `jweuvslwntdimuwcvlzq` and `jadwigo-prod` is `xhzkmpainwzrfktxffjv` (`infra/supabase-auth/*.json`). Each project's callback is `https://<ref>.supabase.co/auth/v1/callback`.
- **The host decision `dl-e8ov.2.55`.** If the answer is a custom domain, add its callback too, for example `https://auth.jadwigo.pl/auth/v1/callback`. Every step below that lists a callback takes it.
- **A Google account that will own the project**, with 2-step verification on. The project outlives any one laptop, so use the account that owns the Jadwigo domains.
- **A personal Facebook account** for the Meta developer account, with 2-factor authentication on.
- **The site pages.** Google and Meta both ask for a home page, a privacy policy and terms of service. Meta also asks for data deletion instructions, which `dl-w0b4.64` writes. Facebook can be tested in Development mode before that page exists, but it can't go Live.
- **The app icon**, a square PNG of at least 1024 × 1024 px for Meta. Google takes the same image at 120 × 120 px.

## Google

1. **Create the project.** Open https://console.cloud.google.com/projectcreate, name it `jadwigo`, and create it.
   You should see: the project picker shows `jadwigo`.
2. **Open the Google Auth Platform.** Go to https://console.cloud.google.com/auth/overview and select **Get started**.
3. **Fill in app information.** Use the app name `Jadwigo` and the support email of the domain owner.
4. **Pick the audience.** Choose **External**.
5. **Fill in the contact email** and accept the user data policy. Then select **Create**.
6. **Fill in branding.** Under **Branding**, add the logo, the home page `https://jadwigo.pl`, the privacy policy URL and the terms URL.
7. **List authorized domains.** Add `jadwigo.pl`, which also covers the custom domain `auth.jadwigo.pl` if one is chosen. Leave `supabase.co` out, since nobody here can verify it.
8. **Set the scopes.** Under **Data Access**, keep `.../auth/userinfo.email` and `.../auth/userinfo.profile`, and add `openid`. Add nothing else.
   You should see: the 3 scopes listed as non-sensitive.
9. **Publish the app.** Under **Audience**, select **Publish app**, so any Google account can sign in.
10. **Submit brand verification.** Under **Verification Center**, submit branding for review.
    You should see: "Verification in progress". Google's help says it can take a few business days. If Google asks about the Supabase callback host, reply that it belongs to Supabase, a service Jadwigo uses.
11. **Create the dev client.** Under **Clients**, select **Create client** and choose **Web application**. Name it `jadwigo-dev`.
12. **Add the dev origins.** These matter only if `dl-e8ov.2.55` picks Google's own button. Under **Authorized JavaScript origins**, add `http://localhost:5173` and `http://127.0.0.1:5173`.
13. **Add the dev callback.** Under **Authorized redirect URIs**, add `https://jweuvslwntdimuwcvlzq.supabase.co/auth/v1/callback`. Then select **Create**.
14. **Store the dev secret.** Copy the client secret, then run this in your own terminal and paste it at the prompt:
    ```
    security add-generic-password -a jadwigo -s jadwigo-google-oauth-secret-dev -w
    ```
    You should see: `security find-generic-password -a jadwigo -s jadwigo-google-oauth-secret-dev -w | cut -c1-6` prints `GOCSPX`.
15. **Record the dev client id** on the issue. A client id is not a secret. Run `B update dl-e8ov.2.53 --append-notes "google dev client id: <id>"`, with `B` the board function in `AGENTS.md`.
16. **Repeat steps 11 to 15 for prod.** Name the client `jadwigo-prod`. The origin is `https://app.jadwigo.pl`. The callback is `https://xhzkmpainwzrfktxffjv.supabase.co/auth/v1/callback`, plus the custom domain's callback if chosen. The keychain item is `jadwigo-google-oauth-secret-prod`.

## Meta

1. **Register as a developer.** Open https://developers.facebook.com, select **Get started**, and confirm your account.
2. **Create a business portfolio** named `Jadwigo` at https://business.facebook.com. Meta may ask for one before the app goes Live. It may also ask to verify the business with company documents.
3. **Create the app.** At https://developers.facebook.com/apps, select **Create app**. Name it `Jadwigo` and give it the contact email.
4. **Pick the use case** "Authenticate and request data from users with Facebook Login".
5. **Connect the business portfolio** from step 2, then create the app.
   You should see: the app dashboard with an App ID at the top.
6. **Check the permissions.** Under **Use cases**, edit "Authentication and account creation". Make sure `email` and `public_profile` both say "Ready for testing", and add `email` if it is missing.
7. **Add the callbacks.** Under **Facebook Login → Settings**, add both Supabase callbacks to **Valid OAuth Redirect URIs**, plus the custom domain's if chosen. Then save.
8. **Fill in Settings → Basic.** Add the icon, the privacy policy URL, the terms URL, the category "Education" and the app domain `jadwigo.pl`.
9. **Add the deletion URL.** Under **Settings → Basic**, set **User data deletion** to "Data deletion instructions URL" with the page from `dl-w0b4.64`. Skip this step until that page is live.
10. **Store the app secret.** Under **Settings → Basic**, select **Show** next to App secret, copy it, and run this in your own terminal:
    ```
    security add-generic-password -a jadwigo -s jadwigo-facebook-app-secret-dev -w
    ```
    Store the same secret again as `jadwigo-facebook-app-secret-prod`. One app serves both projects, because it lists both callbacks.
    You should see: `security find-generic-password -a jadwigo -s jadwigo-facebook-app-secret-dev -w | wc -c` prints a number above 1.
11. **Record the app id** on the issue: `B update dl-e8ov.2.54 --append-notes "facebook app id: <id>"`.
12. **Add testers.** Under **App roles → Roles**, add the Facebook accounts that will test on dev. Each tester accepts the invite in their Facebook notifications. Until the app is Live, only these accounts can sign in.
13. **Ask for review** once `dl-e8ov.2.58` is ready to go to prod. Under **App Review → Permissions and features**, request `email`. Attach a screen recording of the sign-in on `jadwigo-dev` and a line on why Jadwigo needs the email. The email is how a parent signs in and how Supabase finds their account.
    You should see: the request "In review". Supabase's guide says a review takes 1 to 5 business days.
14. **Go Live** once the review passes, with the switch at the top of the app dashboard.

## Supabase

`dl-e8ov.2.52` taught `infra/supabase-auth/auth.sh` to read the keychain items above. The client ids you recorded on `dl-e8ov.2.53` and `dl-e8ov.2.54` go into `dev.json` and `prod.json` as the first step of `dl-e8ov.2.8` and `dl-e8ov.2.58`, with a `secrets` block naming each keychain item (the shape is in `infra/README.md`). Until then the script leaves both providers alone.

`dev.json` also turns on the custom access token hook, `app.custom_access_token`, which keeps the provider's name and avatar out of tokens (`dl-e8ov.2.67`, decision `dl-zt14`). A migration creates that function. If the hook were switched on before the function exists, every sign-in would fail. So the order on each project is:

0. **Push the migrations first**, from your own terminal:
   ```
   make db-push ENV=dev
   ```
   You should see: `20261030120000_trim_profile.sql` among the migrations it pushes, or nothing left to push. Until then, `auth.sh diff dev` prints `hook_custom_access_token_uri: app.custom_access_token(jsonb) is not in the project; make db-push ENV=dev first` and exits 1, and `apply` sends nothing. It checks with a read-only query through the Management API.

1. **See what would change** on dev:
   ```
   infra/supabase-auth/auth.sh diff dev
   ```
   You should see: `hook_custom_access_token_enabled: false -> true` and its `uri`, the `external_google_*` and `external_facebook_*` keys it would set, and each secret as `(not set) -> (set)`, never as a value. A line `missing from the keychain (<item>)` means that item isn't stored under account `jadwigo`: store it as in Google step 14 or Meta step 10, then run the diff again. The script exits 1 then, and `apply` sends nothing.
2. **Apply it** from your own terminal. The script refuses to run from an agent's shell:
   ```
   infra/supabase-auth/auth.sh apply dev
   ```
   You should see: `dev (jweuvslwntdimuwcvlzq): applied`, and a second `diff dev` prints `in step`. Supabase shows each secret only as an HMAC-SHA256 keyed by the project ref, and the script compares the keychain value's HMAC with it, so a secret you rotate in the keychain shows as `(another value) -> (set)`.
3. **Try it.** Run `make dev`, open `/parent`, and select **Continue with Google**. Sign in with the email you already used for the email code.
   You should see: the parent home with the same children as before, not the "add a child" step.
4. **Try Facebook** with a tester account from Meta step 12, in the same way.
5. **Try a Facebook account with no email**, if you have one.
   You should see: the line offering the email code, and no new pod. `B update dl-e8ov.2.58 --append-notes "<what you saw>"`.

Prod is the same, with `prod` for `dev` (`dl-e8ov.2.92`). `prod.json` carries the hook, Google with the prod client id, Facebook and their 2 secrets (`jadwigo-google-oauth-secret-prod`, `jadwigo-facebook-app-secret-prod`). `make db-push ENV=prod` comes before `auth.sh apply prod`; until then `auth.sh diff prod` says the hook function is not in the project and exits 1. Then `make -C infra web-deploy` ships `infra/web-build/prod.env`: the `supabase.co` host for now (`dl-2qke`), jadwigo-prod's publishable key, and `JW_SUPABASE_PROVIDERS=google`.

Facebook is on in jadwigo-prod but its button stays hidden while the Meta app is in Development mode (`dl-ovva`): a tester from Meta step 12 opens `https://app.jadwigo.pl/parent?provider=facebook`, which starts Facebook because the project has it on. Once the app is Live (Meta step 14), `JW_SUPABASE_PROVIDERS=google,facebook` and a web redeploy show the button.

## The custom domain

Prod's Auth answers on `auth.jadwigo.pl`, so Google's consent screen and Facebook's dialog name Jadwigo's host and not `xhzkmpainwzrfktxffjv.supabase.co`. This is decision `jadwigo-platform/decisions/2026-10-30-prod-supabase-auth-runs-on-the-custom-domain-auth-jadwigo-pl-so` (`dl-ahol`), built in `dl-e8ov.2.65`. Dev keeps its `supabase.co` host. The add-on costs $10 a month and switches on at step 2. `infra/supabase-auth/domain.sh` runs each step through the Management API. It refuses to run from an agent's shell, except `status`.

1. **Add the CNAME.** `infra/terraform/environments/prod.tfvars` names `auth_domain = "auth.jadwigo.pl"`. Run:
   ```
   make -C infra plan
   make -C infra apply
   ```
   You should see: the plan adds `module.auth_domain[0].aws_route53_record.cname`, `auth.jadwigo.pl` CNAME `xhzkmpainwzrfktxffjv.supabase.co`, and nothing else from this change. `dig +short CNAME auth.jadwigo.pl` prints `xhzkmpainwzrfktxffjv.supabase.co.`
2. **Create the domain on Supabase:**
   ```
   infra/supabase-auth/domain.sh create
   ```
   You should see: `auth.jadwigo.pl: created on xhzkmpainwzrfktxffjv`, `status: 2_initiated`, and an `auth_domain_txt = { … }` block with 1 or 2 TXT records. None of them is secret.
3. **Add the TXT records.** Replace `auth_domain_txt = {}` in `prod.tfvars` with that block. Then run `make -C infra plan` and `make -C infra apply` again, and land the `prod.tfvars` change in a PR.
   You should see: the plan adds only `module.auth_domain[0].aws_route53_record.txt[…]`, one for each record in the block.
4. **Verify.** Run `infra/supabase-auth/domain.sh reverify` every few minutes until it prints `status: 4_origin_setup_completed`. Supabase's certificate can take a while. If `verification error` or `ssl error` lines repeat for an hour, compare the records with `dig +short TXT <name>`.
5. **Check the callbacks.** The Google prod client (Google step 16) and the Meta app (Meta step 7) must already list `https://auth.jadwigo.pl/auth/v1/callback`. Activation moves the providers' callbacks onto it.
6. **Activate:**
   ```
   infra/supabase-auth/domain.sh activate
   ```
   You should see: `auth.jadwigo.pl: activated on xhzkmpainwzrfktxffjv`, and `status: 5_services_reconfigured` on a later `domain.sh status`. The `supabase.co` host keeps answering as well.
7. **Check the token issuer.** This step sends you an email code. Use an email that already has an account on prod. The script does not create a new account.
   ```
   infra/supabase-auth/domain.sh issuer
   ```
   You should see: `iss: https://xhzkmpainwzrfktxffjv.supabase.co/auth/v1`, `alg: RS256`, `the JWKS key for that kid: RSA RS256` and `matches the authorizer`. Record the result: `B update dl-e8ov.2.65 --append-notes "issuer check: iss <iss>, alg <alg>, kid <kid>: <matches or DIFFERS>"`. On `DIFFERS`, stop. Deploy nothing and tell the lead: either the authorizer's `jwt_issuer` changes, or the signing key is not RS256 (`supabase-projects.md` step 2).

Then `infra/web-build/prod.env` names `JW_SUPABASE_URL=https://auth.jadwigo.pl` in place of the `supabase.co` host prod ships on until now (`dl-2qke`), and the owner redeploys the web app.

## After

- `B show dl-e8ov.2.53` and `B show dl-e8ov.2.54` carry the client ids in their notes.
- `security find-generic-password -a jadwigo -s <item> -w | wc -c` prints a number above 1 for each of the 4 keychain items.
- `infra/supabase-auth/auth.sh diff dev` prints `dev (jweuvslwntdimuwcvlzq): in step`.

## Undo

- **A provider in Supabase:** set its `enabled` flag to false in `<env>.json` and run `auth.sh apply` again. This is two-way, and existing parents keep their accounts, because their email identity is still there.
- **A Google client or the Meta app:** delete it in its console. This is two-way while nobody signs in with it. Once parents use it, deleting it locks out anyone with no other way in, so switch it off in Supabase first.
- **Brand verification and App Review:** one-way in practice. The name and logo you submitted are on record with Google and Meta, and changing them means a new review.
- **The keychain items:** `security delete-generic-password -a jadwigo -s <item>`.
- **The custom domain:** before step 6, delete it under Project Settings → Custom Domains. That stops the add-on, and you can remove `auth_domain` from `prod.tfvars` and apply again. This is two-way. After step 6, parents' sign-ins go through `auth.jadwigo.pl`. Removing the domain then breaks every callback that names it, so treat it as one-way once anyone signs in.
