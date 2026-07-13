import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "eu-north-1" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "TodoTable";
const ALLOWED_SEVERITIES = ["low", "medium", "high", "critical"];

export const handler = async (event) => {
  try {
    const userId = event.requestContext.authorizer.jwt.claims.sub;
    const todoId = event.pathParameters.id || event.pathParameters.todoId;
    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body || {};

    if (!todoId) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({ message: "Missing id in path" }),
      };
    }

    const setParts = [];
    const values = {};

    if (body.completed !== undefined) {
      setParts.push("completed = :c");
      values[":c"] = body.completed === true;
    }
    if (body.title !== undefined) {
      setParts.push("title = :t");
      values[":t"] = body.title;
    }
    if (
      body.severity !== undefined &&
      ALLOWED_SEVERITIES.includes(body.severity)
    ) {
      setParts.push("severity = :s");
      values[":s"] = body.severity;
    }
    if (body.dueDate !== undefined) {
      setParts.push("dueDate = :dd");
      values[":dd"] = body.dueDate;
    }

    if (setParts.length === 0) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
        body: JSON.stringify({ message: "Nothing to update" }),
      };
    }

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { userId: userId, todoId: todoId },
        UpdateExpression: "SET " + setParts.join(", "),
        ExpressionAttributeValues: values,
      }),
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      },
      body: JSON.stringify({ message: "Updated successfully", todoId }),
    };
  } catch (error) {
    console.error("Update Error:", error);
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
