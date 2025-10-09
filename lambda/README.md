# AWS Lambda Functions

This directory houses the source code for the serverless endpoints that support the site (for example, form submissions from landing pages). Because `_config.yml` excludes this folder, the contents will never be published to `_site` or the live site.

## Suggested structure
- `contact/` – existing contact form Lambda
- `landing-form/` – Lambda for landing page submissions
- `shared/` – optional shared utilities

Feel free to adapt the layout to match your deployment tooling (SAM, Serverless Framework, plain Terraform, etc.). Include any infrastructure or deployment scripts you rely on so the Lambdas remain reproducible.

> Tip: add a brief `README.md` inside each Lambda subdirectory with environment variables, packaging commands, and the AWS resources it interacts with.
