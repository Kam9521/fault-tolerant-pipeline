import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
const sqs = new SQSClient({});
export const handler = async (event) => {
    try {
        const body = JSON.parse(event.body || "{}");
        if (!body?.taskId || typeof body.taskId !== "string") {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "taskId (string) jest wymagany" }),
            };
        }
        const message = {
            taskId: body.taskId,
            payload: body.payload ?? {},
            attempt: 0,
            lastError: null,
        };
        await sqs.send(new SendMessageCommand({
            QueueUrl: process.env.MAIN_QUEUE_URL,
            MessageBody: JSON.stringify(message),
        }));
        return {
            statusCode: 202,
            body: JSON.stringify({ status: "accepted", taskId: body.taskId }),
        };
    }
    catch (err) {
        console.error("submitTask error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal error" }),
        };
    }
};
