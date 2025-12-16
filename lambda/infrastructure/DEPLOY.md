# Deploying the Landing Backend

Quick guide to rebuild the Lambda artifacts and roll out infra changes (API Gateway, DynamoDB, IAM) with Terraform.

## 1) Package the Lambdas

From repo root:
```bash
# Landing opt-in (uses package.json script)
cd lambda/landing_opt_in
npm install
npm run package   # outputs ../artifacts/rx2LandingOptIn.zip

# Contact form (no dependencies beyond bundled AWS SDK)
cd ../rx2_submit_contact_form
zip -rq ../artifacts/rx2SubmitContactForm.zip . -x "*.git*" "*.DS_Store"
```

Confirm both zips are refreshed in `lambda/artifacts/`.

## 2) Apply Terraform

```bash
cd ../infrastructure
terraform init       # first time or when backend/providers change
terraform plan       # review drift and the zip hash updates
terraform apply      # deploys new Lambda code + any config changes
```

Terraform picks up the new zip hashes and updates the functions, API Gateway routes, IAM, and DynamoDB as declared in `main.tf`.

## 3) Verify

```bash
# Tail logs for the landing opt-in handler
aws logs tail /aws/lambda/rx2LandingOptIn --since 10m --follow

# Hit the API route (replace with real endpoint)
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/landingOptIn -d '{}' -H 'Content-Type: application/json'
```

## Notes
- Keep your `terraform.tfvars` (with any overrides) out of git.
- Ensure the Notion database has matching properties for phone and topics, or update `variables.tf` to reflect your schema before applying.
- Git push publishes the Jekyll site via GitHub Pages; backend updates require the steps above.
