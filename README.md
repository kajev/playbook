# Playbook

A Kanban task board built for **Next Play Games**. Dark mode, energetic volt accent, drag-and-drop columns, sprint management, and real-time Supabase persistence.

**Live:** https://playbook-psi-nine.vercel.app
**Repo:** https://github.com/kajev/playbook

---

## Features

- Anonymous guest sessions via Supabase Auth -- no signup required, board persists across sessions
- Four-column Kanban board: To Do, In Progress, In Review, Done
- Drag and drop cards between columns with optimistic updates and automatic rollback on failure
- Create, edit, and delete tasks with title, description, priority, due date, and labels
- Sprint banner showing active sprint name, days left, task completion %, and animated progress bar
- Sprint management modal -- create, edit, and end sprints
- Board stats strip -- total tasks, done, in-play, and late counts
- Label filter, priority filter, and full-text search across title and description
- Overdue glow on columns that contain past-due tasks
- Toast notifications for mutation errors with auto-dismiss
- Sports-flavored empty states per column

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS with custom design tokens |
| Database | Supabase (Postgres + Auth + RLS) |
| Drag and drop | @dnd-kit/core + @dnd-kit/sortable |
| Date handling | date-fns |
| Icons | lucide-react |
| Hosting | Vercel |

---

## Project Structure

```
src/
  App.tsx                        # Auth initialization, root render
  components/
    board/
      Board.tsx                  # DndContext, drag handlers, modal orchestration
      BoardColumn.tsx            # Single column with header, task list, empty state
      BoardSkeleton.tsx          # Shimmer loading placeholder
      TaskCard.tsx               # Individual task card with priority, labels, due date
      CreateTaskModal.tsx        # New task form
      TaskDetailModal.tsx        # View/edit/delete task modal
      SprintModal.tsx            # Create/edit/end sprint modal
    layout/
      AppLayout.tsx              # Data owner: useTasks, useSprint, toast wiring
      TopBar.tsx                 # Sprint banner, stats strip, search, filters
      Sidebar.tsx                # Logo, nav, session indicator
    ui/
      Modal.tsx                  # Accessible dialog base component
      Toast.tsx                  # useToast hook, ToastContainer, ToastChip
      ErrorScreen.tsx            # Full-screen error fallback
      LoadingScreen.tsx          # Full-screen loading state
  hooks/
    useTasks.ts                  # All task CRUD + optimistic moveTask
    useSprint.ts                 # Sprint fetch + create/update/end
    useBoardState.ts             # Groups and filters tasks into BoardState
  lib/
    supabase.ts                  # Supabase client + guest session helper
    utils.ts                     # cn, date helpers, computeBoardStats, applyFilters
  types/
    index.ts                     # Task, Sprint, FilterState, BoardState types
```

---

## Supabase Schema

### tasks table

```sql
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL CHECK (status IN ('todo','in_progress','in_review','done')),
  priority    TEXT NOT NULL CHECK (priority IN ('high','normal','low')),
  due_date    DATE,
  labels      TEXT[] NOT NULL DEFAULT '{}',
  user_id     UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tasks"   ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);
```

### sprints table

```sql
CREATE TABLE sprints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  user_id     UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX sprints_one_active_per_user
  ON sprints (user_id)
  WHERE is_active = true;

CREATE POLICY "Users can read own sprints"   ON sprints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sprints" ON sprints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sprints" ON sprints FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sprints" ON sprints FOR DELETE USING (auth.uid() = user_id);
```

---

## Environment Variables

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Both values are in your Supabase dashboard under Project Settings then API.

---

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:5173

---

## Design System

| Token | Value | Usage |
|---|---|---|
| pitch-950 | #0a0c0f | App background |
| pitch-900 | #0f1318 | Sidebar, header |
| pitch-800 | #161b23 | Column backgrounds |
| pitch-700 | #1e2530 | Card backgrounds |
| volt-500 | #c8ff00 | Primary accent -- buttons, highlights, progress |
| Font: body | DM Sans | All UI text |
| Font: mono | DM Mono | Labels, metadata, stats |
| Font: display | Space Grotesk | Numbers, sprint name |

---

## Architecture Tradeoffs

**Anonymous auth instead of email/password**
Reduces friction to zero -- users land on a working board immediately. The tradeoff is that clearing browser storage loses the session. Acceptable for a demo/portfolio context; a production app would add email sign-in.

**Hooks hoisted to AppLayout instead of React Context**
useTasks and useSprint live in AppLayout and pass data down as props. This avoids a second Supabase fetch (TopBar and Board share the same tasks array) and keeps the data flow explicit and traceable. A Context would make sense if the component tree grew deeper or if more than two consumers needed the data.

**Optimistic updates on drag-and-drop only**
moveTask updates local state immediately and syncs to Supabase in the background, rolling back on failure. Create, update, and delete wait for Supabase confirmation before updating state -- this prevents stale UUIDs and keeps modals showing accurate data on failure.

**Client-side filtering**
applyFilters runs in memory on the already-fetched tasks array. This is fast and free at under 500 tasks per user. At scale you would push filtering into the Supabase query with .ilike() and .eq() to reduce payload size.

**No position column for card ordering**
Tasks are sorted by created_at ASC. Drag-and-drop moves cards between columns but not within a column. Adding within-column ordering would require a position integer column and a reordering algorithm on every drop -- a meaningful increase in complexity for limited UX gain at this scale.

**Single active sprint enforced at DB level**
A partial unique index on (user_id) WHERE is_active = true means only one active sprint can exist per user regardless of what the UI does. The UI also enforces this by hiding the create form when a sprint is active, but the DB constraint is the real safety net.
