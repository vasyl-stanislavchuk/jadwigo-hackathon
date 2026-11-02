# Auth mail: the Send Email Hook through SES

The owner runs this. It switches both Supabase projects from Supabase's built-in mail to our own: Supabase POSTs each auth mail to `https://app.jadwigo.pl/api/hooks/auth-emails`, the api checks the Standard Webhooks signature, writes the mail in the parent's language and sends it through SES From `Jadwigo <no-reply@jadwigo.pl>`. Issue `dl-liwi.33`. The code is `apps/api/src/mail/`, and the words are packages/copy's `email_*` messages.

Decision: `jadwigo-platform/notes/2026-11-02-prod-auth-mail-is-built-as-the-send-email-hook-through-ses-dl-li` (`dl-h25k5`).

The mail's language is, in order: the `language` the sign-in page puts in the user's metadata (the screen's language), the host of the redirect or the site URL (`.kids` is English), then Polish. Dev has no hosted api, so `jadwigo-dev`'s hook also calls the prod api. Each project signs with its own secret, and the api's SSM parameter holds both.

## Before

- **The PR for `dl-liwi.33` has merged**, and your checkout is on it: `git log --oneline -1 --grep dl-liwi.33 origin/main` prints it.
- **SES can send From jadwigo.pl**, with production access in eu-central-1: `aws --profile jadwigo sesv2 get-account --region eu-central-1 --query ProductionAccessEnabled` prints `true`, and `aws --profile jadwigo sesv2 get-email-identity --region eu-central-1 --email-identity jadwigo.pl --query VerifiedForSendingStatus` prints `true`.
- **The Supabase token** is in `~/.config/jadwigo/supabase.env`, as for `auth.sh` (`infra/README.md`).

## Steps

1. **Plan the IAM grant and the parameter:**
   ```
   make -C infra plan
   ```
   You should see: `0 to destroy`. The plan creates `module.app.aws_ssm_parameter.send_email_hook_secret[0]` (`/jadwigo/prod/send-email-hook-secret`), updates `module.app.aws_iam_role_policy.api` in place with `SendsAuthMailFromNoReply` (`ses:SendEmail` and `ses:SendRawEmail` on the jadwigo.pl identity, `ses:FromAddress` = `no-reply@jadwigo.pl`) and `ReadsTheSendEmailHookSecret`, and updates `module.app.aws_lambda_function.api` in place with one more environment variable, `SEND_EMAIL_HOOK_SECRET_PARAM`. Nothing else should change.
2. **Apply it:**
   ```
   make -C infra apply
   ```
3. **Make the 2 hook secrets**, one per project, in the keychain (account `jadwigo`). Each is in Supabase's format, `v1,whsec_<base64>`:
   ```
   for env in dev prod; do security add-generic-password -a jadwigo -s jadwigo-send-email-hook-secret-$env -w "v1,whsec_$(openssl rand -base64 32)"; done
   ```
   You should see: `security find-generic-password -a jadwigo -s jadwigo-send-email-hook-secret-dev -w | cut -c1-9` prints `v1,whsec_`, and the same for prod.
4. **Put both into SSM**, separated by a space. The value reaches the AWS CLI on stdin, never in argv:
   ```
   for env in dev prod; do security find-generic-password -a jadwigo -s jadwigo-send-email-hook-secret-$env -w; done | paste -sd' ' - | aws --profile jadwigo ssm put-parameter --region eu-central-1 --name /jadwigo/prod/send-email-hook-secret --type SecureString --overwrite --value file:///dev/stdin
   ```
   You should see: `{"Version": 2, "Tier": "Standard"}`.
5. **Deploy the api:**
   ```
   make -C infra api-deploy
   ```
   You should see: `api-deploy: jadwigo-api-prod is live`. An unsigned POST is now refused: `curl -s -o /dev/null -w '%{http_code}\n' -X POST https://app.jadwigo.pl/api/hooks/auth-emails -d '{}'` prints `401`.
6. **See what would change on dev:**
   ```
   infra/supabase-auth/auth.sh diff dev
   ```
   You should see: `hook_send_email_enabled: false -> true`, `hook_send_email_uri`, `rate_limit_email_sent` raised to 30, and `hook_send_email_secrets: (not set) -> (set)`. The old `mailer_*` templates are no longer in `dev.json`: the script leaves them as they are, and the hook means they are never used.
7. **Apply it to dev:**
   ```
   infra/supabase-auth/auth.sh apply dev
   ```
   You should see: `dev (jweuvslwntdimuwcvlzq): applied`, and a second `diff dev` prints `in step`.
8. **Test on dev.** Run `make dev` and open `/parent`. Sign in with an address that is not on the Supabase team, then again with another one and the screen switched to English (`/parent?lang=en`).
   You should see:
   - Each mail arrives From `Jadwigo <no-reply@jadwigo.pl>`, the first in Polish and the second in English.
   - Each carries a big 6-digit code that `/parent` accepts.
   - In the message's original headers (Gmail: **Show original**): `dkim=pass`, `spf=pass` and `dmarc=pass`.
   - `aws --profile jadwigo logs tail /aws/lambda/jadwigo-api-prod --since 10m --region eu-central-1 | grep "auth mail"` shows `auth mail sent` lines with the kind, the language and a `message_id`, and no address.

   Record what you saw: `B update dl-liwi.33 --append-notes "<what you saw>"`.
9. **Apply it to prod:**
   ```
   infra/supabase-auth/auth.sh diff prod
   infra/supabase-auth/auth.sh apply prod
   ```
   Then run `dl-5ssh.34.71.3` row 1 with an address that is not on the Supabase team.

## After

A sign-in on `https://app.jadwigo.pl/parent` from an address outside the Supabase team gets its code within a minute, From `no-reply@jadwigo.pl`, in the screen's language. The api's log shows `auth mail sent`.

## Undo

- **Back to Supabase's own mail:** set `"hook_send_email_enabled": false` in `<env>.json` and run `infra/supabase-auth/auth.sh apply <env>`. Supabase's built-in sender then reaches only team addresses, 2 an hour, as before.
- **Rotate a secret:** make a new keychain value for that project (step 3, with `-U` to update), put both into SSM again (step 4), deploy the api again (step 5) so every instance reads the new parameter, then `auth.sh apply <env>`. A warm instance keeps the parameter it read until it is replaced, so skipping the deploy fails that project's mail with 401 until then.
- **The IAM grant and the parameter** go by reverting the Terraform change and applying. Two-way.
