output "function_name" {
  description = "The step host's function, for the release script's update-function-code"
  value       = aws_lambda_function.runner.function_name
}

output "live_alias_arn" {
  description = "The alias every caller invokes; a release moves it, a rollback points it back"
  value       = aws_lambda_alias.live.arn
}

output "database_url_param" {
  description = "The SecureString the owner sets to jadwigo_runner's pooler URL"
  value       = aws_ssm_parameter.database_url.name
}
