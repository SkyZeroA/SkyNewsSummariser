import { APIGatewayProxyHandler } from "aws-lambda";
import {
    ConditionalCheckFailedException,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.SUBSCRIBERS_TABLE!;

const client = new DynamoDBClient({ region: process.env.region });
const db = DynamoDBDocumentClient.from(client);

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing request body" }),
      };
    }

    const { email } = JSON.parse(event.body);

    if (!email || typeof email !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email is required" }),
      };
    }

    if (!EMAIL_REGEX.test(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid email format" }),
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    await db.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          email: normalizedEmail,
          createdAt: new Date().toISOString(),
          status: "active",
        },
        // Prevents duplicates
        ConditionExpression: "attribute_not_exists(email)", 
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Subscription successful",
      }),
    };
  } catch (error) {
    if (error === ConditionalCheckFailedException) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: "Email already subscribed",
        }),
      };
    }

    console.error("Subscribe error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
      }),
    };
  }
};
