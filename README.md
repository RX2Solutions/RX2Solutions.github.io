# rx2solutions-com
RX2 Solutions website — GitHub Pages + Jekyll.
- Actively uses Jekyll blog features (`_posts/`).
- Theme: Trax (ThemeForest), hand‑converted from HTML to Jekyll layouts/includes as needed.
- Local build: `bundle exec jekyll build`.
- Note: GitHub Pages pins gem versions; use the `github-pages` gem for local parity.

## Staging Deploy (AWS S3 + CloudFront)

Production deploy behavior remains unchanged:
- Pushes to `main` continue to publish via GitHub Pages.

Staging deploy is intentionally separate and uses a local build artifact (`_site/`) published to AWS:
- Staging URL: `https://rx2solutions-staging.instantbrains.com`
- Jekyll staging config: `_config.staging.yml`
- Local deploy script: `scripts/deploy-staging.sh`
- Infrastructure bootstrap script: `scripts/provision-staging-site.sh`
- Terraform stack: `infrastructure/staging-site/`
- Optional GitHub Actions manual deploy: `.github/workflows/deploy-staging.yml`

### Why S3 + CloudFront

S3 is still a recommended static origin when paired with CloudFront. The modern pattern is:
- Private S3 bucket as origin
- CloudFront distribution in front of it
- TLS certificate in ACM
- DNS record (`rx2solutions-staging.instantbrains.com`) pointing to CloudFront

### One-time AWS Setup

1. Create an S3 bucket for staging site assets (private, versioning enabled).
2. Create a CloudFront distribution with the S3 bucket as origin.
3. Add Origin Access Control (OAC) so CloudFront can read the private bucket.
4. Add ACM cert for `rx2solutions-staging.instantbrains.com` and attach it to CloudFront.
5. Point DNS for `rx2solutions-staging.instantbrains.com` to CloudFront.
6. Grant deploy identity least-privilege permissions:
	- `s3:ListBucket` on the bucket
	- `s3:PutObject`, `s3:DeleteObject`, `s3:GetObject` on bucket objects
	- `cloudfront:CreateInvalidation` on the staging distribution

Those resources can now be provisioned in this repo with:

```bash
./scripts/provision-staging-site.sh
```

The provisioning script will create `infrastructure/staging-site/terraform.tfvars` if needed, run Terraform, and write `.env.staging.local` from the resulting outputs.

### Local Staging Deploy

Preferred: store deploy values in a local untracked file at `.env.staging.local`.

1. Create your local file from the example:

```bash
cp .env.staging.local.example .env.staging.local
```

2. Edit `.env.staging.local` with your real values.

The deploy script auto-loads `.env.staging.local` by default. You can override with `STAGING_ENV_FILE` if needed.
For safety across multiple machines or AWS profiles, set `EXPECTED_AWS_ACCOUNT_ID` in that file so deploys fail if your CLI is pointed at the wrong account.

Alternative: set environment variables in your shell:

```bash
export STAGING_S3_BUCKET="<your-staging-bucket>"
export STAGING_CLOUDFRONT_DISTRIBUTION_ID="<your-distribution-id>"

# Optional: use a named AWS profile and custom invalidation paths
export EXPECTED_AWS_ACCOUNT_ID="<12-digit-account-id>"
export AWS_PROFILE="<your-aws-profile>"
export STAGING_INVALIDATION_PATHS="/*"
```

Run deploy:

```bash
./scripts/deploy-staging.sh
```

What the script does:
1. Verifies the active AWS identity with `sts get-caller-identity`
2. Optionally enforces `EXPECTED_AWS_ACCOUNT_ID`
3. Confirms access to the target S3 bucket and CloudFront distribution
4. Builds with `bundle exec jekyll build --config _config.yml,_config.staging.yml`
5. Syncs `_site/` to S3 with `--delete`
6. Invalidates CloudFront paths (defaults to `/*`)

### Optional GitHub Action Staging Deploy

Use the `Deploy Staging Site` workflow (`workflow_dispatch`) to deploy a specific ref from GitHub.

Required repository secrets:
- `AWS_STAGING_REGION`
- `AWS_STAGING_ROLE_ARN` (OIDC role assumed by GitHub Actions)
- `AWS_STAGING_S3_BUCKET`
- `AWS_STAGING_CLOUDFRONT_DISTRIBUTION_ID`

The workflow keeps production behavior untouched and only runs when manually triggered.

## Landing Page Colorways

Landing pages (`_landing_pages/*` rendered with `_layouts/landing.html`) now support six curated colorways. Set `colorway` in the page front matter to swap palettes; omit it to use the default `cream`.

Available options:
1. `cream` – current beige/amber palette.
2. `sage` – soft green base with gold CTAs.
3. `dusk` – muted indigo with warm accent buttons.
4. `slate` – cool gray-blue with bold cobalt accents.
5. `ember` – warm terracotta with saffron CTAs.
6. `ocean` – airy teal with sunshine button highlights.

Example:

```yaml
---
title: Example Landing Page
colorway: sage
---
```

## Manual Blog Pagination (Important)

This site intentionally avoids non-whitelisted plugins so it builds on GitHub Pages without Actions. As a result, blog pagination is implemented manually in `_includes/blog.html` and by maintaining numbered index pages for each tag we display:

- Articles (posts tagged `publication`): `articles.html`, `articles2.html`, `articles3.html`, ...
- Announcements (posts tagged `announcement`): `announcements.html`, `announcements2.html`, `announcements3.html`, ...

Each numbered page is a tiny file with front matter only, setting `this_page` to the appropriate page number. Example for page 3:

```
---
layout: default
title: Blog
desired-tag: publication
this_page: 3
---
{% include blog.html %}
```

The `_includes/blog.html` file controls how many posts appear per page. Currently:

- Posts per page: 9
- Filter by tag using `page.desired-tag`

When to add more pages
- If the number of posts for a given tag grows so that page N fills up, add the next page by copying the previous file and incrementing `this_page`. For example, if `articles5.html` fills up, add `articles6.html` with `this_page: 6`. Do the same for announcements if needed.

Notes
- GitHub Pages does not support `jekyll-paginate-v2`. Keeping this manual approach ensures that commits of new files to `_posts/` by editors are all that’s required—no local builds or Actions are needed.
- The navigation currently links to Articles via `/articles.html`. Announcements are available at `/announcements.html` but may not be linked in the main nav.
