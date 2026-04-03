/**
 * components/board/TaskCard.tsx — Individual task card
 *
 * Renders a single task as a card inside a Kanban column.
 * In Push 3 this is a static card (no drag handles yet — those come in Push 4
 * when we wire up dnd-kit). The card is fully styled and data-driven.
 *
 * Visual anatomy of a card (top to bottom):
 *   ┌─────────────────────────────────┐
 *   │ [●] Title text             [›]  │  ← title row + hover chevron
 *   │     Description excerpt          │  ← optional, 2-line clamp
 *   │     [Label] [Label]              │  ← optional label pills
 *   │     [due badge]                  │  ← optional due date
 *   └─────────────────────────────────┘
 *
 * Done tasks:
 *   - Whole card at 50% opacity (complete but not hidden)
 *   - Title has line-through strikethrough
 *   - Due date badge hidden (irrelevant once done)
 *
 * Props:
 *   task       — the Task object to render
 *   onClick    — called when the card body is clicked (opens detail modal in Push 4)
 *   isDragging — true when dnd-kit is dragging this card (Push 4 wires this up).
 *                The static card accepts this prop now so the same component
 *                can be used as the drag overlay preview in Push 4 without changes.
 */

import { cn, formatDueDate, getDueDateStatus, getLabelStyle } from '@/lib/utils'
import { PRIORITY_CONFIG } from '@/types'
import type { Task } from '@/types'

interface TaskCardProps {
  task: Task
  onClick?: () => void
  /** True when dnd-kit is actively dragging this card */
  isDragging?: boolean
}

export function TaskCard({ task, onClick, isDragging = false }: TaskCardProps) {

  // ── Derived display values ─────────────────────────────────────────────────

  /**
   * priorityConfig — display metadata for this task's priority.
   * { label: 'High', color: 'text-red-400', dotColor: 'bg-red-500' }
   * Sourced from PRIORITY_CONFIG in types/index.ts — single source of truth.
   */
  const priorityConfig = PRIORITY_CONFIG[task.priority]

  /**
   * dueDateStatus — 'overdue' | 'soon' | 'ok' | null
   * null = no due date set → badge not rendered.
   * Computed by comparing due_date string to today's date in utils.ts.
   */
  const dueDateStatus = getDueDateStatus(task.due_date)

  /**
   * dueDateLabel — human-readable string for the badge.
   * Examples: "2d overdue", "Due today", "Due tomorrow", "Due Mar 15"
   * null when no due date is set.
   */
  const dueDateLabel = formatDueDate(task.due_date)

  /**
   * isDone — true when this task is in the Done column.
   * Controls opacity and strikethrough styling.
   * We derive this from status (not a separate boolean) so there's
   * exactly one source of truth for completion state.
   */
  const isDone = task.status === 'done'

  // ── Due date badge Tailwind classes ───────────────────────────────────────

  /**
   * dueBadgeClasses — maps DueDateStatus to Tailwind color classes.
   *
   * overdue → red  (urgent — needs immediate attention)
   * soon    → amber (warning — coming up)
   * ok      → muted gray (informational only)
   *
   * Using /15 opacity on backgrounds keeps the badge readable without
   * being too loud on the dark card background.
   */
  const dueBadgeClasses: Record<string, string> = {
    overdue: 'bg-red-500/15 text-red-400 border border-red-500/20',
    soon:    'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    ok:      'bg-pitch-600/50 text-pitch-300 border border-pitch-500/20',
  }

  return (
    /**
     * Card container:
     *
     * Base:
     *   bg-pitch-700 — card bg, one step lighter than column bg-pitch-800
     *   border-pitch-500/30 — subtle border, 30% opacity
     *   rounded-card — 10px radius from tailwind.config.js
     *   group — enables group-hover on the chevron icon
     *   select-none — prevents text selection during drag
     *
     * Hover:
     *   bg-pitch-600 — lighter bg on hover
     *   border-pitch-400/40 — stronger border on hover
     *   shadow-card-hover — larger shadow (card "rises")
     *
     * Dragging (isDragging=true, set by dnd-kit in Push 4):
     *   shadow-drag — very large shadow (card floating above board)
     *   rotate-1 — 1° tilt clockwise (classic drag affordance)
     *   scale-[1.02] — 2% scale up
     *   z-50 — above all other cards
     *   border-volt-500/30 — volt-tinted border during drag
     *
     * Done (isDone=true):
     *   opacity-50 — dims the card so attention goes to active work
     */
    <div
      onClick={onClick}
      className={cn(
        'relative p-3 rounded-card cursor-pointer select-none',
        'bg-pitch-700 border border-pitch-500/30',
        'transition-all duration-150',
        'group', // enables group-hover on children
        'hover:bg-pitch-600 hover:border-pitch-400/40 hover:shadow-card-hover',
        'animate-fade-up',
        // Dragging visual state
        isDragging && [
          'shadow-drag rotate-1 scale-[1.02] z-50',
          'border-volt-500/30 bg-pitch-600',
        ],
        // Done visual state
        isDone && 'opacity-50',
      )}
    >

      {/* ── Title Row ─────────────────────────────────────────────────────── */}
      {/*
        * Priority dot (colored circle) + task title on the same row.
        * items-start because the dot should align with the first line of text,
        * not the center when the title wraps to multiple lines.
        * mt-[5px] on the dot nudges it down to align with the text cap-height.
      */}
      <div className="flex items-start gap-2 mb-2 pr-4">
        {/*
          * Priority dot — 6×6px filled circle.
          * Color class comes from PRIORITY_CONFIG[priority].dotColor.
          * flex-shrink-0 prevents it from being squished when the title is long.
          * title and aria-label for accessibility.
        */}
        <div
          className={cn(
            'w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0',
            priorityConfig.dotColor,
          )}
          title={`${priorityConfig.label} priority`}
          aria-label={`Priority: ${priorityConfig.label}`}
        />

        {/* Task title — clamps to 2 lines max */}
        <h3
          className={cn(
            'font-sans font-500 text-[13px] leading-snug line-clamp-2',
            isDone
              ? 'text-pitch-300 line-through decoration-pitch-400'
              : 'text-pitch-50',
          )}
        >
          {task.title}
        </h3>
      </div>

      {/* ── Description ───────────────────────────────────────────────────── */}
      {/*
        * Only rendered when description exists (not null or empty string).
        * ml-3.5 aligns with the title text (left-indented past the priority dot).
        * Clamped to 2 lines — full text is in the detail modal (Push 4).
      */}
      {task.description && (
        <p className="font-sans text-[12px] text-pitch-300 leading-relaxed line-clamp-2 mb-2 ml-3.5">
          {task.description}
        </p>
      )}

      {/* ── Labels ────────────────────────────────────────────────────────── */}
      {/*
        * Pill badges for each label. Only rendered when labels array is non-empty.
        * Colors come from getLabelStyle() in utils.ts which maps label strings
        * to { bg, text } Tailwind class pairs.
        *
        * We show at most 3 labels, then "+N" for any overflow.
        * This keeps cards a consistent height when tasks have many labels.
      */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 ml-3.5">
          {task.labels.slice(0, 3).map(label => {
            const style = getLabelStyle(label)
            return (
              <span
                key={label}
                className={cn(
                  'inline-flex items-center px-1.5 py-0.5 rounded-md',
                  'font-mono text-[10px] font-500',
                  style.bg,
                  style.text,
                )}
              >
                {label}
              </span>
            )
          })}

          {/* Overflow indicator: "+2 more" etc. */}
          {task.labels.length > 3 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md font-mono text-[10px] bg-pitch-600/50 text-pitch-300">
              +{task.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* ── Due Date Badge ────────────────────────────────────────────────── */}
      {/*
        * Only rendered when:
        *   a) Task has a due_date (dueDateLabel is not null)
        *   b) Task is NOT done (due dates are irrelevant on completed tasks)
        *
        * The badge color reflects urgency:
        *   overdue → red badge (2d overdue)
        *   soon    → amber badge (Due today / Due tomorrow / Due in 2d)
        *   ok      → gray badge (Due Mar 15)
      */}
      {dueDateLabel && !isDone && dueDateStatus && (
        <div className="ml-3.5 mt-1">
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded-md',
              'font-mono text-[10px]',
              dueBadgeClasses[dueDateStatus],
            )}
          >
            {dueDateLabel}
          </span>
        </div>
      )}

      {/* ── Hover Chevron ─────────────────────────────────────────────────── */}
      {/*
        * A subtle right-pointing chevron that fades in on card hover.
        * Signals the card is clickable (opens the detail modal).
        * Uses group-hover tied to the card's `group` class.
        * Positioned absolutely in the top-right corner so it doesn't
        * affect the card's layout or push content around.
        *
        * We use an inline SVG path rather than a Lucide icon to keep
        * the size exact and avoid the import overhead for one small glyph.
      */}
      <div
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        aria-hidden="true"
      >
        {/*
          * text-pitch-400 on the <svg> sets CSS color: <pitch-400>.
          * stroke="currentColor" on the path then inherits that color.
          * Putting className on the <path> wouldn't work — currentColor
          * reads from the nearest ancestor with a CSS `color` property.
        */}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-pitch-400">
          <path
            d="M4.5 2.5L8 6L4.5 9.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

    </div>
  )
}
