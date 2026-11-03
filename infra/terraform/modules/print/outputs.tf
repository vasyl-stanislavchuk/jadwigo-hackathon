output "repository_url" {
  description = "Where `make -C apps/print push` pushes the image"
  value       = aws_ecr_repository.print.repository_url
}

output "function_arn" {
  description = "The function the api invokes; blank until image_tag names an image"
  value       = local.enabled ? aws_lambda_function.print[0].arn : ""
}

output "function_name" {
  description = "The function's name; blank until image_tag names an image"
  value       = local.enabled ? local.name : ""
}
