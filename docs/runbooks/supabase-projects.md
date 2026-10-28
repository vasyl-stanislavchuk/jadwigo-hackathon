# Supabase projects: prod and dev in Frankfurt, signing with RS256

The owner runs this: it creates paid projects, deletes one, and signs the DPA. Issue `dl-5ssh.5`.
Decisions:
- `jadwigo-platform/decisions/2026-10-27-jadwigo-s-supabase-projects-are-recreated-in-frankfurt-and-sign`
- `jadwigo-platform/decisions/2026-10-27-jadwigo-runs-on-a-prod-and-a-dev-supabase-project-a-native-local`

It ends with 2 empty projects, `jadwigo-prod` and `jadwigo-dev`, both in eu-central-1 on
Postgres 17, signing with an RS256 key, and the Ireland project `jadwigo.pl`
(`whyfosckezuauwwnnzpm`) deleted. Migrations reach the projects later, through
`make db-push` (`docs/runbooks/migrations.md`).

**Run on 2026-10-27** (`dl-5ssh.5`, closed): `jadwigo-prod` is `xhzkmpainwzrfktxffjv` and
`jadwigo-dev` is `jweuvslwntdimuwcvlzq`, both eu-central-1 on Postgres 17.11 with RS256 in use.
The Ireland project was checked empty and deleted. Steps 5 and 6 are done for good; the rest stays
here for recreating a project.

## Before

- **A Supabase personal access token in the keychain.** The checks below read it. Create one at
  https://supabase.com/dashboard/account/tokens, then run this in your own terminal (the prompt
  needs one) and paste the token, which starts with `sbp_`:
  ```
  security add-generic-password -a jadwigo -s supabase-access-token -w
  ```
  You should see: `security find-generic-password -a jadwigo -s supabase-access-token -w | cut -c1-4` prints `sbp_`.
- The `Jadwigo` organisation is on Pro. Check Organization → Billing.
- `jq` and `curl` are installed: `jq --version`.

Define the check once in your shell. It prints no secret, and passes any further arguments
(`-X POST`, `-H`, `-d`) through to curl:

```zsh
supa() { local p=$1; shift; curl -sS -H "Authorization: Bearer $(security find-generic-password -a jadwigo -s supabase-access-token -w)" "$@" "https://api.supabase.com/v1$p"; }
supa /projects | jq '[.[] | {ref: .id, name, region, status, pg: .database.version}]'
```

## Steps

### Prod

1. **Create the project.** Dashboard → New project. Use organisation `Jadwigo`, name `jadwigo-prod`,
   region **Central EU (Frankfurt)**, and the default compute. Generate a database password and store
   it straight in the keychain, never in a file:
   ```
   security add-generic-password -a jadwigo -s supabase-db-password-prod -w
   ```
   You should see: `supa /projects` lists `jadwigo-prod` with `region: "eu-central-1"` and `pg` starting with `17.`.
2. **Make an RS256 key current.** Project → Settings → JWT Keys → Create standby key → choose **RSA**.
   Then select **Rotate keys**, so the RSA key is in use and the ES256 one becomes previously used.
   You should see (with `REF` set to the new project's ref):
   ```zsh
   curl -sS https://$REF.supabase.co/auth/v1/.well-known/jwks.json | jq '[.keys[] | {kty, alg}]'
   supa /projects/$REF/config/auth/signing-keys | jq '[.keys[]? // .[]? | {algorithm, status}]'
   ```
   The first shows an entry with `"kty": "RSA", "alg": "RS256"`. The second shows `RS256` as `in_use`.
3. **Record the ref** on the issue. A ref is not a secret:
   `bd -C ~/projects/david-learns/.beads update dl-5ssh.5 --append-notes "prod ref: <ref>, eu-central-1, RS256 in use"`.

### Dev

4. **Repeat steps 1 to 3** with name `jadwigo-dev`, the keychain item `supabase-db-password-dev`, and
   "dev ref" in the note. The region is again Frankfurt. The credits pay for its compute.

### The Ireland project

5. **Check it is still empty**, so the delete loses nothing:
   ```zsh
   supa /projects/whyfosckezuauwwnnzpm/database/query -X POST -H 'Content-Type: application/json' \
     -d '{"query":"select count(*) from information_schema.tables where table_schema = '\''public'\''","read_only":true}' | jq
   ```
   You should see `0`. If it is not 0, stop and tell the lead.
6. **Delete it.** Project `jadwigo.pl` → Settings → General → Delete project, then type its name.
   You should see: `supa /projects` no longer lists `whyfosckezuauwwnnzpm`.

### The organisation

7. **DPA: no action.** Organization → Legal Documents says the Data Processing Addendum is part of
   Supabase's Terms of Service, so every organisation has it and nothing needs signing. Save a copy
   with View DPA if you want one on file.
8. **2FA.** Turn on MFA for the owner's account (Account → Security) and keep the recovery codes off
   the laptop. The organisation has one owner, by the owner's choice (2026-10-27), so those codes
   are the only way back in.

## After

```zsh
supa /projects | jq '[.[] | {name, region, pg: .database.version}]'
```

This lists exactly `jadwigo-prod` and `jadwigo-dev`, both `eu-central-1`, both Postgres 17. Each
JWKS shows an RSA key. Then mark `dl-5ssh.5` done in a note, and tell the lead the 2 refs.

## Undo

- **A new project:** delete it (step 6 on that project) and start again. That is two-way while it is empty.
- **The Ireland project:** **one-way.** A deleted project cannot be restored. Step 5 is what makes this safe.
- **The key rotation:** rotate back to the previous key in JWT Keys. Once tokens are issued, keep the
  old key valid for at least 2 hours, because API Gateway caches keys that long.
