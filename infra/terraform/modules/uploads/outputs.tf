output "bucket_name" {
  value = aws_s3_bucket.uploads.id
}

output "bucket_arn" {
  value = aws_s3_bucket.uploads.arn
}

output "bucket_param_arn" {
  value       = aws_ssm_parameter.bucket.arn
  description = "The ARN of the parameter holding the bucket's name, for the api role's ssm:GetParameter"
}
