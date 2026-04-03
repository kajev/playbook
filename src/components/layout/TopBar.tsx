/**
 * components/layout/TopBar.tsx -- Top header bar
 *
 * The command center strip across the top of the board. Contains (left to right):
 *   1. Sprint banner  -- live sprint name, days left, completion %, progress bar
 *   2. Stats strip    -- total tasks, done count, overdue count, in-flight count
 *   3. Search input   -- filters tasks by title or description (client-side)
 *   4. Priority filter -- select: all / high / normal / low
 *   5. Label filter   -- select: all / any label currently in use on a task
 *   6. New task button -- opens the create modal via onOpenCreateModal prop
 *
 * Push 5 changes vs Push 4:
 *   - Sprint banner placeholder replaced with live SprintBanner section
 *   - Stats strip placeholder replaced with live StatsStrip section
 *   - Label filter <select> added next to priority filter
 *   - "New task" button now calls onOpenCreateModal prop (no more window hack)
 *   - TopBar is now purely presentational -- no hooks inside, all data via props
 *
 * Props:
 *   sprint          : Sprint | null   -- active sprint or null
 *   sprintLoading   : boolean         -- show skeleton while fetching
 *   sprintError     : string | null   -- show error state if fetch fails
 *   stats           : BoardStats      -- { total, done, overdue, inFlight }
 *   tasks           : Task[]          -- full task list, used to derive label options
 *   filters         : FilterState     -- current search/priority/label values
 *   onFiltersChange : callback        -- update filters in AppLayout
 *   onOpenCreateModal : callback      -- open the Board's create task modal
 *
 * Design:
 *   h-[60px]         -- fixed height; matches sidebar logo area for visual alignment
 *   bg-pitch-900     -- slightly lighter than pitch-950 body, creates subtle depth
 *   border-b         -- thin separator between header and board content below
 *   z-10             -- header stays above board columns when they scroll
 */

import { useMemo } from 'react'
import { Search, SlidersHorizontal, Plus, Tag, Zap, AlertCircle } from 'lucide-react'
import { computeSprintProgress } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { FilterState, Sprint, Task, TaskPriority } from '@/types'
import type { BoardStats } from '@/lib/utils'

// ─── Props ─────────────────────────────────────────────────────────────────────

interface TopBarProps {
  /** Active sprint from useSprint(), or null if no sprint is running */
  sprint:        Sprint | null
  /** True while the first sprint fetch is in progress */
  sprintLoading: boolean
  /** Error string if the sprint fetch failed, null otherwise */
  sprintError:   string | null
  /** Computed stats from computeBoardStats(tasks) in AppLayout */
  stats:         BoardStats
  /** Full tasks array -- used to derive the label filter dropdown options */
  tasks:         Task[]
  /** Current filter values from AppLayout state */
  filters:       FilterState
  /** Callback to update filter values in AppLayout */
  onFiltersChange: (filters: FilterState) => void
  /** Callback to open the Board's create task modal */
  onOpenCreateModal: () => void
  /** Callback to open the sprint create/edit modal */
  onOpenSprintModal: () => void
}

// ─── Priority filter options ───────────────────────────────────────────────────

/**
 * PRIORITY_OPTIONS -- the items in the priority filter <select>.
 * 'all' is the "show everything" default state.
 */
const PRIORITY_OPTIONS: { value: TaskPriority | 'all'; label: string }[] = [
  { value: 'all',    label: 'All priorities' },
  { value: 'high',   label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low',    label: 'Low' },
]

// ─── Sprint Banner ─────────────────────────────────────────────────────────────

/**
 * SprintBanner -- the left section of the TopBar showing the active sprint.
 *
 * States:
 *   loading  --> animated skeleton pulse (sprintLoading is true)
 *   error    --> small error badge (sprint fetch failed)
 *   no sprint --> muted "No active sprint" chip (sprint is null)
 *   active    --> sprint name, days left, completion %, progress bar
 *
 * The progress bar has two layers:
 *   - Gray base track (full width)
 *   - Volt foreground (width = taskPct %)
 *   - Animated shimmer overlay on the foreground for energy
 *
 * computeSprintProgress is called here directly because it needs tasks[].
 * AppLayout already has tasks so we pass them as a prop rather than
 * making Sprint Banner re-derive them from Supabase.
 */
interface SprintBannerProps {
  sprint:            Sprint | null
  sprintLoading:     boolean
  sprintError:       string | null
  tasks:             Task[]
  onOpenSprintModal: () => void
}

function SprintBanner({ sprint, sprintLoading, sprintError, tasks, onOpenSprintModal }: SprintBannerProps) {

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (sprintLoading) {
    return (
      /**
       * Skeleton: same outer shape as the live banner but filled with
       * animated gray pulses instead of real content.
       * animate-pulse is a Tailwind utility that fades opacity 1 -> 0.5 -> 1.
       */
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pitch-800 border border-pitch-500/30 animate-pulse">
        {/* Simulated pulsing dot */}
        <div className="w-1.5 h-1.5 rounded-full bg-pitch-600" />
        {/* Simulated text placeholder */}
        <div className="w-28 h-3 rounded bg-pitch-600" />
        {/* Simulated progress bar */}
        <div className="w-16 h-1.5 rounded-full bg-pitch-600" />
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────────

  if (sprintError) {
    return (
      /**
       * Error: small red-tinted chip with an alert icon.
       * We don't show the error message text inline (it can be long and technical).
       * The icon is enough to signal "something is wrong" without cluttering the header.
       */
      <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/50 border border-red-500/30 text-red-400">
        <AlertCircle size={12} />
        <span className="font-mono text-[11px]">Sprint unavailable</span>
      </div>
    )
  }

  // ── No sprint state ─────────────────────────────────────────────────────────

  if (!sprint) {
    return (
      /**
       * No sprint: muted chip telling the user no sprint is active.
       * In Push 8 this will have a "Start sprint" button that opens a modal.
       * For now it is informational only.
       */
      /**
       * No sprint chip is now a button -- clicking opens SprintModal to create one.
       * cursor-pointer + hover state signals interactivity.
       * Sports copy: "Start a sprint" on hover via title tooltip.
       */
      <button
        onClick={onOpenSprintModal}
        title="Start a sprint"
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pitch-800/60 border border-pitch-500/20 text-pitch-500 cursor-pointer hover:border-volt-500/30 hover:text-pitch-300 transition-colors duration-150"
      >
        <Zap size={12} className="opacity-50" />
        <span className="font-mono text-[11px]">Start a sprint</span>
      </button>
    )
  }

  // ── Active sprint state ─────────────────────────────────────────────────────

  /**
   * computeSprintProgress returns:
   *   taskPct  : 0-100  -- % of tasks with status === 'done'
   *   timePct  : 0-100  -- % of sprint time elapsed (start to end)
   *   daysLeft : number -- days remaining until end_date (0 if past)
   *
   * We show taskPct in the label (more meaningful -- user controls this)
   * and use taskPct for the progress bar width (shows work completion, not time).
   */
  const { taskPct, daysLeft } = computeSprintProgress(
    sprint.start_date,
    sprint.end_date,
    tasks,
  )

  /**
   * daysLeftLabel -- human-readable days remaining.
   * "0d left" means the sprint ends today.
   * Negative is not shown (computeSprintProgress clamps daysLeft to 0).
   */
  const daysLeftLabel = daysLeft === 0
    ? 'Ends today'
    : daysLeft === 1
      ? '1d left'
      : `${daysLeft}d left`

  /**
   * progressBarColor -- changes the bar color based on completion %.
   *   0-49%  : volt-500 (neon green) -- normal progress
   *   50-79% : volt-400              -- getting there
   *   80-100%: green accent          -- almost done, positive reinforcement
   *
   * The bar color gives a quick at-a-glance health signal for the sprint.
   */
  const progressBarColor =
    taskPct >= 80 ? 'bg-green-400'
    : taskPct >= 50 ? 'bg-volt-400'
    : 'bg-volt-500'

  return (
    /**
     * Sprint banner chip.
     * hidden on small screens (lg:flex) to prevent the header from overflowing
     * on narrow viewports where the filter controls take priority.
     *
     * Layout: horizontal flex with a divider between name/meta and the progress bar.
     */
    /**
     * Active sprint banner is a button -- clicking opens SprintModal to edit or end.
     * hover:border-volt-500/40 signals interactivity without overwhelming the banner.
     */
    <button
      onClick={onOpenSprintModal}
      title="Edit sprint"
      className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-pitch-800 border border-pitch-500/30 max-w-[320px] cursor-pointer hover:border-volt-500/40 transition-colors duration-150"
    >

      {/* Pulsing volt dot -- signals "sprint is live" */}
      <span className="w-1.5 h-1.5 rounded-full bg-volt-500 animate-pulse shrink-0" />

      {/* Sprint name -- truncated with ellipsis if it overflows */}
      <span
        className="font-display text-[12px] font-600 text-pitch-100 truncate"
        title={sprint.name} // Full name in tooltip on hover
      >
        {sprint.name}
      </span>

      {/* Divider dot */}
      <span className="text-pitch-600 text-[10px] shrink-0">·</span>

      {/* Days left counter */}
      <span className="font-mono text-[11px] text-pitch-300 shrink-0 whitespace-nowrap">
        {daysLeftLabel}
      </span>

      {/* Divider dot */}
      <span className="text-pitch-600 text-[10px] shrink-0">·</span>

      {/* Task completion percentage */}
      <span className="font-mono text-[11px] text-pitch-300 shrink-0 whitespace-nowrap">
        {taskPct}%
      </span>

      {/*
        * Progress bar track + fill.
        * Fixed width (w-16 = 64px) so it doesn't stretch the banner.
        * The fill uses inline style for the dynamic width (Tailwind can't do
        * arbitrary % widths with arbitrary values in a className string at runtime).
        *
        * We intentionally do NOT use Tailwind's w-[${taskPct}%] pattern because
        * Tailwind's JIT only scans static class strings -- dynamic template
        * literals are not detected and the class would not be generated.
        * Inline style is the correct approach for runtime-computed widths.
      */}
      <div className="w-16 h-1.5 rounded-full bg-pitch-600/50 overflow-hidden shrink-0">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            progressBarColor,
          )}
          style={{ width: `${taskPct}%` }} // Dynamic width via inline style (see above)
        />
      </div>

    </button>
  )
}

// ─── Stats Strip ───────────────────────────────────────────────────────────────

/**
 * StatsStrip -- compact metrics bar showing board health at a glance.
 *
 * Shows four stats in a row: total | done | in-flight | overdue
 *
 * Design decisions:
 *   - font-mono for all numbers -- monospaced digits don't shift layout when
 *     single-digit counts become double-digit (1 -> 10 would reflow proportional font).
 *   - overdue shown in red when > 0 -- immediate visual alarm.
 *   - "in-flight" = in_progress + in_review combined -- matches the sports
 *     metaphor of plays currently running on the field.
 *   - Hidden on small screens (lg:flex) for the same reason as SprintBanner.
 */
interface StatsStripProps {
  stats: BoardStats
}

function StatsStrip({ stats }: StatsStripProps) {
  return (
    /**
     * Subtle pill container.
     * gap-3 between stat items, dividers are just text "·" characters
     * styled in pitch-600 so they don't draw attention.
     */
    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pitch-800/50 border border-pitch-500/20 text-[11px] font-mono">

      {/* Total tasks */}
      <span className="text-pitch-300">
        <span className="text-pitch-100 font-600">{stats.total}</span>
        {' '}tasks
      </span>

      <span className="text-pitch-600">·</span>

      {/* Done count */}
      <span className="text-pitch-300">
        <span className="text-volt-500 font-600">{stats.done}</span>
        {' '}done
      </span>

      <span className="text-pitch-600">·</span>

      {/* In-flight (in_progress + in_review) */}
      <span className="text-pitch-300">
        <span className="text-amber-400 font-600">{stats.inFlight}</span>
        {' '}in play
      </span>

      <span className="text-pitch-600">·</span>

      {/*
        * Overdue count -- red when there are overdue tasks, muted otherwise.
        * The color change draws the eye immediately when something is behind schedule.
        * "0 late" in muted gray means all clear.
      */}
      <span className={cn(
        stats.overdue > 0 ? 'text-red-400' : 'text-pitch-500',
      )}>
        <span className={cn(
          'font-600',
          stats.overdue > 0 ? 'text-red-300' : 'text-pitch-500',
        )}>
          {stats.overdue}
        </span>
        {' '}late
      </span>

    </div>
  )
}

// ─── TopBar ─────────────────────────────────────────────────────────────────────

export function TopBar({
  sprint,
  sprintLoading,
  sprintError,
  stats,
  tasks,
  filters,
  onFiltersChange,
  onOpenCreateModal,
  onOpenSprintModal,
}: TopBarProps) {

  // ── Derived label options ───────────────────────────────────────────────────

  /**
   * labelOptions -- unique sorted list of all labels currently on any task.
   *
   * Why useMemo?
   *   tasks[] can have hundreds of items. Without memoization, this flattens
   *   and deduplicates the labels array on every render (including renders
   *   triggered by typing in the search box). useMemo caches the result and
   *   only recomputes when tasks[] actually changes (new task added, label edited).
   *
   * Logic:
   *   1. Flatten: tasks.flatMap(t => t.labels) -- one string[] from all tasks
   *   2. Deduplicate: new Set(...) -- removes duplicates
   *   3. Sort: Array.from().sort() -- alphabetical order for consistent UX
   *
   * If no tasks have labels, labelOptions is [] and the select only shows "All labels".
   */
  const labelOptions = useMemo(() => {
    const allLabels = tasks.flatMap(t => t.labels ?? [])
    return Array.from(new Set(allLabels)).sort()
  }, [tasks])

  // ── Filter change handlers ──────────────────────────────────────────────────

  /**
   * handleSearchChange -- updates filters.search as the user types.
   * Spread pattern: keeps all other filter values, overrides only search.
   * This is a controlled component -- value comes from props, not local state.
   */
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    onFiltersChange({ ...filters, search: e.target.value })
  }

  /**
   * handlePriorityChange -- updates filters.priority from the select value.
   * The select's value is a raw string; we cast it to our union type.
   * TypeScript trusts us here because the <option> values are restricted
   * to valid TaskPriority | 'all' values in PRIORITY_OPTIONS above.
   */
  function handlePriorityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onFiltersChange({ ...filters, priority: e.target.value as TaskPriority | 'all' })
  }

  /**
   * handleLabelChange -- updates filters.label from the label select.
   * '' (empty string) means "show all" -- matches the FilterState default
   * and the check in applyFilters: `if (filters.label && ...)`.
   */
  function handleLabelChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onFiltersChange({ ...filters, label: e.target.value })
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    /**
     * Header element:
     *   h-[60px]    -- fixed height, same as sidebar logo area for alignment
     *   flex        -- all children in a horizontal row
     *   items-center-- vertically centered in the 60px height
     *   gap-3       -- consistent spacing between all sections
     *   px-6        -- left/right padding matches the board's px-6
     *   bg-pitch-900-- slightly lighter than pitch-950 to create a header layer
     *   border-b    -- thin line separating header from board content
     *   z-10        -- header sits above board columns on the z-axis
     *   shrink-0    -- header does not shrink when the window is narrow
     */
    <header className="h-[60px] flex items-center gap-3 px-6 bg-pitch-900 border-b border-pitch-500/30 z-10 shrink-0">

      {/* ── Sprint Banner ────────────────────────────────────────────────────── */}
      {/*
        * SprintBanner handles its own four states internally:
        * loading / error / no sprint / active sprint.
        * We pass all needed props and let it decide what to render.
      */}
      <SprintBanner
        sprint={sprint}
        sprintLoading={sprintLoading}
        sprintError={sprintError}
        tasks={tasks}
        onOpenSprintModal={onOpenSprintModal}
      />

      {/* ── Stats Strip ──────────────────────────────────────────────────────── */}
      {/*
        * StatsStrip is always shown (never loading -- stats are derived instantly
        * from tasks[] in memory, not fetched separately).
        * While tasks are still loading, stats will show zeros -- that's fine.
      */}
      <StatsStrip stats={stats} />

      {/* ── Spacer -- pushes all filter controls to the right ─────────────── */}
      {/*
        * flex-1 takes up all available space between the left sections
        * (banner + stats) and the right section (search + filters + button).
        * This is the classic "push to right" flex spacer pattern.
      */}
      <div className="flex-1" />

      {/* ── Search Input ────────────────────────────────────────────────────── */}
      {/*
        * Controlled input -- value bound to filters.search, onChange updates it.
        * The Search icon is positioned absolutely inside a relative wrapper.
        * pl-8 on the input reserves space so text doesn't overlap the icon.
        *
        * applyFilters in utils.ts already checks both title and description,
        * so this single input searches across both fields.
      */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pitch-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search tasks..."
          value={filters.search}
          onChange={handleSearchChange}
          className={cn(
            // Size and spacing
            'w-[180px] h-8 pl-8 pr-3',
            // Typography
            'font-sans text-[13px] text-pitch-100 placeholder:text-pitch-400',
            // Background and border
            'bg-pitch-800 border border-pitch-500/40 rounded-lg',
            // Focus state -- volt outline for consistency with accent color
            'focus:outline-none focus:border-volt-500/60 focus:bg-pitch-700',
            // Smooth focus transition
            'transition-colors duration-150',
          )}
        />
      </div>

      {/* ── Priority Filter ─────────────────────────────────────────────────── */}
      {/*
        * Native <select> styled to match dark theme.
        * We use native select for simplicity -- a custom dropdown would require
        * significant extra code for keyboard navigation and accessibility.
        *
        * The SlidersHorizontal icon sits left of the select text using
        * the same relative/absolute icon-in-input pattern as the search box.
        *
        * appearance-none removes the browser's native select arrow so we control
        * the full visual. The browser still handles dropdown behavior.
      */}
      <div className="relative">
        <SlidersHorizontal
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pitch-400 pointer-events-none"
        />
        <select
          value={filters.priority}
          onChange={handlePriorityChange}
          className={cn(
            'h-8 pl-8 pr-6 appearance-none cursor-pointer',
            'font-sans text-[13px] text-pitch-100',
            'bg-pitch-800 border border-pitch-500/40 rounded-lg',
            'focus:outline-none focus:border-volt-500/60',
            'transition-colors duration-150',
          )}
        >
          {PRIORITY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Label Filter ────────────────────────────────────────────────────── */}
      {/*
        * Label dropdown -- populated dynamically from labels in use across tasks.
        *
        * The options list is derived by useMemo above:
        *   flatMap all task.labels[], deduplicate with Set, sort alphabetically.
        *
        * '' (empty string) value = "All labels" = no filter applied.
        * applyFilters in utils.ts checks: `if (filters.label && ...)` so an
        * empty string correctly means "skip the label filter".
        *
        * The Tag icon identifies this as a label filter visually without needing
        * a text label -- keeping the header compact.
        *
        * If no labels exist yet (new board), the dropdown only shows "All labels"
        * and is effectively a no-op -- that's the correct behavior.
      */}
      <div className="relative">
        <Tag
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-pitch-400 pointer-events-none"
        />
        <select
          value={filters.label}
          onChange={handleLabelChange}
          className={cn(
            'h-8 pl-8 pr-6 appearance-none cursor-pointer',
            'font-sans text-[13px] text-pitch-100',
            'bg-pitch-800 border border-pitch-500/40 rounded-lg',
            'focus:outline-none focus:border-volt-500/60',
            'transition-colors duration-150',
          )}
        >
          {/* Default "no filter" option */}
          <option value="">All labels</option>

          {/*
            * One <option> per unique label in use.
            * If labelOptions is empty (no labels on any task), this renders
            * nothing -- the select just shows "All labels" as the only choice.
          */}
          {labelOptions.map(label => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* ── New Task Button ─────────────────────────────────────────────────── */}
      {/*
        * Push 5 change: calls onOpenCreateModal prop instead of the
        * window.__openCreateTask hack from Push 4.
        *
        * onOpenCreateModal is passed from AppLayout, which wires it to
        * openCreateModalRef.current (Board registers its handler into the ref).
        *
        * Design: volt (neon green) background = the single high-contrast CTA
        * on the page. Users immediately identify it as the primary action.
        * shadow-volt is a custom Tailwind shadow defined in tailwind.config.js
        * that gives the button a subtle neon glow on the dark background.
      */}
      <button
        onClick={onOpenCreateModal}
        className={cn(
          'flex items-center gap-1.5 h-8 px-3',
          'bg-volt-500 hover:bg-volt-400 active:bg-volt-600',
          // pitch-950 text on volt background -- maximum contrast for the CTA
          'text-pitch-950 font-sans font-600 text-[13px]',
          'rounded-lg transition-colors duration-150',
          'shadow-volt',
        )}
      >
        <Plus size={14} strokeWidth={2.5} />
        New task
      </button>

    </header>
  )
}
