import { SQSHandler } from "aws-lambda";

export const handler: SQSHandler = async (event) => {
  for (const r of event.Records) {
    try {
      const b = JSON.parse(r.body);
      console.error(
        "[DLQ] task failed",
        JSON.stringify(
          {
            taskId: b.taskId,
            payload: b.payload,
            attempt: b.attempt,
            lastError: b.lastError,
            sentToDlqAt: b.sentToDlqAt,
          },
          null,
          2
        )
      );
    } catch {
      console.error("[DLQ] unparsable body:", r.body);
    }
  }
};
