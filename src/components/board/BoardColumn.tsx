import React from 'react'
/**
 * components/board/BoardColumn.tsx — A single Kanban column
 *
 * Renders one of the four columns (To Do / In Progress / In Review / Done).
 * In Push 3 this is a static column — no droppable zones yet (those come
 * in Push 4 with dnd-kit). The column is fully styled and ready to receive
 * dnd-kit's useDroppable wrapper in Push 4 without any layout changes.
 *
 * Visual anatomy:
 *   ┌─────────────────────────────┐
 *   │  Column Title        [N]    │  ← header: title + task count badge
 *   │  ──────────────────────     │  ← divider
 *   │  [TaskCard]                 │  ← scrollable task list
 *   │  [TaskCard]                 │
 *   │  [TaskCard]                 │
 *   │                             │  ← empty state (when no tasks)
 *   │  [+ Add task]               │  ← add button at bottom (Push 4)
 *   └─────────────────────────────┘
 *
 * Column color accents:
 *   todo        → pitch-400 (neutral gray)
 *   in_progress → volt-500 (electric lime — active/energetic)
 *   in_review   → amber-400 (review/caution)
 *   done        → green-500 (complete/success)
 *
 * Props:
 *   status    — the TaskStatus for this column (determines title + accent color)
 *   tasks     — the tasks belonging to this column (already filtered by useBoardState)
 *   onTaskClick — callback when a task card is clicked
 *   isOver    — true when a card is being dragged over this column (Push 4)
 *               Accepted now so Push 4 can pass it without changing this component.
 */

import { cn } from '@/lib/utils'
import { isUrgentColumn } from '@/hooks/useBoardState'
import { TaskCard } from './TaskCard'
import type { Task, TaskStatus } from '@/types'

// ─── Column configuration ──────────────────────────────────────────────────────

/**
 * COLUMN_CONFIG — display metadata for each column status.
 *
 * accent: Tailwind color class for the column's left border accent and count badge.
 * label:  The human-readable column header text.
 * emptyMessage: What to show when the column has no tasks.
 *
 * We keep this here (not in types/index.ts) because it's visual config,
 * not data/domain config — it only matters to this component.
 */
const COLUMN_CONFIG: Record<TaskStatus, {
  label: string
  accent: string
  badgeBg: string
  badgeText: string
  emptyMessage: string
}> = {
  todo: {
    label:        'To Do',
    accent:       'border-pitch-400',
    badgeBg:      'bg-pitch-600',
    badgeText:    'text-pitch-200',
    emptyMessage: 'No plays in the backlog.',
  },
  in_progress: {
    label:        'In Progress',
    accent:       'border-volt-500',
    badgeBg:      'bg-volt-500/20',
    badgeText:    'text-volt-400',
    emptyMessage: 'No plays in motion.',
  },
  in_review: {
    label:        'In Review',
    accent:       'border-amber-400',
    badgeBg:      'bg-amber-500/20',
    badgeText:    'text-amber-400',
    emptyMessage: 'Nothing on the review board.',
  },
  done: {
    label:        'Done',
    accent:       'border-green-500',
    badgeBg:      'bg-green-500/20',
    badgeText:    'text-green-400',
    emptyMessage: 'No plays completed yet.',
  },
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface BoardColumnProps {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
  /**
   * Called when the user clicks the "+ Add task" button at the bottom of this column.
   * Board uses this to open the CreateTaskModal with the column's status pre-selected.
   */
  onAddTask: (status: TaskStatus) => void
  /**
   * Optional render prop for each task card.
   * Board passes this to wrap cards with DraggableCard (dnd-kit).
   * If not provided, BoardColumn renders TaskCard directly (used in BoardSkeleton
   * and any context where drag-and-drop is not needed).
   * Render props let Board inject drag behaviour without BoardColumn knowing about dnd-kit.
   */
  renderTask?: (task: Task) => React.ReactNode
  /**
   * True when a card is being dragged over this column.
   * Passed by dnd-kit's useDroppable in Push 4.
   */
  isOver?: boolean
}

export function BoardColumn({ status, tasks, onTaskClick, onAddTask, renderTask, isOver = false }: BoardColumnProps) {
  const config = COLUMN_CONFIG[status]

  /**
   * hasUrgentTask — true if any task in this column is overdue.
   * Drives the red glow on the count badge for urgent columns.
   * We call isUrgentColumn() from useBoardState — it's a pure function,
   * not a hook, so calling it here in render is fine.
   */
  const hasUrgentTask = isUrgentColumn(tasks)

  return (
    /**
     * Column outer container:
     *
     * w-column / min-w-column — 280px fixed width from tailwind.config.js.
     *   Fixed width means columns don't stretch when the board is wide.
     *   The board has horizontal scroll for many columns.
     *
     * flex-col — stacks header, divider, scroll area vertically.
     *
     * bg-pitch-800 — column background, between the board bg (pitch-950)
     *   and card bg (pitch-700) in the depth hierarchy.
     *
     * rounded-col — 12px radius from tailwind.config.js.
     *
     * border-t-2 + config.accent — the top colored bar that visually identifies
     *   each column (volt for in_progress, amber for in_review, etc.).
     *
     * isOver (drag-over state, Push 4):
     *   - drag-over CSS class (defined in index.css) adds volt border + shadow
     *   - This is toggled by the Board component via dnd-kit's over state
     */
    <div
      className={cn(
        'flex flex-col w-column min-w-column rounded-col',
        'bg-pitch-800 border border-pitch-500/20',
        // Top accent bar — 2px colored border identifies the column
        'border-t-2', config.accent,
        // Drag-over visual feedback (Push 4 will toggle this)
        isOver && 'drag-over',
      )}
    >

      {/* ── Column Header ──────────────────────────────────────────────────── */}
      {/*
        * Column title (left) + task count badge (right).
        * px-4 py-3 gives comfortable padding that matches the card's p-3.
        * shrink-0 prevents the header from being compressed when the
        * task list is long and the column is at max height.
      */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">

        {/* Column title */}
        <h2 className="font-sans font-500 text-[11px] text-pitch-200 tracking-widest uppercase">
          {config.label}
        </h2>

        {/* Task count badge */}
        {/*
          * Shows the number of tasks in this column (after filtering).
          * Color changes to red when any task is overdue (hasUrgentTask).
          * This gives a "at a glance" urgency signal on the column header.
          *
          * Normal: subtle bg matching the column's accent color.
          * Urgent: red bg to signal something needs attention.
        */}
        <span
          className={cn(
            'min-w-[20px] h-5 px-1.5 rounded-full',
            'font-mono text-[11px] font-500',
            'flex items-center justify-center',
            // Urgent override takes priority over normal accent color
            hasUrgentTask && status !== 'done'
              ? 'bg-red-500/20 text-red-400'
              : [config.badgeBg, config.badgeText],
          )}
        >
          {tasks.length}
        </span>

      </div>

      {/* ── Divider ────────────────────────────────────────────────────────── */}
      <div className="h-px bg-pitch-500/20 mx-3 shrink-0" />

      {/* ── Task List ──────────────────────────────────────────────────────── */}
      {/*
        * flex-1: fills all remaining vertical space in the column.
        * overflow-y-auto: this is the scroll container for tasks —
        *   the column itself doesn't scroll, only this inner area does.
        * The custom scrollbar from index.css applies here.
        *
        * p-3 + gap-2: 12px padding around the list, 8px gap between cards.
        * The gap is intentionally tight — cards are the focus, not the space.
        *
        * min-h-[120px]: ensures the column stays tall enough to be a visible
        *   drop target when empty (Push 4 — dnd-kit needs a target area).
      */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-[120px]">

        {tasks.length === 0 ? (
          /* ── Empty State ───────────────────────────────────────────────── */
          /*
           * Shown when there are no tasks in this column.
           * Sports-flavored copy (e.g. "No plays in motion") instead of
           * the generic "No tasks yet" — ties into the sports theme.
           *
           * The dashed border creates a visual "drop zone" hint —
           * in Push 4 this will be the landing area for dragged cards.
           *
           * flex-1 + items-center + justify-center centers the message
           * vertically in the remaining column space.
          */
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div
              className={cn(
                'w-full rounded-lg border-2 border-dashed border-pitch-600',
                'flex flex-col items-center justify-center py-6 px-4',
              )}
            >
              <p className="font-sans text-[12px] text-pitch-400 text-center leading-relaxed">
                {config.emptyMessage}
              </p>
            </div>
          </div>
        ) : (
          /* ── Task Cards ────────────────────────────────────────────────── */
          /*
           * Maps over the tasks for this column and renders a TaskCard for each.
           * key={task.id} uses the UUID — stable and unique, ideal for React keys.
           *
           * onTaskClick passes the full task object to the Board's handler
           * which will open the detail modal in Push 4.
           *
           * isDragging is always false here (Push 3 = static board).
           * In Push 4, dnd-kit's useSortable will pass isDragging=true
           * to the card that's being dragged.
          */
          tasks.map(task =>
            renderTask
              ? (
                  // renderTask is injected by Board to wrap with DraggableCard
                  <div key={task.id}>{renderTask(task)}</div>
                )
              : (
                  // Fallback: plain TaskCard (no drag-and-drop)
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task)}
                    isDragging={false}
                  />
                )
          )
        )}

      </div>

      {/* ── Add Task Footer ───────────────────────────────────────────────── */}
      {/*
        * A subtle "+ Add task" button at the bottom of each column.
        * In Push 3 it's rendered but non-functional (onClick placeholder).
        * In Push 4, clicking this will open the CreateTaskModal with
        * the column's status pre-selected.
        *
        * shrink-0 prevents it from being compressed when the task list is tall.
        * border-t separates it from the task list.
      */}
      <div className="shrink-0 border-t border-pitch-500/20 p-2">
        <button
          onClick={() => onAddTask(status)}
          className={cn(
            'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg',
            'font-sans text-[12px] text-pitch-400',
            'hover:text-pitch-200 hover:bg-pitch-700/50',
            'transition-colors duration-150',
          )}
        >
          {/* Plus icon — inline SVG for exact size control */}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-current">
            <path
              d="M6 2v8M2 6h8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Add task
        </button>
      </div>

    </div>
  )
}
