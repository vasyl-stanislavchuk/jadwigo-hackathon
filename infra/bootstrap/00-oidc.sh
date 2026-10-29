#!/usr/bin/env bash
# The role a PR's terraform plan assumes (dl-5ssh.34.4): jadwigo-github-plan, under the jadwigo-boundary
# permission boundary. It trusts only this repo's pull_request runs (plan-trust.json) and can only read
# (plan-policy.json): no write, no kms:Decrypt, no SSM value but the bank alias, no object but the prod
# state. There is no apply role: the owner applies by hand. The account's GitHub OIDC provider exists
# already (adam-calling uses it); this reuses it and never creates one. Safe to run again: it updates
# the boundary, the trust and the policy in place.
source "$(dirname "$0")/_lib.sh"
PROVIDER="arn:aws:iam::$ACCOUNT:oidc-provider/token.actions.githubusercontent.com"
BOUNDARY="arn:aws:iam::$ACCOUNT:policy/jadwigo-boundary"
ROLE=jadwigo-github-plan

step "the GitHub OIDC provider"
"${AWS[@]}" iam get-open-id-connect-provider --open-id-connect-provider-arn "$PROVIDER" --query Url

step "the permission boundary jadwigo-boundary"
if "${AWS[@]}" iam get-policy --policy-arn "$BOUNDARY" >/dev/null 2>&1; then
  # A policy keeps at most 5 versions: drop the oldest non-default one before adding a sixth.
  count=$("${AWS[@]}" iam list-policy-versions --policy-arn "$BOUNDARY" --query 'length(Versions)')
  if [ "$count" -ge 5 ]; then
    old=$("${AWS[@]}" iam list-policy-versions --policy-arn "$BOUNDARY" \
      --query 'sort_by(Versions[?!IsDefaultVersion], &CreateDate)[0].VersionId')
    "${AWS[@]}" iam delete-policy-version --policy-arn "$BOUNDARY" --version-id "$old"
  fi
  "${AWS[@]}" iam create-policy-version --policy-arn "$BOUNDARY" --set-as-default \
    --policy-document "file://$HERE/boundary.json" --query PolicyVersion.VersionId
else
  "${AWS[@]}" iam create-policy --policy-name jadwigo-boundary --policy-document "file://$HERE/boundary.json" \
    --description "Ceiling for every jadwigo role: it cannot edit this policy, shed it, or make a role without it" \
    --tags Key=project,Value=jadwigo Key=managed_by,Value=infra-bootstrap --query Policy.Arn
fi

step "the role $ROLE"
if "${AWS[@]}" iam get-role --role-name "$ROLE" >/dev/null 2>&1; then
  "${AWS[@]}" iam update-assume-role-policy --role-name "$ROLE" --policy-document "file://$HERE/plan-trust.json"
  "${AWS[@]}" iam put-role-permissions-boundary --role-name "$ROLE" --permissions-boundary "$BOUNDARY"
else
  "${AWS[@]}" iam create-role --role-name "$ROLE" --assume-role-policy-document "file://$HERE/plan-trust.json" \
    --permissions-boundary "$BOUNDARY" --max-session-duration 3600 \
    --description "terraform plan for jadwigo-hackathon pull requests: read only" \
    --tags Key=project,Value=jadwigo Key=managed_by,Value=infra-bootstrap --query Role.Arn
fi
"${AWS[@]}" iam put-role-policy --role-name "$ROLE" --policy-name plan-read \
  --policy-document "file://$HERE/plan-policy.json"

step "the repo variable the plan job reads"
echo "gh variable set AWS_PLAN_ROLE_ARN --repo vasyl-stanislavchuk/jadwigo-hackathon --body arn:aws:iam::$ACCOUNT:role/$ROLE"
