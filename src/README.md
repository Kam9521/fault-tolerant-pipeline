# Fault-Tolerant Pipeline (AWS Lambda + SQS)

This project implements a **fault-tolerant event-driven pipeline** using AWS Lambda, Amazon SQS, and API Gateway.  
The system is designed to handle failures gracefully by retrying tasks with exponential backoff and redirecting permanently failing tasks to a **Dead-Letter Queue (DLQ)**.

---

## 1. Installation & Deployment

### Requirements
- Node.js 18+
- AWS CLI configured with an IAM user (AdministratorAccess recommended for test)
- Serverless Framework installed (`npm install -g serverless`)

### Deploy
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy infrastructure to AWS
npx serverless deploy
The deploy output will include the API Gateway endpoint, for example:


POST - https://w6p9ows306.execute-api.eu-central-1.amazonaws.com/tasks
2. High-Level Architecture

        +-------------+
        |   Client    |
        +-------------+
              |
              v
    +-------------------+
    | API Gateway (POST)|
    +-------------------+
              |
              v
     +-------------------+
     |  Lambda submitTask|
     +-------------------+
              |
              v
     +-------------------+
     |   SQS Main Queue  |
     +-------------------+
              |
              v
     +-------------------+
     | Lambda processTask|
     | - Simulates errors|
     | - Retries with    |
     |   exponential     |
     |   backoff         |
     +-------------------+
              |
      -------------------------
      |                       |
      v                       v
   Success             +-------------------+
                       |   SQS DLQ Queue   |
                       +-------------------+
                               |
                               v
                       +-------------------+
                       | Lambda monitorDlq |
                       | Logs failed tasks |
                       +-------------------+
3. Testing
Submit a Task (PowerShell)
Replace <YOUR_ENDPOINT> with the value from deployment (serverless info):


$uri = "https://w6p9ows306.execute-api.eu-central-1.amazonaws.com/tasks"
$bodyObj = @{ taskId = "t1"; payload = @{ foo = "bar" } } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" -Body $bodyObj

Expected Response:

status   taskId
accepted t1

Check Worker Logs:

npx serverless logs -f processTask --startTime 10m -t

Example output:

FAIL taskId=t1, attempt=0, error=Simulated processing failure
OK   taskId=t1, attempt=1

DLQ Monitoring
If a task fails after max retries (2), it is sent to DLQ.

npx serverless logs -f monitorDlq --startTime 10m -t

Example output:

[DLQ] task failed
{
  "taskId": "t2",
  "payload": { "foo": "baz" },
  "attempt": 2,
  "lastError": "Simulated processing failure",
  "sentToDlqAt": "2025-09-24T12:34:56Z"
}

4. Error Simulation
By default, the system simulates errors in 30% of tasks:

async function doWork(task: TaskMsg) {
  if (Math.random() < 0.3) {
    throw new Error("Simulated processing failure");
  }
}

70% of tasks succeed on the first attempt.
30% fail → retried with exponential backoff (5s, 10s, ...),
After 2 failed attempts, tasks are moved to DLQ.

5. Assumptions:

Maximum retry attempts = 2
Exponential backoff base = 5 seconds
DLQ stores permanently failing messages for later inspection
Logging is done via CloudWatch for all Lambdas
Infrastructure is provisioned entirely by Serverless Framework

6. Cleanup
To remove all AWS resources:

npx serverless remove

7. Project Structure
bash
Skopiuj kod
.
├─ serverless.yml
├─ package.json
├─ tsconfig.json
├─ src/
│  ├─ submitTask.ts     # API handler, pushes task to SQS
│  ├─ processTask.ts    # Worker, simulates failures + retries
│  └─ monitorDlq.ts     # DLQ logger
└─ README.md
