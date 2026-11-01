environment  = "prod"
site_domain  = "jadwigo.pl"
app_domain   = "app.jadwigo.pl"
docs_domain  = "docs.jadwigo.pl"
mail_domains = ["jadwigo.pl", "jadwigo.kids"]
supabase_ref = "xhzkmpainwzrfktxffjv"

# jadwigo-prod is Supabase Pro on Micro compute: its pooler accepts 200 clients (Management API
# billing/addons, connections_pooler, read 2026-10-29). 150 leaves 50 for make api-dev and the seeds.
app_reserved_concurrency = 150

# The step host's Muse lane may spend 30 USD a UTC day across every run before GuardedMuse refuses
# (decision dl-uxnj); each run's own cap_usd still holds per turn.
runner_muse_cap_usd = "30"

# Supabase Auth's custom domain (dl-e8ov.2.65). The TXT records come from
# `infra/supabase-auth/domain.sh status` after the owner creates the domain; none are needed before.
auth_domain     = "auth.jadwigo.pl"
auth_domain_txt = {}

# Google Workspace mail on jadwigo.pl (dl-e8ov.2.71, docs/runbooks/google-workspace.md). Each line is
# the owner's, in the runbook's order: the verification token, then mx = true, then dkim.
mail_workspace = {
  "jadwigo.pl" = { site_verification = "KknexconUTHl-ztuWvaFeMECMN9N4KrJp1oIt75br74", mx = true }
}
