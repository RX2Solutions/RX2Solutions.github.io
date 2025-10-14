terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "rx2solutions-terraform-state-prod"
    key            = "lambda/infrastructure/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.default_tags
  }
}

resource "aws_lambda_function" "rx2_submit_contact_form" {
  architectures = [
    "x86_64",
  ]
  filename                       = "${path.module}/../artifacts/rx2SubmitContactForm.zip"
  source_code_hash               = filebase64sha256("${path.module}/../artifacts/rx2SubmitContactForm.zip")
  function_name                  = "rx2SubmitContactForm"
  handler                        = "index.handler"
  memory_size                    = 128
  package_type                   = "Zip"
  role                           = "arn:aws:iam::642038304273:role/rx2LambdaContactFormRole"
  runtime                        = "nodejs22.x"
  timeout                        = 3

  ephemeral_storage {
    size = 512
  }

  logging_config {
    application_log_level = null
    log_format            = "Text"
    log_group             = "/aws/lambda/rx2SubmitContactForm"
    system_log_level      = null
  }

  tracing_config {
    mode = "PassThrough"
  }
}