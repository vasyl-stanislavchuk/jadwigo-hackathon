output "site_url" {
  value = "https://${var.site_domain}/"
}

output "site_bucket" {
  value = module.site.bucket_name
}

output "site_distribution_id" {
  value = module.site.distribution_id
}

output "app_url" {
  value = "https://${var.app_domain}/"
}

output "app_bucket" {
  value = module.app.bucket_name
}

output "app_distribution_id" {
  value = module.app.distribution_id
}

output "api_function_name" {
  value = module.app.function_name
}

output "db_url_param" {
  value = module.app.db_url_param
}

output "bank_search_alias_arn" {
  value = module.app.bank_search_alias_arn
}

output "bank_read_token_param" {
  value = module.app.bank_read_token_param
}

output "content_bucket" {
  value = module.content.bucket_name
}

output "media_url" {
  value = module.content.media_url
}
