# 🎓 Learnify: Enterprise Learning Management System

A high-performance Learning Management System built on Next.js and Supabase, featuring edge-secured role-based access control, dynamic assessment authoring, and scalable exam execution.

## 🚀 Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS (Custom Enterprise Design System)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (with Next.js Edge Middleware)
- **State Management:** React Hook Form & React Context

## ✨ Core Features

### 🛡️ Security & Architecture
- **Role-Based Access Control (RBAC):** Strict separation between `ADMIN` and `STUDENT` roles.
- **Edge Middleware Guards:** Next.js middleware intercepts requests at the edge, securely routing users to their proper dashboards and preventing unauthorized access to protected routes.
- **Postgres Row Level Security (RLS):** Database-level security ensuring students cannot query restricted data before submitting an exam.

### 👨‍🏫 Admin Command Center
- **Advanced Dashboard:** A beautifully designed analytics and management interface.
- **Dynamic Quiz Builder:** A powerful authoring tool supporting multiple question types:
  - Single Choice (Standard MCQs)
  - Multiple Select (Checkboxes)
  - True / False
  - Matching Pairs (Drag-and-drop mapping)
- **Bulk Action Management:** Select multiple quizzes to instantly publish, unpublish, or delete via a unified action bar.
- **Advanced Pagination & Filtering:** Cleanly manage hundreds of quizzes with custom-built grid/list views.

### 🧑‍🎓 Student Testing Environment
- **Focus-Mode Canvas:** A distraction-free, one-question-at-a-time testing interface to reduce cognitive overload.
- **Exam Navigation Grid:** A visual sidebar tracking answered and unanswered questions, allowing students to jump between questions easily.
- **Real-time Countdown Timer:** High-visibility active timer for timed assessments.
- **Smart Data Binding:** Securely tracks selected answers in local state before pushing the final submission payload to the database.

---

## 🗺️ Roadmap & Upcoming Features

- [ ] **AI Quiz Generation:** Automatically generate comprehensive quizzes from pasted course material or documents.
- [ ] **Bulk Import/Export:** Upload `.csv` or `.xlsx` files to instantly create quizzes, and export grade books.
- [ ] **Proctoring Settings:** Configurable global time limits, tab-switching detection, and randomized question/answer shuffling.
- [ ] **Deep Analytics:** Pass/fail rates, time-per-question metrics, and cohort performance graphs.

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js 18.x or higher
- A Supabase Account

### 1. Clone the repository
```bash
git clone [https://github.com/yourusername/learnify.git](https://github.com/yourusername/learnify.git)
cd learnify
```

### 2. Environment Variables
You will need to set up your environment variables. In the `frontend` directory, copy the example file:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Install Dependencies & Run
```bash
cd frontend
npm install
npm run dev
```
The application will be available at `http://localhost:3000`.

---
*Built for the future of education.*
