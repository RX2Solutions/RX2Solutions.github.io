# rx2-contact-form Worker

Receives POSTs from the site contact form (`/contactus.html`) and upserts a
row in the RX2 Notion contacts database (matched by email, so a repeat
inquirer updates their row instead of duplicating it). Stores name, company,
email, help topic, and message. Honeypot submissions are dropped silently;
real ones 303-redirect the visitor to `/thanks.html`.

The Notion database needs these properties (or edit `NOTION_PROPERTIES` in
`src/index.js` to match your names):

| Property      | Type  |
| ------------- | ----- |
| Name          | Title |
| Email         | Email |
| Company       | Text  |
| Interested In | Text  |
| Message       | Text  |

## One-time setup (Rob)

1. Create a free Cloudflare account (DNS does NOT move).
2. In Notion: Settings -> Integrations -> create an **internal** integration,
   copy its secret.
3. Share the target Notion database with that integration (Share -> invite
   the integration).
4. Confirm the property names in `src/index.js` (`NOTION_PROPERTIES`) match
   the database's actual columns — names AND types (title / email / select /
   rich_text).

## Deploy

```
cd worker
npm install -g wrangler   # or use npx wrangler
wrangler login
wrangler secret put NOTION_TOKEN
wrangler secret put NOTION_DATABASE_ID
wrangler deploy
```

`wrangler deploy` prints the Worker URL (e.g.
`https://rx2-contact-form.<account>.workers.dev`).

## Wire the site to it

Set in the repo's `_config.yml`:

```yaml
contact_form_worker_url: https://rx2-contact-form.<account>.workers.dev
```

and rebuild/deploy the site. Until that key is set, the form's Send button
shows the internal-build notice and submits nothing.

## Test end to end

1. Submit the live form with real-looking data -> row appears in Notion,
   browser lands on /thanks.html.
2. Fill the hidden `company_website` field via devtools and submit -> no row,
   still lands on /thanks.html.

## Notes

- CORS allows only `SITE_ORIGIN` (set in `wrangler.jsonc`).
- Secrets live in Worker secrets, never in this repo.
- Subscribe forms are NOT handled here — they go to the newsletter platform
  once one is chosen (beehiiv / EmailOctopus).
