#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/_site"
ENV_FILE="${STAGING_ENV_FILE:-$ROOT_DIR/.env.staging.local}"

if [[ -f "$ENV_FILE" ]]; then
  # Export vars from env file for this script process.
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if ! command -v bundle >/dev/null 2>&1; then
  echo "Error: bundler is required but was not found in PATH." >&2
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "Error: aws CLI is required but was not found in PATH." >&2
  exit 1
fi

if [[ -z "${STAGING_S3_BUCKET:-}" ]]; then
  echo "Error: set STAGING_S3_BUCKET (example: export STAGING_S3_BUCKET=rx2solutions-staging-site)." >&2
  exit 1
fi

if [[ -z "${STAGING_CLOUDFRONT_DISTRIBUTION_ID:-}" ]]; then
  echo "Error: set STAGING_CLOUDFRONT_DISTRIBUTION_ID (example: export STAGING_CLOUDFRONT_DISTRIBUTION_ID=E123ABC456DEF)." >&2
  exit 1
fi

INVALIDATION_PATHS="${STAGING_INVALIDATION_PATHS:-/*}"

AWS_PROFILE_ARGS=()
if [[ -n "${AWS_PROFILE:-}" ]]; then
  AWS_PROFILE_ARGS=(--profile "$AWS_PROFILE")
fi

aws_cli() {
  aws "${AWS_PROFILE_ARGS[@]}" "$@"
}

echo "Running AWS preflight checks..."
CALLER_ACCOUNT_ID="$(aws_cli sts get-caller-identity --query Account --output text)"
CALLER_ARN="$(aws_cli sts get-caller-identity --query Arn --output text)"

echo "Using AWS account: $CALLER_ACCOUNT_ID"
echo "Using AWS identity: $CALLER_ARN"

if [[ -n "${EXPECTED_AWS_ACCOUNT_ID:-}" ]] && [[ "$CALLER_ACCOUNT_ID" != "$EXPECTED_AWS_ACCOUNT_ID" ]]; then
  echo "Error: expected AWS account $EXPECTED_AWS_ACCOUNT_ID but CLI is authenticated to $CALLER_ACCOUNT_ID." >&2
  exit 1
fi

aws_cli s3api head-bucket --bucket "$STAGING_S3_BUCKET" >/dev/null
aws_cli cloudfront get-distribution --id "$STAGING_CLOUDFRONT_DISTRIBUTION_ID" >/dev/null

echo "AWS preflight checks passed."

echo "Building staging site with Jekyll..."
bundle exec jekyll build --config "$ROOT_DIR/_config.yml,$ROOT_DIR/_config.staging.yml"

echo "Syncing build output to s3://$STAGING_S3_BUCKET ..."
aws_cli s3 sync "$BUILD_DIR/" "s3://$STAGING_S3_BUCKET/" --delete

echo "Creating CloudFront invalidation for paths: $INVALIDATION_PATHS"
aws_cli cloudfront create-invalidation \
  --distribution-id "$STAGING_CLOUDFRONT_DISTRIBUTION_ID" \
  --paths "$INVALIDATION_PATHS" >/dev/null

echo "Staging deploy complete."
