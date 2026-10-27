locals {
  tags = {
    project     = "jadwigo"
    environment = var.environment
    managed_by  = "terraform"
    repo        = "jadwigo-hackathon"
  }
}
