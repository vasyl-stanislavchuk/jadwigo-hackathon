# SES for auth mail from each domain's own identity (dl-5ssh.6; dl-liwi.33 sends through it). Both
# zones are in this account: jadwigo.pl Z08182772X0QEYE8APFY2, jadwigo.kids Z104786410HAZWCXNTHGL.
module "mail" {
  source = "./modules/mail"

  domains = var.mail_domains
}

variable "mail_domains" {
  description = "Apexes SES sends from, each with a Route 53 zone in this account"
  type        = set(string)
}

output "mail_identity_arns" {
  value = module.mail.identity_arns
}
