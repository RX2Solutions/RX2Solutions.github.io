# Infrastructure Capture & Redeployment Guide

These instructions walk you through pulling your existing AWS Lambda + API Gateway stack into Terraform so it lives beside the site and can be redeployed without console clicks.

---

## Prerequisites
- **AWS CLI v2** authenticated as a user/role that can manage Lambda, API Gateway, IAM, CloudWatch Logs, S3, and DynamoDB.
- **Terraform ≥ 1.5** installed locally (`terraform -v` to verify).
- **jq** (optional) for formatting JSON during discovery.

> Terminology: anything shown as `<placeholder>` means “replace the whole thing (including the brackets) with your real value.”

---

## Directory Layout
```
lambda/
  infrastructure/
    main.tf          # Terraform configuration (checked in)
    variables.tf     # Input variables (checked in)
    terraform.tfvars # Your local values (keep out of git)
    README.md        # This file
```

---

## Step 1 – Prepare Remote State (recommended)
Terraform needs a place to store its state file. You can keep it local, but S3 + DynamoDB gives you locking and history.

```bash
# 1. Pick a globally unique bucket name
STATE_BUCKET="rx2solutions-terraform-state-prod"
STATE_REGION="us-east-1"
LOCK_TABLE="terraform-locks"

# 2. Create the S3 bucket (omit LocationConstraint for us-east-1)
aws s3api create-bucket \
  --bucket "$STATE_BUCKET" \
  --region "$STATE_REGION"

# 3. Enable bucket versioning so you can recover older states
aws s3api put-bucket-versioning \
  --bucket "$STATE_BUCKET" \
  --versioning-configuration Status=Enabled

# 4. Create the DynamoDB lock table
aws dynamodb create-table \
  --table-name "$LOCK_TABLE" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

Update `main.tf` with the backend details (replace placeholders with the actual values you chose):

```hcl
terraform {
  backend "s3" {
    bucket         = "rx2solutions-terraform-state-prod"
    key            = "lambda/infrastructure/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

> Need to move fast? Use `backend "local" {}` for now, then switch to S3 later.

---

## Step 2 – Configure Variables
`variables.tf` already defines:

- `aws_region`
- `environment`
- `project_prefix`
- `default_tags`

Create a local `terraform.tfvars` (never commit it) with the values you use most:

```hcl
aws_region     = "us-east-1"
environment    = "prod"
project_prefix = "rx2"
default_tags = {
  Project   = "RX2 Solutions"
  ManagedBy = "terraform"
}
```

---

## Step 3 – Initialise & Validate Terraform
```bash
cd lambda/infrastructure
terraform init     # Downloads providers + connects to remote state
terraform fmt      # Optional: keeps files tidy
terraform validate # Confirms the syntax is sound
```

If `init` complains about the backend, double-check the section above or temporarily switch to the local backend.

---

## Step 4 – Import Existing Lambda Functions

1. **Create a stub resource** in `main.tf` for each Lambda you plan to import. The block can be empty to start, but the name inside Terraform must be lowercase with underscores. Example:
   ```hcl
   resource "aws_lambda_function" "rx2_submit_contact_form" {}
   ```

2. **Import the function** by replacing the placeholders with your resource names. In zsh (and bash) brackets are interpreted, so type the real name with no `<` or `>`:
   ```bash
   terraform import \
     aws_lambda_function.rx2_submit_contact_form \
     rx2SubmitContactForm
   ```
   - `aws_lambda_function.rx2_submit_contact_form` → the resource address from step 1.
   - `rx2SubmitContactForm` → the exact Lambda function name in AWS.
   - Quoting the second argument is fine if your function name has spaces (rare): `"My Function"`.

3. **Inspect what was imported**:
   ```bash
   terraform state show aws_lambda_function.rx2_submit_contact_form
   ```
   Copy the attributes Terraform displays into your `main.tf`, removing read-only fields (ARNs, timestamps, `last_modified`, etc.). Once the block matches reality, future `plan` runs will be clean.

4. **Repeat** for every Lambda. Resource names must be unique per file, so use predictable suffixes (e.g., `_handler`, `_processor`).

---

## Step 5 – Import API Gateway Resources

1. **Discover your APIs**:
   ```bash
   aws apigateway get-rest-apis           # For REST (v1)
   aws apigatewayv2 get-apis              # For HTTP/WebSocket (v2)
   ```

2. **Export the definition** (choose the command that matches your API type):
   ```bash
   # REST API (v1)
   aws apigateway get-export \
     --parameters extensions='integrations' \
     --rest-api-id a1b2c3d4 \
     --stage-name prod \
     --export-type oas30 \
     api-gateway-export.json

   # HTTP API (v2)
   aws apigatewayv2 get-api --api-id a1b2c3d4 > api-gateway-v2.json
   aws apigatewayv2 get-integrations --api-id a1b2c3d4 | jq '.' > api-gateway-v2-integrations.json
   ```

3. **Add Terraform resources** using either:
   - A single `aws_api_gateway_rest_api` block that loads the OpenAPI file, or
   - Individual resources (`aws_api_gateway_resource`, `aws_api_gateway_method`, etc.) if you prefer to model them manually.

4. **Import each resource** with the IDs from AWS:
   ```bash
   terraform import aws_api_gateway_rest_api.primary a1b2c3d4
   terraform import aws_api_gateway_stage.prod        a1b2c3d4/prod
   ```

5. **Bring in supporting pieces** (`aws_api_gateway_deployment`, `aws_api_gateway_integration`, `aws_lambda_permission`, etc.) the same way: create a stub, run `terraform import`, then copy the arguments that Terraform discovered.

---

## Step 6 – Capture IAM, Logs, and Other Dependencies
- **IAM Roles/Policies**: import any execution roles and inline policies the Lambdas reference.
- **CloudWatch Log Groups**: import existing `/aws/lambda/<function-name>` groups.
- **Secrets/Parameters**: document SSM Parameter Store or Secrets Manager entries and reference them via Terraform data sources (never commit actual secrets).

---

## Step 7 – Document How to Deploy
Create `lambda/infrastructure/DEPLOY.md` with:
1. Commands to build and zip each Lambda (`zip -r ../artifacts/contact.zip .`).
2. How artifacts get to S3 (if applicable).
3. The Terraform workflow (`terraform plan`, review, then `terraform apply`).
4. Post-deploy verification steps (e.g., hit healthcheck endpoints, tail logs).

---

## Appendix – Quick Reference
```bash
# List Lambda functions
aws lambda list-functions

# Show configuration for one function
aws lambda get-function-configuration --function-name rx2SubmitContactForm

# Tail Lambda logs (Ctrl+C to stop)
aws logs tail /aws/lambda/rx2SubmitContactForm --since 1h --follow

# Package a Node.js Lambda (run from the function directory)
npm install
zip -r ../artifacts/rx2SubmitContactForm.zip . -x "*.git*"
```

Keep iterating on the Terraform files until `terraform plan` reports “No changes.” That’s your signal that the configuration accurately represents what’s running in AWS. Once you reach that baseline, future changes can be made safely through code.
