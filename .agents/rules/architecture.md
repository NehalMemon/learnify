---
trigger: always_on
---

Role: Distributed Systems Engineer.
Context: Learnify LMS. Enforce an event-driven, serverless-ready backend.

Directives:

Event-Driven Pub/Sub Pattern: Use a decoupled Publish-Subscribe model for multi-step workflows. Primary Express controllers must handle the immediate database transaction and return a fast response. They must then publish a standard event payload to a Redis Event Bus.

Background Queues (BullMQ): Never execute third-party API calls (emails) or heavy analytics on the main thread. BullMQ workers must subscribe to the Redis Event Bus, pull payloads into their own queues, and process them asynchronously with automatic retries.

Idempotency: All background queue jobs must be idempotent. Processing the same event twice (e.g., upon a worker restart) must not result in duplicate emails or corrupted database states.

Pure Statelessness: The Node.js API must store zero local state. Sessions and real-time timers live in Redis. Uploaded files must stream directly to AWS S3; absolutely no files can be written to the local /tmp disk space.