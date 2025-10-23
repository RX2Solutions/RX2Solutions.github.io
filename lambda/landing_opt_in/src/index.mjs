import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { Client as NotionClient } from "@notionhq/client";

const tableName = process.env.DYNAMO_TABLE_NAME;
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
const notionDatabaseId = process.env.NOTION_DATABASE_ID;
const emailProperty = process.env.NOTION_EMAIL_PROPERTY;
const nameProperty = process.env.NOTION_NAME_PROPERTY;
const titleProperty = process.env.NOTION_TITLE_PROPERTY || "Name";
const linkedinProperty = process.env.NOTION_LINKEDIN_PROPERTY;
const stageProperty = process.env.NOTION_STAGE_PROPERTY;
const pageNameProperty = process.env.NOTION_PAGE_NAME_PROPERTY;
const contentUrlProperty = process.env.NOTION_CONTENT_URL_PROPERTY;
const stageOptInValue = process.env.NOTION_STAGE_OPT_IN_VALUE || "Opt-In";
const stageProfileCompleteValue = process.env.NOTION_STAGE_PROFILE_COMPLETE || "Profile Complete";
const notionApiKeyParameter = process.env.NOTION_API_KEY_PARAMETER;

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ apiVersion: "2012-08-10" }),
  { marshallOptions: { removeUndefinedValues: true } }
);
const ssmClient = new SSMClient({});

let notionClientPromise;

const STAGE_OPT_IN = "opt_in";
const STAGE_PROFILE_COMPLETION = "profile_completion";

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || event?.httpMethod || "GET";

  if (method === "OPTIONS") {
    return buildResponse(200, null, { allowCredentials: false });
  }

  if (method !== "POST") {
    return buildResponse(405, { error: "Method Not Allowed" });
  }

  try {
    assertRequiredEnv();

    const payload = await parseEventBody(event);
    const submissionStage = normaliseStage(payload.submission_stage);

    if (payload.confirm_email && payload.confirm_email.trim().length > 0) {
      return buildResponse(204, null);
    }

    const email = normaliseEmail(payload.email);
    if (!email) {
      return buildResponse(400, { error: "A valid email address is required." });
    }

    const pageName = normaliseText(payload.page_name, 128);
    const contentUrl = normaliseUrl(payload.content_url);

    if (submissionStage === STAGE_OPT_IN) {
      const record = await updateSubscriberRecord({
        email,
        stage: submissionStage,
        pageName,
        contentUrl,
      });

      const notionPageId = await syncNotion({
        email,
        stage: submissionStage,
        pageName,
        contentUrl,
        existingNotionPageId: record?.notionPageId,
      });

      if (notionPageId && notionPageId !== record?.notionPageId) {
        await updateSubscriberRecord({
          email,
          notionPageId,
          skipStageUpdate: true,
        });
      }

      return buildResponse(200, {
        message: "You're on the list. Check your inbox for the download link shortly.",
      });
    }

    const fullName = normaliseText(payload.full_name, 128);
    const linkedinUrl = normaliseLinkedInUrl(payload.linkedin_url);

    if (!fullName) {
      return buildResponse(400, { error: "Full name is required to unlock the download." });
    }

    if (!linkedinUrl) {
      return buildResponse(400, { error: "Please provide a valid LinkedIn profile URL." });
    }

    const record = await updateSubscriberRecord({
      email,
      stage: submissionStage,
      fullName,
      linkedinUrl,
      pageName,
      contentUrl,
    });

    const notionPageId = await syncNotion({
      email,
      stage: submissionStage,
      fullName,
      linkedinUrl,
      pageName,
      contentUrl,
      existingNotionPageId: record?.notionPageId,
    });

    if (notionPageId && notionPageId !== record?.notionPageId) {
      await updateSubscriberRecord({
        email,
        notionPageId,
        skipStageUpdate: true,
      });
    }

    const responsePayload = {
      message: "Profile updated. The download link is on its way to your inbox.",
    };

    if (contentUrl) {
      responsePayload.redirectUrl = contentUrl;
    }

    return buildResponse(200, responsePayload);
  } catch (error) {
    console.error("Landing opt-in handler failure", {
      message: error?.message,
      stack: error?.stack,
    });

    return buildResponse(500, {
      error: "We could not save your submission. Please try again in a few minutes.",
    });
  }
};

function buildResponse(statusCode, body, options = {}) {
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (options.allowCredentials) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  if (body == null) {
    return { statusCode, headers };
  }

  headers["Content-Type"] = "application/json";

  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}

async function parseEventBody(event) {
  if (!event || typeof event !== "object") {
    return {};
  }

  if (!event.body) {
    return {};
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  const contentType = pickHeader(event.headers, "content-type");

  if (contentType && contentType.includes("application/json")) {
    return JSON.parse(rawBody);
  }

  if (contentType && contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(rawBody);
    return Object.fromEntries(params.entries());
  }

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    console.warn("Unsupported payload format", {
      contentType,
      message: error?.message,
    });
    throw new Error("Unsupported content type");
  }
}

function pickHeader(headers, headerName) {
  if (!headers) {
    return "";
  }
  const target = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key && key.toLowerCase() === target) {
      return typeof value === "string" ? value.toLowerCase() : "";
    }
  }
  return "";
}

function normaliseStage(stage) {
  const value = typeof stage === "string" ? stage.trim().toLowerCase() : "";
  if (value === STAGE_PROFILE_COMPLETION) {
    return STAGE_PROFILE_COMPLETION;
  }
  return STAGE_OPT_IN;
}

function normaliseEmail(value) {
  if (typeof value !== "string") {
    return "";
  }
  const normalised = value.trim().toLowerCase();
  if (!normalised) {
    return "";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(normalised) ? normalised : "";
}

function normaliseText(value, maxLength = 256) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function normaliseUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "";
  }
  try {
    const parsed = new URL(value.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }
    parsed.hash = "";
    return parsed.toString();
  } catch (error) {
    return "";
  }
}

function normaliseLinkedInUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "";
  }
  try {
    const parsed = new URL(value.trim());
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname.endsWith("linkedin.com")) {
      return "";
    }
    parsed.protocol = "https:";
    parsed.hash = "";
    return parsed.toString();
  } catch (error) {
    return "";
  }
}

async function updateSubscriberRecord({
  email,
  stage,
  fullName,
  linkedinUrl,
  pageName,
  contentUrl,
  notionPageId,
  skipStageUpdate = false,
}) {
  if (!tableName) {
    throw new Error("DYNAMO_TABLE_NAME is not configured.");
  }

  const now = new Date().toISOString();
  const expressions = [];
  const values = {
    ":now": now,
  };

  if (!skipStageUpdate) {
    if (!stage) {
      throw new Error("Stage is required when skipStageUpdate is false.");
    }
    expressions.push("latestStage = :stage");
    values[":stage"] = stage;

    if (stage === STAGE_OPT_IN) {
      expressions.push("optInTimestamp = if_not_exists(optInTimestamp, :now)");
      expressions.push("firstSeenAt = if_not_exists(firstSeenAt, :now)");
    }

    if (stage === STAGE_PROFILE_COMPLETION) {
      expressions.push("profileCompletedAt = :now");
    }

    expressions.push("stageCount = if_not_exists(stageCount, :zero) + :increment");
    values[":zero"] = 0;
    values[":increment"] = 1;
  }

  expressions.push("lastUpdatedAt = :now");

  if (fullName) {
    expressions.push("fullName = :fullName");
    values[":fullName"] = fullName;
  }

  if (linkedinUrl) {
    expressions.push("linkedinUrl = :linkedinUrl");
    values[":linkedinUrl"] = linkedinUrl;
  }

  if (pageName) {
    expressions.push("pageName = :pageName");
    values[":pageName"] = pageName;
  }

  if (contentUrl) {
    expressions.push("contentUrl = :contentUrl");
    values[":contentUrl"] = contentUrl;
  }

  if (notionPageId) {
    expressions.push("notionPageId = :notionPageId");
    values[":notionPageId"] = notionPageId;
  }

  const updateExpression = `SET ${expressions.join(", ")}`;

  const command = new UpdateCommand({
    TableName: tableName,
    Key: { email },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: values,
    ReturnValues: "ALL_NEW",
  });

  const response = await dynamo.send(command);
  return response?.Attributes || {};
}

async function syncNotion({
  email,
  stage,
  fullName,
  linkedinUrl,
  pageName,
  contentUrl,
  existingNotionPageId,
}) {
  if (!notionDatabaseId) {
    throw new Error("NOTION_DATABASE_ID is not configured.");
  }

  if (!notionApiKeyParameter) {
    throw new Error("NOTION_API_KEY_PARAMETER is not configured.");
  }

  const notion = await getNotionClient();
  const stageValue = stage === STAGE_PROFILE_COMPLETION ? stageProfileCompleteValue : stageOptInValue;
  const titleValue = fullName || email;
  const properties = {};

  if (titleProperty) {
    properties[titleProperty] = {
      title: [
        {
          text: { content: titleValue },
        },
      ],
    };
  }

  if (emailProperty) {
    properties[emailProperty] = { email };
  }

  if (stageProperty && stageValue) {
    properties[stageProperty] = {
      select: { name: stageValue },
    };
  }

  if (nameProperty && fullName) {
    properties[nameProperty] = {
      rich_text: [
        {
          text: { content: fullName },
        },
      ],
    };
  }

  if (linkedinProperty && linkedinUrl) {
    properties[linkedinProperty] = { url: linkedinUrl };
  }

  if (pageNameProperty && pageName) {
    properties[pageNameProperty] = {
      rich_text: [
        {
          text: { content: pageName },
        },
      ],
    };
  }

  if (contentUrlProperty && contentUrl) {
    properties[contentUrlProperty] = { url: contentUrl };
  }

  const pageId = await ensureNotionPage({
    notion,
    email,
    properties,
    existingNotionPageId,
  });

  return pageId;
}

async function ensureNotionPage({ notion, email, properties, existingNotionPageId }) {
  if (existingNotionPageId) {
    await notion.pages.update({
      page_id: existingNotionPageId,
      properties,
    });
    return existingNotionPageId;
  }

  const existingPage = await findNotionPageByEmail(notion, email);
  if (existingPage) {
    await notion.pages.update({
      page_id: existingPage.id,
      properties,
    });
    return existingPage.id;
  }

  const created = await notion.pages.create({
    parent: { database_id: notionDatabaseId },
    properties,
  });

  return created.id;
}

async function findNotionPageByEmail(notion, email) {
  if (!emailProperty) {
    return null;
  }

  const response = await notion.databases.query({
    database_id: notionDatabaseId,
    page_size: 1,
    filter: {
      property: emailProperty,
      email: { equals: email },
    },
  });

  if (!response?.results || response.results.length === 0) {
    return null;
  }

  return response.results[0];
}

async function getNotionClient() {
  if (!notionClientPromise) {
    notionClientPromise = loadNotionClient();
  }
  return notionClientPromise;
}

async function loadNotionClient() {
  const parameter = await ssmClient.send(
    new GetParameterCommand({
      Name: notionApiKeyParameter,
      WithDecryption: true,
    })
  );

  const apiKey = parameter?.Parameter?.Value;
  if (!apiKey) {
    throw new Error("Unable to load Notion API key from SSM Parameter Store.");
  }

  return new NotionClient({ auth: apiKey });
}

function assertRequiredEnv() {
  const missing = [];
  if (!tableName) {
    missing.push("DYNAMO_TABLE_NAME");
  }
  if (!notionDatabaseId) {
    missing.push("NOTION_DATABASE_ID");
  }
  if (!notionApiKeyParameter) {
    missing.push("NOTION_API_KEY_PARAMETER");
  }
  if (!emailProperty) {
    missing.push("NOTION_EMAIL_PROPERTY");
  }
  if (!stageProperty) {
    missing.push("NOTION_STAGE_PROPERTY");
  }
  if (!titleProperty) {
    missing.push("NOTION_TITLE_PROPERTY");
  }

  if (missing.length) {
    throw new Error(`Missing required environment configuration: ${missing.join(", ")}`);
  }
}
