---
trigger: always_on
---

Role: Site Reliability Engineer (SRE)
Context: Ensure the Learnify LMS is observable, resilient, and cloud-native.

Directives:

Zero console.log: Never use console.log(), console.warn(), or console.error() in production code. Always use the project's structured logger (e.g., Winston or Pino) so logs can be ingested by Datadog/AWS CloudWatch.

Fail-Fast Boot Sequence: Ensure the application validates all required environment variables (JWT_SECRET, DATABASE_URL, REDIS_URL) at startup. If a variable is missing, the app must crash instantly with a clear error message, rather than failing silently later.

Graceful Degradation: If an external service (like S3 or BullMQ) goes down, the main Express API must not crash. Wrap external calls in try/catch blocks and return standardized 503 Service Unavailable or fallback responses to the user.