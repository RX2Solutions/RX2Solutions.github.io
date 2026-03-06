# Staging Static Site Infrastructure

This Terraform stack provisions the AWS resources required for the staging Jekyll site:

- Private S3 bucket for site assets
- CloudFront distribution with Origin Access Control (OAC)
- ACM certificate in `us-east-1`
- Route 53 `A` and `AAAA` alias records for `rx2solutions-staging.instantbrains.com`

## Files

- `main.tf` - resource definitions
- `variables.tf` - input variables
- `outputs.tf` - values consumed by local deploy tooling
- `terraform.tfvars` - local, untracked values copied from the example

## First Run

```bash
cd infrastructure/staging-site
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

## Wrapper Script

From the repo root you can use:

```bash
./scripts/provision-staging-site.sh
```

That script will:

1. Generate `terraform.tfvars` if it does not exist
2. Run `terraform init`
3. Run `terraform apply`
4. Write `.env.staging.local` from Terraform outputs

## Notes

- CloudFront certificates must be created in `us-east-1`, which this stack handles automatically.
- The first apply can take several minutes because ACM validation and CloudFront deployment are asynchronous.
- The Route 53 hosted zone for `instantbrains.com` must live in the same AWS account or be readable through your current AWS credentials.