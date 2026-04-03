/**
 * components/layout/TopBar.tsx — Top header bar
 *
 * Contains (left to right):
 * - Board title
 * - Search input (filters tasks by title/description)
 * - Priority filter dropdown
 * - "New Task" button (wired up in Push 4)
 *
 * The sprint banner and stats strip will be added in Push 5.
 * They're stubbed out here with TODO comments so the layout
 * proportions are visible during Push 1/2/3.
 *
 * Props:
 * - filters: current FilterState from AppLayout
 * - onFiltersChange: callback to update filters in AppLayout
 *
 * Design notes:
 * - h-[60px]: fixed height, matches sidebar logo area
 * - The search input uses a controlled component pattern
 *   (value + onChange) so filtering is instant/reactive
 */

import { Search, SlidersHorizontal, Plus } from 'lucide-react'
import type { FilterState, TaskPriority } from '@/types'
import { cn } from '@/lib/utils'

interface TopBarProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
}

// Priority filter options — 'all' shows everything
const PRIORITY_OPTIONS: { value: TaskPriority | 'all'; label: string }[] = [
  { value: 'all',    label: 'All priorities' },
  { value: 'high',   label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low',    label: 'Low' },
]

export function TopBar({ filters, onFiltersChange }: TopBarProps) {
  /**
   * handleSearchChange — updates the search string in FilterState.
   *
   * We use a partial update pattern: spread the existing filters,
   * then override only the changed field. This prevents accidental
   * resets of other filter values when one field changes.
   */
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    onFiltersChange({ ...filters, search: e.target.value })
  }

  /**
   * handlePriorityChange — updates the priority filter.
   * The select value is a string, so we cast it to our union type.
   */
  function handlePriorityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onFiltersChange({ ...filters, priority: e.target.value as TaskPriority | 'all' })
  }

  return (
    /*
     * The top bar spans the full width of the main content area.
     * h-[60px]: fixed height — same as sidebar logo area for alignment.
     * border-b: subtle separator between header and board content.
     * z-10: ensures the header stays above board content when scrolling.
     */
    <header className="h-[60px] flex items-center gap-3 px-6 bg-pitch-900 border-b border-pitch-500/30 z-10 shrink-0">

      {/* ── Board Title ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mr-2">
        <h1 className="font-display font-600 text-pitch-50 text-[15px] tracking-tight">
          My Board
        </h1>
      </div>

      {/* ── Sprint Banner Placeholder (Push 5) ───────────────────────────── */}
      {/*
        * TODO Push 5: Replace this placeholder with the actual SprintBanner component.
        * The banner will show: "Sprint 3 — Season Launch · 8d left · 60% done"
        * with a thin progress bar beneath it.
      */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pitch-800 border border-pitch-500/30 text-[11px] text-pitch-300 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-volt-500 animate-pulse" />
        Sprint banner · Push 5
      </div>

      {/* ── Spacer — pushes controls to the right ─────────────────────────── */}
      <div className="flex-1" />

      {/* ── Stats Strip Placeholder (Push 5) ─────────────────────────────── */}
      {/*
        * TODO Push 5: Replace with the actual StatsStrip component.
        * Will show: "24 tasks · 6 done · 2 overdue" as quick-glance metrics.
      */}

      {/* ── Search Input ──────────────────────────────────────────────────── */}
      {/*
        * Controlled input — value comes from FilterState, onChange updates it.
        * The search icon is positioned absolutely inside a relative wrapper.
        * pl-8 on the input creates space so text doesn't overlap the icon.
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
            'w-[200px] h-8 pl-8 pr-3',
            // Typography
            'font-sans text-[13px] text-pitch-100 placeholder:text-pitch-400',
            // Background and border
            'bg-pitch-800 border border-pitch-500/40 rounded-lg',
            // Focus state — volt outline
            'focus:outline-none focus:border-volt-500/60 focus:bg-pitch-700',
            // Transition for smooth focus animation
            'transition-colors duration-150',
          )}
        />
      </div>

      {/* ── Priority Filter ───────────────────────────────────────────────── */}
      {/*
        * A native <select> element styled to match our dark theme.
        * We use native select for simplicity — a custom dropdown would
        * require significant additional code for keyboard nav and a11y.
        *
        * The SlidersHorizontal icon sits to the left of the select
        * using the same relative/absolute positioning as the search input.
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
            'h-8 pl-8 pr-7 appearance-none cursor-pointer',
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

      {/* ── New Task Button ───────────────────────────────────────────────── */}
      {/*
        * This button opens the CreateTaskModal in Push 4.
        * For now it's rendered but non-functional (onClick is a placeholder).
        *
        * Design: volt background on dark theme = high contrast CTA.
        * The button uses our accent color so it's immediately identifiable
        * as the primary action on the page.
      */}
      <button
        onClick={() => {
          /**
           * Call the create modal opener registered by Board on window.__openCreateTask.
           * Board sets this in a useEffect — it's always available when the board is mounted.
           * This avoids prop-drilling the handler through AppLayout → TopBar.
           * Push 5 replaces this with a proper AppLayout callback prop.
           */
          const opener = (window as unknown as { __openCreateTask?: () => void }).__openCreateTask
          opener?.()
        }}
        className={cn(
          'flex items-center gap-1.5 h-8 px-3',
          'bg-volt-500 hover:bg-volt-400 active:bg-volt-600',
          'text-pitch-950 font-sans font-500 text-[13px]',
          'rounded-lg transition-colors duration-150',
          // Shadow gives the button a slight "glow" on dark bg
          'shadow-volt',
        )}
      >
        <Plus size={14} strokeWidth={2.5} />
        New task
      </button>

    </header>
  )
}
