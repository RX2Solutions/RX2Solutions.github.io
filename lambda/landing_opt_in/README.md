# Landing Opt-In Lambda

Serverless handler that coordinates the two-step landing page opt-in workflow:

- Persists submissions into DynamoDB so we can reconcile repeated visits.
- Mirrors the data into a Notion database for downstream nurture.
- Responds with JSON that the landing page script uses to finish the UX.

The Lambda is wired to the API Gateway route added in `lambda/infrastructure/main.tf` (`POST /${var.landing_opt_in_route_suffix}`).

## Environment Variables

The Terraform module injects the required variables; below is the canonical list in case you need to run locally (`aws-vault exec <profile> -- node --watch src/index.mjs`, etc.).

| Variable | Purpose |
| --- | --- |
| `DYNAMO_TABLE_NAME` | Target table for persisting submissions. |
| `ALLOWED_ORIGIN` | Domain allowed for CORS replies (defaults to `https://rx2solutions.com`). |
| `NOTION_API_KEY_PARAMETER` | SSM parameter name that stores the Notion integration secret. |
| `NOTION_DATABASE_ID` | Destination Notion database ID. |
| `NOTION_TITLE_PROPERTY` | Notion title property (e.g. `Name`). |
| `NOTION_EMAIL_PROPERTY` | Notion email property (e.g. `Email`). |
| `NOTION_NAME_PROPERTY` | Rich text property that stores the subscriber's full name. |
| `NOTION_LINKEDIN_PROPERTY` | URL property for LinkedIn profile links. |
| `NOTION_PAGE_NAME_PROPERTY` | Rich text property representing the landing page name. |
| `NOTION_CONTENT_URL_PROPERTY` | URL property containing the gated asset link. |
| `NOTION_STAGE_PROPERTY` | Select property that tracks the workflow stage (`Opt-In`, `Profile Complete`, etc.). |
| `NOTION_STAGE_OPT_IN_VALUE` | Select option applied after the first form submission. |
| `NOTION_STAGE_PROFILE_COMPLETE` | Select option applied after the profile modal. |

> The Lambda expects the Notion database to expose properties with the types noted above. Update the Terraform defaults if your schema differs.

## Packaging

The function runs as a plain Node.js deployment package:

```bash
cd lambda/landing_opt_in
npm install                 # first run – captures node_modules
npm run package             # zips the handler + dependencies into ../artifacts/rx2LandingOptIn.zip
```

The `package` script wraps `npm install --omit=dev` to ensure only production dependencies are bundled. Re-run it anytime you change source code or dependencies.

## Local Testing

You can invoke the handler with an AWS-style event JSON. Example (fake values – update with a real API Gateway payload):

```bash
AWS_REGION=us-east-1 \
DYNAMO_TABLE_NAME=rx2LandingOptIn \
ALLOWED_ORIGIN=http://localhost:4000 \
NOTION_API_KEY_PARAMETER=/rx2/landing/notion/api_key \
NOTION_DATABASE_ID=<notion-db-id> \
node --loader ts-node/esm \
  -e 'import("./src/index.mjs").then(({ handler }) => handler({ requestContext: { http: { method: "POST" } }, body: JSON.stringify({ email: "optin@example.com", submission_stage: "opt_in" }) })).then(console.log)'
```

For more realistic end-to-end verification, deploy with Terraform and hit the HTTP API using `curl` or the landing page UI.
