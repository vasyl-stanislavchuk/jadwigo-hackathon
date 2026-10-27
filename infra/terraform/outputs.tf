output "site_url" {
  value = "https://${var.site_domain}/"
}

output "site_bucket" {
  value = module.site.bucket_name
}

output "site_distribution_id" {
  value = module.site.distribution_id
}
