output "bucket_name" {
  value = aws_s3_bucket.web.id
}

output "distribution_id" {
  value = aws_cloudfront_distribution.app.id
}

output "function_name" {
  value = aws_lambda_function.api.function_name
}

output "db_url_param" {
  value = aws_ssm_parameter.database_url.name
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.api.api_endpoint
}

output "api_id" {
  value = aws_apigatewayv2_api.api.id
}
