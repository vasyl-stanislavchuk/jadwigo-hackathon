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

# The converter's image (dl-z5ja.11.8): blank makes its ECR repo only. The owner sets the tag
# `make -C apps/converter push` prints, then applies again; the runner then invokes it.
converter_image_tag = ""

# Supabase Auth's custom domain (dl-e8ov.2.65). The TXT records come from
# `infra/supabase-auth/domain.sh status` after the owner creates the domain; none are needed before.
auth_domain     = "auth.jadwigo.pl"
auth_domain_txt = {}

# Google Workspace mail on jadwigo.pl (dl-e8ov.2.71, docs/runbooks/google-workspace.md). Each line is
# the owner's, in the runbook's order: the verification token, then mx = true, then dkim.
mail_workspace = {
  "jadwigo.pl" = {
    site_verification = "KknexconUTHl-ztuWvaFeMECMN9N4KrJp1oIt75br74"
    mx                = true
    dkim              = "v=DKIM1;k=rsa;p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuLCPz/CjALDdyyvBtd1zKPmbFz5yc8roCvVHtkVCH9Nu1cICBi3NxVJGmtgXS+taA8V2Yi6J4zC5cAggMkr6O7SzqoBQzehB7NZPnMvy1uPUeUW3QYleVm2oyLDY3eZI1gDsI9pqJWYxukDHB93J4m2fw4dvL/T452s/ChWYoUPR/vfWwEA2kK+lAqybjZuCjB0TDo8NZf9OCpgMbFPxOZLzlLHlZ1VonU11U88/+igOMz2r/zhjzBbZcmRgpFxcCM5IGAwl33HSOUkmdIteldvPZO32NzMHC8AF1JvPM2MVie1HH6r7bEe8kNB3JnU9xnparb4MM2E6AswAeEA9/wIDAQAB"
  }
}
