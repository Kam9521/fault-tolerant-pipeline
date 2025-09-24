import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
const sqs = new SQSClient({});
const MAX_ATTEMPTS = 2;
const FAILURE_RATE = 1;
const BASE_DELAY_SECONDS = 5;
async function doWork(task) {
    if (Math.random() < FAILURE_RATE) {
        throw new Error("Simulated processing failure");
    }
}
function nextDelay(attempt) {
    return Math.min(BASE_DELAY_SECONDS * Math.pow(2, attempt), 900);
}
async function requeueWithBackoff(msg) {
    await sqs.send(new SendMessageCommand({
        QueueUrl: process.env.MAIN_QUEUE_URL,
        MessageBody: JSON.stringify({ ...msg, attempt: msg.attempt + 1 }),
        DelaySeconds: nextDelay(msg.attempt),
    }));
}
async function sendToDlq(msg) {
    await sqs.send(new SendMessageCommand({
        QueueUrl: process.env.DLQ_URL,
        MessageBody: JSON.stringify({
            ...msg,
            sentToDlqAt: new Date().toISOString(),
        }),
    }));
}
export const handler = async (event) => {
    for (const r of event.Records) {
        const msg = JSON.parse(r.body);
        try {
            await doWork(msg);
            console.log(`OK taskId=${msg.taskId}, attempt=${msg.attempt}`);
        }
        catch (err) {
            const e = err?.message || "Unknown error";
            console.warn(`FAIL taskId=${msg.taskId}, attempt=${msg.attempt}, error=${e}`);
            if (msg.attempt < MAX_ATTEMPTS) {
                await requeueWithBackoff({ ...msg, lastError: e });
            }
            else {
                await sendToDlq({ ...msg, lastError: e });
            }
        }
    }
};
