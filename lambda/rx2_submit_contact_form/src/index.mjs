import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssmClient = new SSMClient({});
const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "*");
const notionApiKeyParameter = process.env.NOTION_API_KEY_PARAMETER;
const notionDatabaseId = process.env.NOTION_DATABASE_ID;
const titleProperty = process.env.NOTION_TITLE_PROPERTY || "Name";
const emailProperty = process.env.NOTION_EMAIL_PROPERTY || "Email";
const nameProperty = process.env.NOTION_NAME_PROPERTY || "";
const companyProperty = process.env.NOTION_COMPANY_PROPERTY || "";
const phoneProperty = process.env.NOTION_PHONE_PROPERTY || "";
const pageNameProperty = process.env.NOTION_PAGE_NAME_PROPERTY || "";
const notionVersion = "2022-06-28";

let notionApiKeyPromise;

export const handler = async (event) => {
    const httpMethod = event?.requestContext?.http?.method || event?.httpMethod || "GET";
    const requestOrigin = getRequestOrigin(event?.headers);

    try {
        if (httpMethod === "OPTIONS") {
            return buildResponse(200, { message: "CORS preflight successful" }, requestOrigin);
        }

        if (httpMethod !== "POST") {
            return buildResponse(405, { error: "Method Not Allowed" }, requestOrigin);
        }

        assertRequiredEnv();

        const payload = await parseEventBody(event);
        if (typeof payload.confirm_email === "string" && payload.confirm_email.trim().length > 0) {
            return buildResponse(204, null, requestOrigin);
        }

        const fullName = normaliseText(payload.full_name, 128);
        const companyName = normaliseText(payload.company_name, 128);
        const email = normaliseEmail(payload.email);
        const phoneNumber = normalisePhone(payload.phone_number);
        const pageName = normaliseText(payload.page_name, 128);

        if (!fullName) {
            return validationError("Full name is required.", requestOrigin);
        }

        if (!email) {
            return validationError("A valid email address is required.", requestOrigin);
        }

        if (!phoneNumber) {
            return validationError("Please provide a valid phone number.", requestOrigin);
        }

        await upsertContactInNotion({
            fullName,
            companyName,
            email,
            phoneNumber,
            pageName,
        });

        return buildResponse(200, { message: "Thanks. We will be in touch shortly." }, requestOrigin);
    } catch (error) {
        console.error("Contact form handler failure", {
            message: error?.message,
            stack: error?.stack,
            status: error?.status,
            details: error?.details,
        });
        return buildResponse(500, {
            error: "We could not save your submission. Please try again in a few minutes.",
        }, requestOrigin);
    }
};

async function upsertContactInNotion({
    fullName,
    companyName,
    email,
    phoneNumber,
    pageName,
}) {
    const properties = {};

    properties[titleProperty] = {
        title: [
            {
                text: { content: fullName || email },
            },
        ],
    };

    properties[emailProperty] = { email };

    if (nameProperty && fullName) {
        properties[nameProperty] = richTextProperty(fullName);
    }

    if (companyProperty && companyName) {
        properties[companyProperty] = richTextProperty(companyName);
    }

    if (phoneProperty && phoneNumber) {
        properties[phoneProperty] = { phone_number: phoneNumber };
    }

    if (pageNameProperty && pageName) {
        properties[pageNameProperty] = richTextProperty(pageName);
    }

    const existingPage = await findNotionPageByEmail(email);
    if (existingPage?.id) {
        await notionRequest(`/pages/${existingPage.id}`, {
            method: "PATCH",
            body: { properties },
        });
        return existingPage.id;
    }

    const createdPage = await notionRequest("/pages", {
        method: "POST",
        body: {
            parent: { database_id: notionDatabaseId },
            properties,
        },
    });

    return createdPage?.id || "";
}

async function findNotionPageByEmail(email) {
    if (!emailProperty) {
        return null;
    }

    const response = await notionRequest(`/databases/${notionDatabaseId}/query`, {
        method: "POST",
        body: {
            page_size: 1,
            filter: {
                property: emailProperty,
                email: { equals: email },
            },
        },
    });

    if (!Array.isArray(response?.results) || response.results.length === 0) {
        return null;
    }

    return response.results[0];
}

function richTextProperty(value) {
    return {
        rich_text: [
            {
                text: { content: value },
            },
        ],
    };
}

async function notionRequest(path, { method = "GET", body } = {}) {
    const apiKey = await getNotionApiKey();
    const response = await fetch(`https://api.notion.com/v1${path}`, {
        method,
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Notion-Version": notionVersion,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const rawBody = await response.text();
    let parsedBody = {};

    if (rawBody) {
        try {
            parsedBody = JSON.parse(rawBody);
        } catch (error) {
            parsedBody = { rawBody };
        }
    }

    if (!response.ok) {
        const requestError = new Error(parsedBody?.message || `Notion API request failed with status ${response.status}.`);
        requestError.status = response.status;
        requestError.details = parsedBody;
        throw requestError;
    }

    return parsedBody;
}

async function getNotionApiKey() {
    if (!notionApiKeyPromise) {
        notionApiKeyPromise = loadNotionApiKey();
    }

    return notionApiKeyPromise;
}

async function loadNotionApiKey() {
    const parameter = await ssmClient.send(new GetParameterCommand({
        Name: notionApiKeyParameter,
        WithDecryption: true,
    }));

    const apiKey = parameter?.Parameter?.Value;
    if (!apiKey) {
        throw new Error("Unable to load the Notion API key from SSM Parameter Store.");
    }

    return apiKey;
}

async function parseEventBody(event) {
    if (!event || typeof event !== "object" || !event.body) {
        return {};
    }

    const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body;

    const contentType = pickHeader(event.headers, "content-type").toLowerCase();

    if (contentType.includes("application/json")) {
        return JSON.parse(rawBody);
    }

    if (contentType.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams(rawBody);
        return Object.fromEntries(params.entries());
    }

    try {
        return JSON.parse(rawBody);
    } catch (error) {
        throw new Error("Unsupported content type.");
    }
}

function buildResponse(statusCode, body, requestOrigin = "") {
    const headers = {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin",
    };

    headers["Access-Control-Allow-Origin"] = resolveAllowedOrigin(requestOrigin);

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

function parseAllowedOrigins(rawOrigins) {
    if (!rawOrigins) {
        return ["*"];
    }

    return rawOrigins
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
}

function getRequestOrigin(headers) {
    const originHeader = pickHeader(headers, "origin");
    if (originHeader) {
        return originHeader;
    }

    const refererHeader = pickHeader(headers, "referer");
    if (!refererHeader) {
        return "";
    }

    try {
        return new URL(refererHeader).origin;
    } catch (error) {
        return "";
    }
}

function resolveAllowedOrigin(requestOrigin) {
    if (!allowedOrigins.length) {
        return "*";
    }

    if (allowedOrigins.includes("*")) {
        return "*";
    }

    if (requestOrigin) {
        const match = allowedOrigins.find((origin) => origin.toLowerCase() === requestOrigin.toLowerCase());
        if (match) {
            return match;
        }
    }

    return allowedOrigins[0];
}

function pickHeader(headers, headerName) {
    if (!headers) {
        return "";
    }

    const target = headerName.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
        if (key && key.toLowerCase() === target) {
            return typeof value === "string" ? value : "";
        }
    }

    return "";
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

function normalisePhone(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
        return "";
    }

    const digits = value.replace(/\D/g, "");
    if (digits.length < 10) {
        return "";
    }

    return digits;
}

function assertRequiredEnv() {
    const missing = [];

    if (!notionApiKeyParameter) {
        missing.push("NOTION_API_KEY_PARAMETER");
    }

    if (!notionDatabaseId) {
        missing.push("NOTION_DATABASE_ID");
    }

    if (!titleProperty) {
        missing.push("NOTION_TITLE_PROPERTY");
    }

    if (!emailProperty) {
        missing.push("NOTION_EMAIL_PROPERTY");
    }

    if (missing.length > 0) {
        throw new Error(`Missing required environment configuration: ${missing.join(", ")}`);
    }
}

function validationError(message, requestOrigin = "") {
    return buildResponse(400, { error: message }, requestOrigin);
}
