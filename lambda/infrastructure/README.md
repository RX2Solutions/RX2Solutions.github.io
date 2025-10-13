# Infrastructure Capture and Redeployment Guide

This guide walks through capturing the existing AWS API Gateway and Lambda configuration so you can version it alongside the site and redeploy it reproducibly.

## Prerequisites
- AWS CLI v2 configured with an IAM user/role that can read and update API Gateway, Lambda, IAM, and CloudWatch Logs.
- Terraform (>= 1.5) or AWS SAM/CloudFormation CLI if you prefer. This document focuses on Terraform because it can import existing resources easily.
- jq (optional) for prettifying JSON output during discovery.

## Directory layout
```
lambda/
  infrastructure/
    main.tf          # Terraform configuration (to be committed)
    variables.tf     # Optional variables file
    terraform.tfvars # Workspace-specific values, keep out of version control
    README.md        # This file
```

## Step 1 – Create a Terraform skeleton
1. Initialise the Terraform working directory:
   ```bash
   cd lambda/infrastructure
   terraform init
   ```
2. Create a minimal `main.tf` describing the AWS provider and backend (S3/DynamoDB recommended for state). Example:
   ```hcl
   terraform {
     required_version = ">= 1.5"
     required_providers {
       aws = {
         source  = "hashicorp/aws"
         version = "~> 5.0"
       }
     }
     backend "s3" {}
   }

   provider "aws" {
     region = var.aws_region
   }
   ```
3. Define `variables.tf` with `aws_region` and any naming prefixes.

## Step 2 – Import existing Lambda functions
For each Lambda function you have (e.g., `contact`), run:
```bash
terraform import aws_lambda_function.contact <function-name>
```
Terraform will create a stub in your state. Run `terraform plan` to have Terraform show the attributes it discovered. Copy the displayed block into `main.tf`, removing read-only attributes (ARNs, timestamps). Repeat for each function. Remember to:
- Capture `filename`/`s3_bucket` references for the deployment package.
- Add `environment` blocks for variables.
- Reference IAM roles via separate `aws_iam_role` resources (import them similarly).

> Tip: Store Lambda source code in the appropriate subdirectory (e.g., `lambda/contact/`) and point Terraform at a zipped artifact created by a build script.

## Step 3 – Import the API Gateway
1. Export the current HTTP API or REST API definition:
   ```bash
   aws apigateway get-export \
     --parameters extensions='integrations' \
     --rest-api-id <api-id> \
     --stage-name <stage> \
     --export-type oas30 \
     api-gateway-export.json
   ```
   or, for API Gateway v2 (HTTP/ WebSocket):
   ```bash
   aws apigatewayv2 get-apis
   aws apigatewayv2 get-api --api-id <api-id> > api-gateway-v2.json
   aws apigatewayv2 get-integrations --api-id <api-id> | jq '.' > api-gateway-v2-integrations.json
   ```
2. Convert the exported OpenAPI spec into Terraform resources. You can either:
   - Use `aws_api_gateway_rest_api` with the `body` attribute pointing to the exported spec file, or
   - Model resources/methods individually. The spec-backed approach is faster for existing APIs.
3. Import the API and stages:
   ```bash
   terraform import aws_api_gateway_rest_api.primary <api-id>
   terraform import aws_api_gateway_stage.prod <api-id>/<stage-name>
   ```
4. Import any `aws_api_gateway_deployment`, `aws_api_gateway_integration`, or `aws_lambda_permission` resources required so Terraform manages them going forward.

## Step 4 – Capture IAM and supporting resources
- Import IAM roles, policies, and CloudWatch log groups used by the Lambdas.
- Document secrets or parameter values stored in SSM Parameter Store/Secrets Manager (never commit secrets; reference them via Terraform data sources).

## Step 5 – Document deployment workflow
Create a `DEPLOY.md` (example below) describing how to:
1. Package Lambda code (e.g., `zip -r ../artifacts/contact.zip .`).
2. Upload artifacts (S3 bucket or direct file reference).
3. Run `terraform plan` and `terraform apply` to deploy infrastructure.
4. Update API Gateway stages (if necessary).

## Step 6 – Version control and automation
- Commit Terraform configuration files and this documentation.
- Exclude `terraform.tfstate` and `.terraform/` directories via `.gitignore`.
- Optionally configure a CI workflow to run `terraform validate` and `terraform plan` on pull requests.

## Appendix – Quick reference commands
```bash
# List Lambda functions
aws lambda list-functions

# Show a specific function's configuration
aws lambda get-function-configuration --function-name <function-name>

# Tail logs
aws logs tail /aws/lambda/<function-name> --since 1h --follow

# Package Lambda (example for Node.js)
npm install
zip -r ../artifacts/contact.zip . -x "*.git*"
```

By keeping both the infrastructure code and deployment notes in this directory, you can rebuild the API Gateway and Lambda stack without manual console work.
