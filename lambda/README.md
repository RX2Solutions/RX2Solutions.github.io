# AWS Lambda Functions

This directory houses the source code for the serverless endpoints that support the site (for example, form submissions from landing pages). Because `_config.yml` excludes this folder, the contents will never be published to `_site` or the live site.

## Suggested structure
- `contact/` – existing contact form Lambda
- `landing-form/` – Lambda for landing page submissions
- `shared/` – optional shared utilities

Feel free to adapt the layout to match your deployment tooling (SAM, Serverless Framework, plain Terraform, etc.). Include any infrastructure or deployment scripts you rely on so the Lambdas remain reproducible.

> Tip: add a brief `README.md` inside each Lambda subdirectory with environment variables, packaging commands, and the AWS resources it interacts with.

## Documenting the live infrastructure

If you already have API Gateway stages and Lambda functions running in AWS, capture their configuration so the setup is rebuildable without console clicks. The [`infrastructure/`](infrastructure/) directory contains a step-by-step guide for importing the current resources into Terraform, exporting the API definition, and documenting your deployment workflow.

Start by following [`infrastructure/README.md`](infrastructure/README.md) to:

1. Export the API Gateway definition in OpenAPI format.
2. Import existing Lambda functions, IAM roles, and API Gateway resources into Terraform state.
3. Record packaging commands and environment variables alongside the source code.
4. Automate deployments with `terraform plan`/`apply` or your preferred IaC tool.

Once these steps are complete, commit the Terraform configuration and deployment notes so the infrastructure can be redeployed alongside the website.
