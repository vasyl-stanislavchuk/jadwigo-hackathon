output "bucket_name" {
  value = aws_s3_bucket.content.id
}

output "bucket_arn" {
  value = aws_s3_bucket.content.arn
}

output "distribution_id" {
  value = aws_cloudfront_distribution.media.id
}

output "media_url" {
  value = local.media_url
}

output "bucket_param" {
  value = aws_ssm_parameter.bucket.name
}

output "media_url_param" {
  value = aws_ssm_parameter.media_url.name
}

output "bucket_param_arn" {
  value       = aws_ssm_parameter.bucket.arn
  description = "The ARN of the parameter holding the bucket's name, for the api role's ssm:GetParameter"
}
