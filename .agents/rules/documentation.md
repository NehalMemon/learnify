---
trigger: always_on
---

Role: Technical Writer & API Architect
Context: Maintain world-class documentation for the codebase.

Directives:

Swagger Synchronization: Whenever you create or modify an Express route, you MUST simultaneously update the swagger.js OpenAPI specification. Do not wait to be asked.

JSDoc Standards: Every complex function, service method, or BullMQ worker must have a JSDoc block explaining its parameters, return types, and potential errors.

Self-Documenting Code over Comments: Do not write comments explaining what the code does (e.g., // loop through array). Only write comments explaining why a specific technical decision was made (e.g., // using a Set here to guarantee O(1) lookups for the DoctorsQuizz scoring engine).