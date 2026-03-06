variable "aws_region" {
  type        = string
  description = "AWS region for the S3 bucket and Route 53 lookups. CloudFront ACM is always provisioned in us-east-1."
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Short environment label used in names and tags."
  default     = "staging"
}

variable "project_prefix" {
  type        = string
  description = "Prefix applied to named resources."
  default     = "rx2"
}

variable "domain_name" {
  type        = string
  description = "Full DNS name for the staging site."
  default     = "rx2solutions-staging.instantbrains.com"
}

variable "hosted_zone_name" {
  type        = string
  description = "Public Route 53 zone that should contain the staging record."
  default     = "instantbrains.com"
}

variable "bucket_name" {
  type        = string
  description = "Optional explicit S3 bucket name. Leave empty to derive one from the domain and account id."
  default     = ""
}

variable "price_class" {
  type        = string
  description = "CloudFront price class."
  default     = "PriceClass_100"
}

variable "default_tags" {
  type        = map(string)
  description = "Additional tags applied to managed resources."
  default     = {}
}