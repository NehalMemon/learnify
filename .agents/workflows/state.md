---
description: 
---

# Agent Context Recovery Protocol

**Instructions for the AI Agent:**
Before performing any tasks, you must reconstruct the project context by following these steps. Do not rely on previous chat history; rely on the current filesystem state.

### Step 1: Filesystem Discovery
1. **Schema Check:** Analyze `scripts/prisma/schema.prisma`. Identify the core models (User, Quiz, Category, Attempt) and check for the latest fields (e.g., does `Quiz` have a `year` field?).
2. **Route Audit:** Scan `src/routes/` to identify all mounted endpoints.
3. **Controller Analysis:** Check `src/controllers/` to see the logic for Quiz start, answer submission, and finalization.
4. **Frontend Audit:** Check `src/app/` for the existence of Dashboard, Arena, and Leaderboard pages.

### Step 2: State Documentation
After your analysis, update the `state.md` file in the root directory. You must fill in:
- **Functional Endpoints:** Mark as ✅ (Tested/Functional), ⚠️ (Partial/Untested), or ❌ (Broken/Missing).
- **Architecture Snapshot:** Confirm the tech stack (e.g., BullMQ for grading, Neon for DB).
- **Last Known Action:** Determine the most recent change by checking file timestamps or recent logic implementations.

### Step 3: Identify Blockers
Based on your scan, list the "Pending Tasks" that are required to make the project "Production Ready" (e.g., Missing Review UI, CSRF gaps).

**Goal:** Once `state.md` is updated, present a summary to the user and ask for the next task.