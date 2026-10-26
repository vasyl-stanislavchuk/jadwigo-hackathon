# infra

Empty until `dl-5ssh.34.4`. That bead builds `infra/` as one Terraform root module read through
`environments/<env>.tfvars` and `<env>.backend.hcl`, prod only, with a plan on every PR and the
OIDC roles script. Decision: `jadwigo-platform/decisions/2026-10-26-terraform-lives-in-the-jadwigo-repo-under-infra-one-root-module`.

A merge deploys nothing. The owner deploys by hand
(`jadwigo-platform/decisions/2026-10-26-a-green-merge-does-not-deploy-to-prod-the-owner-deploys-manually`).
