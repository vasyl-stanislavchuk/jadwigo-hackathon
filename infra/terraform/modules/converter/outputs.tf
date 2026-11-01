output "repository_url" {
  description = "Where `make -C apps/converter push` pushes the image"
  value       = aws_ecr_repository.converter.repository_url
}

output "function_arn" {
  description = "The function the runner invokes; blank until image_tag names an image"
  value       = local.enabled ? aws_lambda_function.converter[0].arn : ""
}

output "function_name" {
  description = "The function's name; blank until image_tag names an image"
  value       = local.enabled ? local.name : ""
}
