import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const client = new DynamoDBClient({ region: "eu-north-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "TodoTable";
const ALLOWED_SEVERITIES = ["low", "medium", "high", "critical"];

export const handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer.jwt.claims.sub;
    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body || {};

    if (!body.title) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({ message: "Missing title" }),
      };
    }

    const severity = ALLOWED_SEVERITIES.includes(body.severity)
      ? body.severity
      : "medium";

    const newTodo = {
      userId: userId,
      todoId: crypto.randomUUID(),
      title: body.title,
      completed: false,
      severity: severity,
      dueDate: body.dueDate || null,
      createdAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({ TableName: TABLE_NAME, Item: newTodo }),
    );

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify(newTodo),
    };
  } catch (error) {
    console.error("Create Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Internal Server Error",
        error: error.message,
      }),
    };
  }
};
