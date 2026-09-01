/**
 * RX2 Solutions — contact form -> Notion.
 *
 * POST only. Accepts application/x-www-form-urlencoded (the site form) and
 * application/json. Validates required fields, silently drops honeypot hits,
 * writes a page into the Notion database, then 303-redirects the visitor to
 * /thanks.html on the site.
 *
 * Secrets (wrangler secret put): NOTION_TOKEN, NOTION_DATABASE_ID
 * Vars (wrangler.jsonc):         SITE_ORIGIN
 */

const NOTION_VERSION = "2022-06-28";

// ---------------------------------------------------------------------------
// TODO(Rob): confirm these against the real Notion database before deploy.
// Keys on the left are the form field names; each entry maps to a property
// NAME and TYPE in the Notion database. If the database uses different
// property names, change ONLY this table.
// ---------------------------------------------------------------------------
const NOTION_PROPERTIES = {
  name:    { property: "Name",    type: "title" },
  email:   { property: "Email",   type: "email" },
  company: { property: "Company", type: "rich_text" },
  help:    { property: "Interested In", type: "select" },
  message: { property: "Message", type: "rich_text" },
};

const REQUIRED_FIELDS = ["name", "email", "help"];
const HONEYPOT_FIELD = "company_website";
const MAX_FIELD_LENGTH = 4000;
// Pragmatic email shape check — the real validation is that a human replies.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.SITE_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function textResponse(env, status, message) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders(env) },
  });
}

/** Read the submission whether it arrives form-encoded or as JSON. */
async function readSubmission(request) {
  const contentType = (request.headers.get("Content-Type") || "").toLowerCase();
  const fields = {};
  if (contentType.includes("application/json")) {
    const body = await request.json();
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === "string") fields[k] = v;
    }
  } else {
    const form = await request.formData();
    for (const [k, v] of form.entries()) {
      if (typeof v === "string") fields[k] = v;
    }
  }
  for (const k of Object.keys(fields)) {
    fields[k] = fields[k].trim().slice(0, MAX_FIELD_LENGTH);
  }
  return fields;
}

function buildNotionProperties(fields) {
  const props = {};
  for (const [field, map] of Object.entries(NOTION_PROPERTIES)) {
    const value = fields[field];
    if (!value) continue;
    switch (map.type) {
      case "title":
        props[map.property] = { title: [{ text: { content: value } }] };
        break;
      case "email":
        props[map.property] = { email: value };
        break;
      case "select":
        props[map.property] = { select: { name: value } };
        break;
      case "rich_text":
      default:
        props[map.property] = { rich_text: [{ text: { content: value } }] };
        break;
    }
  }
  return props;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }
    if (request.method !== "POST") {
      return textResponse(env, 405, "Method not allowed.");
    }

    let fields;
    try {
      fields = await readSubmission(request);
    } catch (err) {
      console.log(JSON.stringify({ event: "bad_body", error: String(err) }));
      return textResponse(env, 400, "Could not read the submission.");
    }

    // Honeypot: bots fill it, humans never see it. Pretend success, write nothing.
    if (fields[HONEYPOT_FIELD]) {
      console.log(JSON.stringify({ event: "honeypot_drop" }));
      return Response.redirect(`${env.SITE_ORIGIN}/thanks.html`, 303);
    }

    const missing = REQUIRED_FIELDS.filter((f) => !fields[f]);
    if (missing.length > 0) {
      return textResponse(env, 400, `Missing required field(s): ${missing.join(", ")}.`);
    }
    if (!EMAIL_RE.test(fields.email)) {
      return textResponse(env, 400, "That email address doesn't look right.");
    }

    const payload = {
      parent: { database_id: env.NOTION_DATABASE_ID },
      properties: buildNotionProperties(fields),
    };

    let notionResponse;
    try {
      notionResponse = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.NOTION_TOKEN}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.log(JSON.stringify({ event: "notion_unreachable", error: String(err) }));
      return textResponse(env, 502, "We couldn't record your message just now. Please email info@rx2solutions.com.");
    }

    if (!notionResponse.ok) {
      const detail = await notionResponse.text();
      console.log(JSON.stringify({ event: "notion_error", status: notionResponse.status, detail: detail.slice(0, 500) }));
      return textResponse(env, 502, "We couldn't record your message just now. Please email info@rx2solutions.com.");
    }

    // Drain the success body off the critical path.
    ctx.waitUntil(notionResponse.arrayBuffer());
    console.log(JSON.stringify({ event: "lead_recorded", help: fields.help || "" }));
    return Response.redirect(`${env.SITE_ORIGIN}/thanks.html`, 303);
  },
};
