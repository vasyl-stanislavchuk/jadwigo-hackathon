variable "bucket_name" {
  description = "The content bucket: the bank's Khan pull under khan/, the derived questions/<source>/<id>.json, and the next library beside Khan"
  type        = string
  default     = "jadwigo-content-843109108289"
}

variable "noncurrent_days" {
  description = "Days an overwritten or deleted object's old version is kept before it expires"
  type        = number
  default     = 30
}

variable "bucket_param" {
  description = "The SSM String parameter that carries the bucket's name to the bank's tools"
  type        = string
  default     = "/jadwigo/bank/content-bucket"
}

variable "media_url_param" {
  description = "The SSM String parameter that carries the media distribution's https URL to the player and the playground"
  type        = string
  default     = "/jadwigo/bank/media-url"
}
