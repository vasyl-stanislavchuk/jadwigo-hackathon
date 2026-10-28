# The bank handshake: applying jadwigo-bank/infra, then this root

The bank's search function lives in its own Terraform root, `jadwigo-bank/infra`, with local state on
the machine that applied it. This root's `modules/app` finds it through one SSM parameter
(`dl-5ssh.57`, `docs/research/bank-into-the-monorepo.md` step 4):

| Parameter | Written by | Read by | Holds |
| --- | --- | --- | --- |
| `/jadwigo/bank/search-alias-arn` | `jadwigo-bank/infra/ssm.tf` | `modules/app/bank.tf`, a data source | the `live` alias ARN of `jadwigo-bank-search`, not a secret |
| `/jadwigo/prod/bank-read-token` | `modules/app/bank.tf`, a placeholder | `apps/api` at runtime | the shared read token, set by the owner by hand |

From the parameter, this root grants the api role `lambda:InvokeFunction` on that alias and nothing
else, and sets `BANK_SEARCH_ALIAS_ARN` and `BANK_READ_TOKEN_PARAM` in the function's environment.

The order is fixed: the bank root first, then this root, then `make -C infra api-deploy`. Until the
bank root has written the parameter, a plan here stops with
`Error: reading SSM Parameter (/jadwigo/bank/search-alias-arn): couldn't find resource`.

## Before

1. Both branches are merged: `git -C ~/projects/jadwigo-bank log --oneline -1 -- infra/ssm.tf` and
   `git log --oneline -1 -- infra/terraform/modules/app/bank.tf` each print a `dl-5ssh.57` commit.
2. The profile reaches the account:
   `aws --profile sergii sts get-caller-identity --query Account --output text` prints `843109108289`.
3. The bank's bundle is the one the live version runs, so its plan carries no function change. In
   `~/projects/jadwigo-bank/infra`, `ls build/service` lists the bundle. Rebuild it only if a plan
   in step 1 below shows `aws_lambda_function.search` changing and you mean to ship a new version.
4. The api route that reads these values (`dl-n9fr.33`) is merged, so `api-deploy` ships it.

## Steps

1. **Plan the bank root.** In `~/projects/jadwigo-bank/infra`, run
   `terraform plan -out=plan.tfplan`. You should see exactly this:

   ```
   + aws_ssm_parameter.search_alias_arn   /jadwigo/bank/search-alias-arn, String,
                                          the live alias ARN, tag bead=dl-5ssh.57
   Plan: 1 to add, 0 to change, 0 to destroy.
   ```

   If `aws_lambda_function.search` and `aws_lambda_alias.live` also change, the bundle in
   `build/service` differs from the live one. `tools/build_service.py` takes the newest boto3, so a
   rebuild alone causes this. Stop, and plan again with the live bundle unless a new version is meant.
2. **Apply the bank root:** `terraform apply plan.tfplan`. It ends `1 added, 0 changed, 0 destroyed`.
   Then `terraform output search_alias_arn_param` prints `"/jadwigo/bank/search-alias-arn"`.
3. **Plan this root.** From this repo, `make -C infra plan`. You should see exactly this:

   ```
   <= module.app.data.aws_iam_policy_document.bank    InvokesTheBankLiveAlias: lambda:InvokeFunction on
                                                      arn:aws:lambda:eu-central-1:843109108289:function:jadwigo-bank-search:live;
                                                      ReadsTheBankReadToken: ssm:GetParameter on the token
   <= module.app.data.aws_iam_policy_document.api     the 2 statements it had, plus the bank document
   +  module.app.aws_ssm_parameter.bank_read_token    /jadwigo/prod/bank-read-token, SecureString,
                                                      write-only placeholder
   ~  module.app.aws_iam_role_policy.api              jadwigo-api-prod: the 2 bank statements added
   ~  module.app.aws_lambda_function.api              env + BANK_READ_TOKEN_PARAM=/jadwigo/prod/bank-read-token,
                                                      + BANK_SEARCH_ALIAS_ARN=<the live alias ARN>
   Plan: 1 to add, 2 to change, 0 to destroy.
   Changes to Outputs: + bank_read_token_param, + bank_search_alias_arn
   ```

   The data source `module.app.data.aws_ssm_parameter.bank_search_alias_arn` is read during the plan
   and is not listed. The function's code is not touched: Terraform ignores it, `api-deploy` ships it.
4. **Apply this root:** `make -C infra apply`, and answer `yes` to the same plan. It ends
   `1 added, 2 changed, 0 destroyed`.
5. **Set the read token**, if the route should answer before `jw login` exists. Choose a long random
   string and put it from a file only you can read, so it lands in no shell history:

   ```sh
   umask 077
   openssl rand -base64 32 | tr -d '\n' > bank-read.token
   aws --profile sergii ssm put-parameter --region eu-central-1 --name /jadwigo/prod/bank-read-token \
     --type SecureString --overwrite --value file://bank-read.token
   ```

   Keep the file for the route check in After, then `rm -P bank-read.token`. Terraform wrote only the
   placeholder `set-by-owner`, once, through the write-only argument, so no value is in state and a
   later apply never puts the placeholder back.
6. **Deploy the api** from your own terminal, not an agent's: `make -C infra api-deploy`. It ends
   `api-deploy: jadwigo-api-prod is live`.

## After

- The grant is in place:

  ```sh
  aws --profile sergii iam simulate-principal-policy \
    --policy-source-arn arn:aws:iam::843109108289:role/jadwigo-api-prod \
    --action-names lambda:InvokeFunction \
    --resource-arns arn:aws:lambda:eu-central-1:843109108289:function:jadwigo-bank-search:live \
    --query 'EvaluationResults[].EvalDecision' --output text
  ```

  prints `allowed`.
- The function carries both names:
  `aws --profile sergii lambda get-function-configuration --region eu-central-1 --function-name jadwigo-api-prod --query 'Environment.Variables' --output json`
  shows `BANK_SEARCH_ALIAS_ARN` ending in `:jadwigo-bank-search:live` and `BANK_READ_TOKEN_PARAM`.
- The route answers a need through the alias: a `POST https://app.jadwigo.pl/api/v1/question-searches`
  with a need body and the read token, as `apps/api`'s route reads it (`dl-n9fr.33`), returns 200 with
  a search envelope whose `bank_rev` matches the bank's. The bank function's log shows one `search`
  line for it.

## Undo

Undo in the reverse order, because this root cannot plan once the bank's parameter is gone.

1. **This root:** revert the `dl-5ssh.57` commit, then `make -C infra plan` (expect 0 to add,
   2 to change, 1 to destroy: the token parameter) and `make -C infra apply`. The api role loses the
   invoke grant, so a deployed route that calls the bank fails until its code is rolled back too. The
   token value goes with the parameter; set it again after a re-apply.
2. **The bank root:** revert `infra/ssm.tf` and its outputs in `jadwigo-bank`, then
   `terraform plan -out=plan.tfplan` (expect 0 to add, 0 to change, 1 to destroy) and
   `terraform apply plan.tfplan`. The function, its alias and its URL are untouched.
