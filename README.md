# Playbook — Kanban Task Board

A fast, focused Kanban board built for sports teams and game studios.
Inspired by Linear and Asana — designed to feel like it was built for Next Play Games specifically.

---

## Live Demo

> **[https://playbook-kanban.vercel.app](https://playbook-kanban.vercel.app)**
> *(URL updated after Vercel deployment)*

## GitHub Repository

> **[https://github.com/your-username/playbook](https://github.com/your-username/playbook)**
> *(Update with your actual repo URL)*

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + TypeScript | Type safety, component model |
| Build tool | Vite | Fast HMR, instant builds |
| Styling | Tailwind CSS | Utility-first, no CSS files to manage |
| Database | Supabase (Postgres) | Free tier, built-in auth, RLS |
| Auth | Supabase Anonymous Auth | Guest sessions, no sign-up required |
| Drag & Drop | @dnd-kit/core | Modern, accessible, no deprecated APIs |
| Dates | date-fns | Lightweight, tree-shakeable date utilities |
| Icons | Lucide React | Consistent, clean icon set |
| Hosting | Vercel | Zero-config deploys from GitHub |

---

## Local Setup

### Prerequisites
- Node.js 18+ (check with `node --version`)
- A free [Supabase](https://supabase.com) account

### 1. Clone and install

```bash
git clone https://github.com/your-username/playbook.git
cd playbook
npm install
```

### 2. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Wait for the project to provision (~1 min)
3. Go to **Project Settings → API**
4. Copy your **Project URL** and **anon public** key

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run the database schema

In your Supabase project, go to **SQL Editor** and run the full schema below.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Database Schema

Run this entire block in the Supabase SQL Editor:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Playbook — Full Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── Enable UUID extension ───────────────────────────────────────────────────
-- gen_random_uuid() generates UUID v4 primary keys automatically on insert.
-- This extension is available in all Supabase projects by default.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─── Tasks Table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  -- Primary key — UUID generated automatically on insert
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Required fields
  title         TEXT NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 500),
  status        TEXT NOT NULL DEFAULT 'todo'
                  CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')),
  priority      TEXT NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('high', 'normal', 'low')),

  -- Optional fields
  description   TEXT,
  due_date      DATE,                    -- 'YYYY-MM-DD' — stored as Postgres DATE
  labels        TEXT[] NOT NULL DEFAULT '{}',   -- Array of label strings

  -- Foreign key to Supabase auth users
  -- ON DELETE CASCADE: if the auth user is deleted, their tasks go too
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on user_id — every query filters by user_id (via RLS), so this
-- index makes those queries fast even with many rows in the table
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);

-- Index on status — we query tasks by status when building each column
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);

-- Index on created_at — default sort order for tasks within a column
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks(created_at DESC);


-- ─── Sprints Table ────────────────────────────────────────────────────────────
-- Stores sprint/milestone data for the sprint banner in the header.
-- Each user can have multiple sprints; only is_active=true is shown.
CREATE TABLE IF NOT EXISTS sprints (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL CHECK (char_length(name) > 0),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL CHECK (end_date > start_date),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active sprint per user at a time
-- This partial unique index enforces that business rule at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS sprints_one_active_per_user
  ON sprints(user_id) WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS sprints_user_id_idx ON sprints(user_id);


-- ─── Row Level Security (RLS) ─────────────────────────────────────────────────
--
-- RLS is the core security mechanism. Without it, any user with the anon key
-- could read and modify ALL rows in the database.
--
-- With RLS enabled and these policies:
--   - User A can ONLY read/write rows where user_id = User A's auth.uid()
--   - User B can ONLY read/write rows where user_id = User B's auth.uid()
--   - Even if User B knows User A's task ID, they cannot access it
--
-- auth.uid() is a Supabase function that returns the current authenticated
-- user's UUID. It's evaluated per-row, per-request.
--
-- IMPORTANT: We use USING (user_id = auth.uid()) which applies to SELECT,
-- UPDATE, and DELETE. For INSERT, we use WITH CHECK to ensure inserted rows
-- have the correct user_id (can't insert for another user).

-- Enable RLS on both tables
ALTER TABLE tasks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;

-- ── Tasks policies ────────────────────────────────────────────────────────────

-- SELECT: users can only read their own tasks
CREATE POLICY "tasks_select_own" ON tasks
  FOR SELECT USING (user_id = auth.uid());

-- INSERT: users can only create tasks for themselves
-- WITH CHECK ensures the user_id they try to insert matches their auth.uid()
-- This prevents a malicious user from inserting tasks with someone else's user_id
CREATE POLICY "tasks_insert_own" ON tasks
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE: users can only update their own tasks
CREATE POLICY "tasks_update_own" ON tasks
  FOR UPDATE USING (user_id = auth.uid());

-- DELETE: users can only delete their own tasks
CREATE POLICY "tasks_delete_own" ON tasks
  FOR DELETE USING (user_id = auth.uid());

-- ── Sprints policies ──────────────────────────────────────────────────────────

CREATE POLICY "sprints_select_own" ON sprints
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "sprints_insert_own" ON sprints
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "sprints_update_own" ON sprints
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "sprints_delete_own" ON sprints
  FOR DELETE USING (user_id = auth.uid());


-- ─── Anonymous Auth ───────────────────────────────────────────────────────────
-- No SQL needed here — anonymous sign-in is enabled in the Supabase Dashboard:
-- Authentication → Providers → Anonymous Sign-ins → Enable
-- The app calls supabase.auth.signInAnonymously() which creates a real
-- auth.users row with a UUID, enabling RLS policies to work correctly.


-- ─── Done! ────────────────────────────────────────────────────────────────────
-- Your schema is ready. The app will work as soon as you:
-- 1. Enable Anonymous Sign-ins in Auth settings (see above)
-- 2. Set your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
```

---

## Features

### Required
- **Kanban board** — 4 columns: To Do, In Progress, In Review, Done
- **Drag and drop** — move tasks between columns via @dnd-kit
- **Task creation** — title, description, priority, due date, labels
- **Guest sessions** — anonymous Supabase auth, auto-created on first load
- **Data persistence** — all tasks saved to Supabase Postgres
- **Row Level Security** — users can only access their own tasks
- **Loading + error states** — throughout the app

### Advanced Features Built
- **Due date indicators** — overdue (red), due soon (amber) badges on cards
- **Stats strip** — total tasks, completed, overdue count in the header
- **Search + filter** — real-time search by title/description; filter by priority
- **Sprint/milestone banner** — sprint name, days remaining, completion percentage
- **Labels/tags** — color-coded labels on tasks, filterable

---

## Architecture & Design Decisions

### Why Supabase directly (no backend)?
The assessment allows calling Supabase directly from the frontend. With RLS policies enforcing data isolation, there's no security benefit to adding a backend API layer for this use case. It also eliminates latency (no extra hop) and deployment complexity.

### Why @dnd-kit over react-beautiful-dnd?
react-beautiful-dnd is deprecated and unmaintained. @dnd-kit is its modern successor — actively maintained, accessible by default, and works with React 18's concurrent features.

### Why optimistic updates?
When a user drags a task to a new column, the UI updates immediately without waiting for the Supabase network round-trip. If the update fails, we roll back. This makes the board feel instant.

### Why client-side filtering?
We fetch all tasks once and filter in memory. At the expected scale (< 500 tasks per guest user), this is instant and avoids the latency of re-querying Supabase on every keypress. For thousands of tasks, we'd move filtering to the Supabase query.

### Dark sports theme
The design uses a deep dark palette (pitch-950 → pitch-700) with an electric lime accent (volt-500: #c8ff00). This was intentional for Next Play Games — feels energetic and game-studio appropriate, distinct from generic light-mode SaaS tools.

---

## What I'd Improve With More Time

1. **Real-time sync** — Supabase supports `supabase.channel().on('postgres_changes')` for live updates. Multiple users on the same board would see changes instantly.
2. **Drag to reorder within a column** — currently drag only moves between columns. @dnd-kit's `SortableContext` supports within-column ordering.
3. **Task detail panel** — a slide-out panel (not modal) for editing all task fields inline.
4. **Activity log** — a `task_activity` table tracking status changes, edits, timestamps.
5. **Team/assignees** — a `team_members` table with avatar support.
6. **Mobile layout** — stacked single-column view on small screens with swipe gestures.
7. **Keyboard shortcuts** — `N` for new task, `Esc` to close modal, arrow keys to move between columns.

---

## Project Structure

```
src/
├── components/
│   ├── board/          # Board, Column, TaskCard, DragOverlay
│   ├── layout/         # AppLayout, Sidebar, TopBar
│   └── ui/             # Shared UI: Modal, Button, LoadingScreen, ErrorScreen
├── hooks/              # useTasks, useSprint, useCreateTask, useUpdateTask
├── lib/
│   ├── supabase.ts     # Supabase client + getOrCreateGuestSession()
│   ├── database.types.ts  # Generated DB type definitions
│   └── utils.ts        # cn(), date helpers, filter logic, stats computation
└── types/
    └── index.ts        # All TypeScript interfaces and types
```
