import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const sns = new SNSClient({ region: "us-east-1" }); // Update region as needed
const MAX_SNS_MESSAGE_SIZE = 256 * 1024; // 256 KB

export const handler = async (event) => {
    const allowedOrigin = "https://rx2solutions.com"; // Replace with your actual domain

    try {
        const httpMethod = event.requestContext?.http?.method;

        // Handle CORS preflight requests (OPTIONS)
        if (httpMethod === "OPTIONS") {
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": allowedOrigin,
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
                body: JSON.stringify({ message: "CORS preflight successful" }),
            };
        }

        // Handle form submission (POST)
        if (httpMethod === "POST") {
            const body = JSON.parse(event.body);

            // Validate input fields
            const { userName, email, message } = body;

            if (!userName || typeof userName !== "string" || userName.trim().length === 0) {
                return validationError("Invalid or missing 'name'");
            }

            if (!email || !validateEmail(email)) {
                return validationError("Invalid or missing 'email'");
            }

            if (!message || typeof message !== "string" || message.trim().length === 0) {
                return validationError("Invalid or missing 'message'");
            }

            if (containsDangerousContent(message)) {
                return validationError("Message contains potentially harmful content");
            }

            // Format the SNS message
            const snsMessage = `You received a new submission from your contact form:
            - Name: ${sanitize(userName)}
            - Email: ${sanitize(email)}
            - Message: ${sanitize(message)}`;

            // Check message size
            const messageSize = Buffer.byteLength(snsMessage, "utf8");
            if (messageSize > MAX_SNS_MESSAGE_SIZE) {
                return validationError(
                    `Message exceeds maximum allowed size of 256 KB (current size: ${messageSize} bytes)`
                );
            }

            // Publish the message to SNS
            const params = {
                Message: snsMessage,
                TopicArn: "arn:aws:sns:us-east-1:642038304273:contact-us_rx2", // Replace with your SNS topic ARN
                Subject: "New Contact Us Form Submission",
            };

            await sns.send(new PublishCommand(params));

            // Return a success response
            return {
                statusCode: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": allowedOrigin,
                },
                body: JSON.stringify({ message: "Submission received and email sent!" }),
            };
        }

        // Handle unsupported HTTP methods
        return {
            statusCode: 405,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": allowedOrigin,
            },
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };
    } catch (error) {
        console.error("Error processing request:", error);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": allowedOrigin,
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({ error: "Failed to process the request." }),
        };
    }
};

// Helper: Validate email format
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Helper: Check for dangerous content
const containsDangerousContent = (input) => {
    const blacklistedPatterns = [
        /<script.*?>.*?<\/script>/gi, // Prevent script injection
        /on[a-z]+\s*=\s*["'].*?["']/gi, // Prevent inline event handlers
    ];
    return blacklistedPatterns.some((pattern) => pattern.test(input));
};

// Helper: Sanitize input (escape harmful characters)
const sanitize = (input) => {
    return input.replace(/[<>"']/g, (match) => {
        const replacements = { "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
        return replacements[match] || match;
    });
};

// Helper: Return validation error
const validationError = (message) => {
    return {
        statusCode: 400,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://rx2solutions.com",
        },
        body: JSON.stringify({ error: message }),
    };
};