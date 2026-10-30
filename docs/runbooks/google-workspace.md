# Google Workspace mail on jadwigo.pl, beside SES

The owner runs this. It signs up for a paid Google Workspace subscription and changes where jadwigo.pl's mail goes. Issue `dl-e8ov.2.71`. The mailbox it ends with, `privacy@jadwigo.pl`, is what `dl-e8ov.2.70` waits for.

Decision: `jadwigo-platform/decisions/2026-10-30-jadwigo-s-mailboxes-are-google-workspace-on-jadwigo-pl-beside-se`.

It ends with these records on jadwigo.pl:
- People's mail in Google Workspace: `MX 1 smtp.google.com`.
- The apex TXT carries SPF for Google and the site verification token.
- Google's DKIM at `google._domainkey.jadwigo.pl`.
- `privacy@jadwigo.pl` receiving mail.

SES keeps sending auth mail exactly as before. Its DKIM is 3 `<token>._domainkey` CNAMEs, and its MAIL FROM, MX and SPF are on `mail.jadwigo.pl`, so no record here touches it. `_dmarc.jadwigo.pl` stays `p=quarantine` with relaxed alignment, which passes for both senders.

Every record is a line in `infra/terraform/environments/prod.tfvars` under `mail_workspace`. Each one stays off until you set it, so a plan before you sign up changes nothing. The records are built in `infra/terraform/modules/mail/workspace/`.

## Before

- **The zone is Terraform's.** `make -C infra plan` runs clean and shows no change you didn't expect.
- **jadwigo.pl has no MX and no apex TXT today.** Check with:
  ```
  dig +short MX jadwigo.pl
  dig +short TXT jadwigo.pl
  ```
  You should see: both print nothing. If either prints something, stop and tell the lead. The apex TXT is one record set, and this change would own all of it.
- **A payment method for Google Workspace.** Business Starter is enough.

## Steps

1. **Sign up.** At https://workspace.google.com, start a Business Starter subscription for the domain `jadwigo.pl`, which you already own. Create your admin account on it.
   You should see: the Admin console at https://admin.google.com asking you to verify the domain.
2. **Take the verification token.** Choose verification by **TXT record**. Copy the value after `google-site-verification=`.
3. **Publish it.** In `prod.tfvars`, set:
   ```hcl
   mail_workspace = {
     "jadwigo.pl" = { site_verification = "<token>" }
   }
   ```
   Then run `make -C infra plan`.
   You should see: one resource to add, `module.mail.module.workspace["jadwigo.pl"].aws_route53_record.txt[0]`, holding `google-site-verification=<token>`. Run `make -C infra apply`, then land the `prod.tfvars` change in a PR. The token is not a secret.
4. **Verify the domain.** In the Admin console, select **Verify**. Check first with `dig +short TXT jadwigo.pl`.
   You should see: the domain verified.
5. **Switch the mail to Google.** Add `mx = true` beside the token, then plan and apply again.
   You should see: the plan adds `aws_route53_record.mx[0]` (`1 smtp.google.com`) and changes `txt[0]` in place to add `v=spf1 include:_spf.google.com ~all`. Then select **Activate Gmail** in the Admin console. `dig +short MX jadwigo.pl` prints `1 smtp.google.com.`
6. **Make the DKIM key.** In the Admin console, go to Apps → Google Workspace → Gmail → **Authenticate email**. Select **Generate new record**, with a 2048-bit key and the prefix `google`. Copy the whole TXT value, starting `v=DKIM1;`, into `dkim = "…"` beside the others. Then plan and apply. Terraform splits it into 255-character strings.
   You should see: the plan adds `aws_route53_record.dkim[0]` at `google._domainkey.jadwigo.pl`. After apply, wait until `dig +short TXT google._domainkey.jadwigo.pl` prints the key, then select **Start authentication**. Google says this can take up to 48 hours to show as authenticating.
7. **Create privacy@.** In the Admin console, go to Directory → Groups and create the group `privacy@jadwigo.pl`, with you as a member. Set **Who can post** to anyone on the web, so a parent's mail reaches it. An alias on your own user works too, but a group can take a second member later.
8. **Send a test.** From a personal address outside jadwigo.pl, send a mail to `privacy@jadwigo.pl`, then reply to it from Workspace.
   You should see:
   - The mail arrives in your Workspace inbox.
   - On the reply, the personal account's "Show original" says `SPF: PASS`, `DKIM: PASS with domain jadwigo.pl` and `DMARC: PASS`.

   Record it: `B update dl-e8ov.2.70 --append-notes "privacy@jadwigo.pl receives mail (group); SPF, DKIM, DMARC pass"`.

## After

```
dig +short MX jadwigo.pl
dig +short TXT jadwigo.pl
dig +short TXT google._domainkey.jadwigo.pl
dig +short TXT _dmarc.jadwigo.pl
```

You should see:
- The MX is `1 smtp.google.com.`
- The apex TXT has the SPF line and the verification token.
- The DKIM key is in 2 quoted strings.
- `_dmarc` still says `v=DMARC1; p=quarantine; adkim=r; aspf=r`.

A sign-in email code from the app still arrives, so SES is unaffected.

DMARC reports: `_dmarc` has no `rua=` today, so nobody receives aggregate reports. If you want them, a `dmarc@jadwigo.pl` group could take them, and the mail module's DMARC record would gain `rua=mailto:dmarc@jadwigo.pl`. That is your call. Tell the lead, and it becomes an issue.

## Undo

- **Before step 5:** remove the `mail_workspace` entry and apply. Then cancel the subscription in the Admin console. This is two-way: no mail has moved.
- **The MX (step 5):** set `mx = false` and apply. Mail to jadwigo.pl then bounces, because nothing else receives it. That makes this two-way only for mail that hasn't arrived yet.
- **DKIM:** remove `dkim` and apply, after you select **Stop authentication**. This is two-way.
- **The subscription, once mail is in it:** one-way. Cancelling deletes the mailboxes and groups with their mail, so export it first with Google's Data Export.
