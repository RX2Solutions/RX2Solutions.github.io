variable "aws_region" {
  type        = string
  description = "AWS region to deploy infrastructure resources (e.g., us-east-1)."
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Short label for the deployment environment (dev, staging, prod)."
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], lower(var.environment))
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "project_prefix" {
  type        = string
  description = "Prefix applied to resource names to avoid collisions."
  default     = "rx2"
}

variable "default_tags" {
  type        = map(string)
  description = "Base set of tags applied to taggable resources."
  default = {
    Project   = "rx2solutions"
    ManagedBy = "terraform"
  }
}
