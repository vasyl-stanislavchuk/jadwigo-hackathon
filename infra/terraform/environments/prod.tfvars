environment  = "prod"
site_domain  = "jadwigo.pl"
app_domain   = "app.jadwigo.pl"
docs_domain  = "docs.jadwigo.pl"
mail_domains = ["jadwigo.pl", "jadwigo.kids"]
supabase_ref = "xhzkmpainwzrfktxffjv"

# jadwigo-prod is Supabase Pro on Micro compute: its pooler accepts 200 clients (Management API
# billing/addons, connections_pooler, read 2026-10-29). 150 leaves 50 for make api-dev and the seeds.
app_reserved_concurrency = 150
