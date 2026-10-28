# Force one api error to check the alarms

Makes the api's Lambda fail once on purpose, so you can see the `api-errors` alarm (`dl-5ssh.13`) go
to ALARM and its mail arrive. The owner runs it. Nothing is written, and no learner data is involved.

`apps/api/src/failures.test.ts` pins what each alarm sees:

| What fails | What AWS counts | Alarm |
| --- | --- | --- |
| A route throws (a database fault, a bug) | the HTTP API answers 500, counted as `5xx`; the function logs one JSON line, `{"level":"ERROR","message":"route failed","route":...}` | `api-5xx` |
| The function itself fails: an event that is not an HTTP API event, a timeout, a failed config read before the router | Lambda `Errors` | `api-errors` |

The smoke below forces the second one. It invokes the function directly, so it never passes through API
Gateway and never reaches a route.

Today Terraform has only the `prod` environment (`infra/terraform/environments/prod.tfvars`), so the
function is `jadwigo-api-prod` and the mail goes to the owner. Once a `dev` environment exists, run it
there against `jadwigo-api-dev` and the `jadwigo-dev-api-errors` alarm.

## Before

- The alarms module (`dl-5ssh.13`, PR #101) is applied, and its mail address is confirmed:
  `aws --profile sergii sns list-subscriptions-by-topic --topic-arn "$(AWS_PROFILE=sergii terraform -chdir=infra/terraform output -raw alarm_topic_arn)"`
  shows the subscription with an ARN, not `PendingConfirmation`.
- The function exists: `aws --profile sergii lambda get-function --function-name jadwigo-api-prod --query Configuration.State` prints `"Active"`.

## Steps

1. Invoke the function once with an event no router accepts:

   ```sh
   aws --profile sergii lambda invoke --function-name jadwigo-api-prod \
     --cli-binary-format raw-in-base64-out --payload '{"jadwigo_smoke":"force-error"}' /dev/stdout
   ```

   You should see `"FunctionError": "Unhandled"`. The error message says the event is not compatible
   with this resolver.

## After

- Within about 5 minutes (one period), `aws --profile sergii cloudwatch describe-alarms --alarm-names jadwigo-prod-api-errors --query 'MetricAlarms[0].StateValue'` prints `"ALARM"`, and the alarm mail arrives.
- About 5 minutes later, with no more errors, it goes back to `"OK"` and a 2nd mail says so.

## Undo

Nothing to undo: the invoke wrote nothing, and the alarm returns to OK by itself.
