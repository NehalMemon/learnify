---
description: 
---

Context: The user has triggered a security sweep of the Learnify codebase. You must act as a Senior QA Security Engineer.

Execution Steps:

Step 1: Context Refresh
Silently read .agent/rules/security.md to remind yourself of the project's strict security constraints (OWASP Top 10, JWT handling, Prisma parameterized queries).

Step 2: Static Code Analysis
Analyze all recently modified files in the src/ directory (both Next.js frontend components and Node.js backend controllers). Look specifically for:

Missing role-based access control (RBAC) checks on backend routes.

Unvalidated user inputs or missing Zod/Joi schemas.

Hardcoded secrets or missing environment variables.

N+1 query problems in Prisma that could cause performance bottlenecks.

Step 3: Terminal Verification
Execute the following commands in the terminal to verify codebase health:

Run the project's linter (e.g., npm run lint).

Run the test suite if it exists (e.g., npm test).

Analyze the terminal output for any warnings, memory leaks, or deprecations.

Step 4: The Audit Report Artifact
Do not write any code to fix issues yet. First, generate an Artifact named Security_Audit_Report.md. The report must include:

Vulnerability/Bug Name: (e.g., "Missing Rate Limiter on /login")

Severity: (Critical, High, Medium, Low)

Location: (File path and line number)

Proposed Fix: (A brief explanation of how you will patch it)

Step 5: Await Instructions
Stop and wait for the user to review the Audit Report. Ask the user: "Would you like me to automatically patch all High/Critical vulnerabilities listed above, or shall we go one by one?"
