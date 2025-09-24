export const handler = async (event) => {
    for (const r of event.Records) {
        try {
            const b = JSON.parse(r.body);
            console.error("[DLQ] task failed", JSON.stringify({
                taskId: b.taskId,
                payload: b.payload,
                lastError: b.lastError,
                attempt: b.attempt,
                sentToDlqAt: b.sentToDlqAt,
            }));
        }
        catch {
            console.error("[DLQ] unparsable body:", r.body);
        }
    }
};
