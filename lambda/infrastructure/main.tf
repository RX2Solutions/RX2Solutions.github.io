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
