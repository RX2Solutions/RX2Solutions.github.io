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

locals {
  landing_opt_in_route_suffix = trim(var.landing_opt_in_route_suffix, "/")
  landing_opt_in_route_path   = "/${local.landing_opt_in_route_suffix}"
}

resource "aws_lambda_function" "rx2_submit_contact_form" {
  architectures = [
    "x86_64",
  ]
  filename         = "${path.module}/../artifacts/rx2SubmitContactForm.zip"
  source_code_hash = filebase64sha256("${path.module}/../artifacts/rx2SubmitContactForm.zip")
  function_name    = "rx2SubmitContactForm"
  handler          = "index.handler"
  memory_size      = 128
  package_type     = "Zip"
  role             = "arn:aws:iam::642038304273:role/rx2LambdaContactFormRole"
  runtime          = "nodejs22.x"
  timeout          = 3

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

resource "aws_apigatewayv2_api" "rx2_contact_form" {
  name                       = "rx2ContactFormEndpoint"
  protocol_type              = "HTTP"
  route_selection_expression = "$request.method $request.path"
}

resource "aws_apigatewayv2_integration" "rx2_contact_form_post" {
  api_id                 = aws_apigatewayv2_api.rx2_contact_form.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.rx2_submit_contact_form.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_integration" "rx2_contact_form_options" {
  api_id                 = aws_apigatewayv2_api.rx2_contact_form.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.rx2_submit_contact_form.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "rx2_contact_form_post" {
  api_id             = aws_apigatewayv2_api.rx2_contact_form.id
  route_key          = "POST /rx2SubmitContactForm"
  authorization_type = "NONE"
  target             = "integrations/${aws_apigatewayv2_integration.rx2_contact_form_post.id}"
}

resource "aws_apigatewayv2_route" "rx2_contact_form_options" {
  api_id             = aws_apigatewayv2_api.rx2_contact_form.id
  route_key          = "OPTIONS /rx2SubmitContactForm"
  authorization_type = "NONE"
  target             = "integrations/${aws_apigatewayv2_integration.rx2_contact_form_options.id}"
}

resource "aws_apigatewayv2_stage" "rx2_contact_form_default" {
  api_id      = aws_apigatewayv2_api.rx2_contact_form.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "allow_apigw_invoke_rx2_contact_form" {
  statement_id  = "AllowAPIGatewayInvokeContactForm"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rx2_submit_contact_form.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.rx2_contact_form.execution_arn}/*/*/rx2SubmitContactForm"
}

resource "aws_dynamodb_table" "landing_opt_in" {
  name         = var.landing_opt_in_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "email"

  attribute {
    name = "email"
    type = "S"
  }
}

data "aws_iam_policy_document" "landing_opt_in_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "landing_opt_in" {
  name               = "${var.project_prefix}LandingOptInRole"
  assume_role_policy = data.aws_iam_policy_document.landing_opt_in_assume_role.json
}

resource "aws_iam_role_policy_attachment" "landing_opt_in_basic_execution" {
  role       = aws_iam_role.landing_opt_in.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "landing_opt_in" {
  statement {
    actions = [
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:GetItem",
      "dynamodb:DescribeTable",
    ]

    resources = [
      aws_dynamodb_table.landing_opt_in.arn,
    ]
  }

  statement {
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
    ]

    resources = [
      "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.notion_api_key_parameter_name}",
    ]
  }
}

resource "aws_iam_policy" "landing_opt_in" {
  name   = "${var.project_prefix}LandingOptInPolicy"
  policy = data.aws_iam_policy_document.landing_opt_in.json
}

resource "aws_iam_role_policy_attachment" "landing_opt_in_custom" {
  role       = aws_iam_role.landing_opt_in.name
  policy_arn = aws_iam_policy.landing_opt_in.arn
}

resource "aws_lambda_function" "landing_opt_in" {
  architectures    = ["x86_64"]
  filename         = "${path.module}/../artifacts/rx2LandingOptIn.zip"
  source_code_hash = filebase64sha256("${path.module}/../artifacts/rx2LandingOptIn.zip")
  function_name    = "${var.project_prefix}LandingOptIn"
  handler          = "index.handler"
  memory_size      = 256
  package_type     = "Zip"
  role             = aws_iam_role.landing_opt_in.arn
  runtime          = "nodejs22.x"
  timeout          = 10

  environment {
    variables = {
      ALLOWED_ORIGIN                = var.landing_opt_in_allowed_origin
      DYNAMO_TABLE_NAME             = aws_dynamodb_table.landing_opt_in.name
      NOTION_API_KEY_PARAMETER      = var.notion_api_key_parameter_name
      NOTION_DATABASE_ID            = var.notion_database_id
      NOTION_EMAIL_PROPERTY         = var.notion_email_property
      NOTION_NAME_PROPERTY          = var.notion_name_property
      NOTION_TITLE_PROPERTY         = var.notion_title_property
      NOTION_LINKEDIN_PROPERTY      = var.notion_linkedin_property
      NOTION_STAGE_PROPERTY         = var.notion_stage_property
      NOTION_STAGE_OPT_IN_VALUE     = var.notion_stage_opt_in_value
      NOTION_STAGE_PROFILE_COMPLETE = var.notion_stage_profile_complete_value
      NOTION_PAGE_NAME_PROPERTY     = var.notion_page_name_property
      NOTION_CONTENT_URL_PROPERTY   = var.notion_content_url_property
    }
  }

  ephemeral_storage {
    size = 512
  }

  logging_config {
    log_format = "Text"
    log_group  = "/aws/lambda/${var.project_prefix}LandingOptIn"
  }

  tracing_config {
    mode = "PassThrough"
  }
}

resource "aws_apigatewayv2_integration" "landing_opt_in_post" {
  api_id                 = aws_apigatewayv2_api.rx2_contact_form.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.landing_opt_in.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_integration" "landing_opt_in_options" {
  api_id                 = aws_apigatewayv2_api.rx2_contact_form.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.landing_opt_in.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "landing_opt_in_post" {
  api_id             = aws_apigatewayv2_api.rx2_contact_form.id
  route_key          = "POST ${local.landing_opt_in_route_path}"
  authorization_type = "NONE"
  target             = "integrations/${aws_apigatewayv2_integration.landing_opt_in_post.id}"
}

resource "aws_apigatewayv2_route" "landing_opt_in_options" {
  api_id             = aws_apigatewayv2_api.rx2_contact_form.id
  route_key          = "OPTIONS ${local.landing_opt_in_route_path}"
  authorization_type = "NONE"
  target             = "integrations/${aws_apigatewayv2_integration.landing_opt_in_options.id}"
}

resource "aws_lambda_permission" "allow_apigw_invoke_landing_opt_in" {
  statement_id  = "AllowAPIGatewayInvokeLandingOptIn"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.landing_opt_in.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.rx2_contact_form.execution_arn}/*/*${local.landing_opt_in_route_path}"
}
