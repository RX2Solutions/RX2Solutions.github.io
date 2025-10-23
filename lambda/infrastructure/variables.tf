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

variable "landing_opt_in_allowed_origin" {
  type        = string
  description = "Allowed CORS origin for landing opt-in submissions."
  default     = "https://rx2solutions.com"
}

variable "landing_opt_in_table_name" {
  type        = string
  description = "DynamoDB table name for landing opt-in submissions."
  default     = "rx2LandingOptIn"
}

variable "landing_opt_in_route_suffix" {
  type        = string
  description = "Path segment appended to the API Gateway route for landing opt-in submissions."
  default     = "landingOptIn"
}

variable "notion_api_key_parameter_name" {
  type        = string
  description = "SSM Parameter Store name containing the Notion API key used by the landing opt-in Lambda."
  default     = "/rx2/landing/notion/api_key"
}

variable "notion_database_id" {
  type        = string
  description = "Notion database ID that stores landing opt-in submissions."
}

variable "notion_email_property" {
  type        = string
  description = "Notion property name that stores the email address."
  default     = "Email"
}

variable "notion_name_property" {
  type        = string
  description = "Notion property name that stores the subscriber's full name."
  default     = "Full Name"
}

variable "notion_title_property" {
  type        = string
  description = "Notion title property used when creating new database rows."
  default     = "Name"
}

variable "notion_linkedin_property" {
  type        = string
  description = "Notion property name that stores the LinkedIn URL."
  default     = "LinkedIn"
}

variable "notion_stage_property" {
  type        = string
  description = "Notion property name that captures the submission stage."
  default     = "Stage"
}

variable "notion_page_name_property" {
  type        = string
  description = "Notion property name that stores the landing page or offer name."
  default     = "Landing Page"
}

variable "notion_content_url_property" {
  type        = string
  description = "Notion property name that stores the content or download URL shared with the subscriber."
  default     = "Content URL"
}

variable "notion_stage_opt_in_value" {
  type        = string
  description = "Notion stage value applied after the initial opt-in submission."
  default     = "Opt-In"
}

variable "notion_stage_profile_complete_value" {
  type        = string
  description = "Notion stage value applied after profile completion."
  default     = "Profile Complete"
}
