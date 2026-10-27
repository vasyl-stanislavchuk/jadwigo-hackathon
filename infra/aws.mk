# The AWS profile Terraform runs through: a profile in your own ~/.aws/config pointed at account
# 843109108289 (david-learns/decisions/2026-10-22-jadwigo-is-built-in-aws-account-843109108289).
# `:=` and not `?=`, as in md's services/aws.mk: an exported AWS_PROFILE must not win silently.
# A command line still does (`make plan AWS_PROFILE=other`).
AWS_PROFILE := sergii
