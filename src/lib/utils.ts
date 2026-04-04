/**
 * lib/utils.ts — Shared utility functions
 *
 * Small helpers used across multiple components.
 * Keep this file focused — only truly shared, stateless utilities belong here.
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInCalendarDays, parseISO, isValid } from 'date-fns'
import type { FilterState, Task } from '@/types'


// ─── Class Name Utility ───────────────────────────────────────────────────────

/**
 * cn — class name utility.
 *
 * Combines clsx (conditional class logic) with tailwind-merge (deduplication).
 * Without tailwind-merge, having both `bg-pitch-700` and `bg-pitch-900` in a
 * component would apply both, with the latter winning by specificity — which is
 * fragile. tailwind-merge resolves conflicts by keeping only the last value
 * from the same Tailwind "group" (like background-color).
 *
 * Usage:
 *   cn('px-4 py-2', isActive && 'bg-volt-500', className)
 *   cn('text-sm', { 'font-bold': isBold, 'text-red-400': hasError })
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}


// ─── Due Date Helpers ─────────────────────────────────────────────────────────

/**
 * DueDateStatus — what we display on the task card for due dates.
 */
export type DueDateStatus = 'overdue' | 'soon' | 'ok' | null

/**
 * getDueDateStatus — computes the urgency of a task's due date.
 *
 * Returns:
 *   'overdue' — past due (due_date is before today)
 *   'soon'    — due within 2 days (today or tomorrow)
 *   'ok'      — more than 2 days away
 *   null      — no due date set
 *
 * We use date-fns for reliable date math:
 * - parseISO converts 'YYYY-MM-DD' strings to Date objects
 * - differenceInCalendarDays counts whole days between dates
 *
 * @param due_date — ISO date string 'YYYY-MM-DD' or null
 */
export function getDueDateStatus(due_date: string | null): DueDateStatus {
  if (!due_date) return null

  // Parse the ISO date string into a Date object
  const dueDate = parseISO(due_date)

  // Validate — malformed date strings return Invalid Date
  if (!isValid(dueDate)) return null

  const today = new Date()
  // differenceInCalendarDays(dateLeft, dateRight):
  // Positive = dueDate is in the future, negative = overdue
  const daysUntilDue = differenceInCalendarDays(dueDate, today)

  if (daysUntilDue < 0)  return 'overdue'
  if (daysUntilDue <= 2) return 'soon'
  return 'ok'
}

/**
 * formatDueDate — human-readable due date string for the card badge.
 *
 * Examples:
 *   'overdue' → '2d overdue'
 *   'soon'    → 'Due today', 'Due tomorrow', 'Due in 2d'
 *   'ok'      → 'Due Mar 15'
 *
 * @param due_date — ISO date string or null
 */
export function formatDueDate(due_date: string | null): string | null {
  if (!due_date) return null

  const dueDate = parseISO(due_date)
  if (!isValid(dueDate)) return null

  const today = new Date()
  const days = differenceInCalendarDays(dueDate, today)

  if (days < 0)    return `${Math.abs(days)}d overdue`
  if (days === 0)  return 'Due today'
  if (days === 1)  return 'Due tomorrow'
  if (days <= 7)   return `Due in ${days}d`

  // For dates more than a week away, show the month + day
  return `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}


// ─── Board Stats ──────────────────────────────────────────────────────────────

/**
 * BoardStats — summary numbers shown in the header stats strip.
 */
export interface BoardStats {
  total:    number   // All tasks
  todo:     number   // Tasks with status === 'todo'
  done:     number   // Tasks with status === 'done'
  overdue:  number   // Tasks with a past due_date (excluding done tasks)
  inFlight: number   // Tasks that are in_progress or in_review
}

/**
 * computeBoardStats — derives stats from the flat tasks array.
 *
 * We compute stats from tasks[] directly rather than calling Supabase
 * again — we already have all the data, so this is instant.
 *
 * Note: we exclude 'done' tasks from overdue count because a task
 * that's done but technically past due shouldn't alarm anyone.
 *
 * @param tasks — the full array of tasks for the current user
 */
export function computeBoardStats(tasks: Task[]): BoardStats {
  const total = tasks.length
  const todo = tasks.filter(t => t.status === 'todo').length
  const done = tasks.filter(t => t.status === 'done').length
  const inFlight = tasks.filter(t => t.status === 'in_progress' || t.status === 'in_review').length

  // Overdue = has a due_date, that date is in the past, and task isn't done
  const overdue = tasks.filter(t =>
    t.status !== 'done' && getDueDateStatus(t.due_date) === 'overdue'
  ).length

  return { total, todo, done, overdue, inFlight }
}


// ─── Task Filtering ───────────────────────────────────────────────────────────

/**
 * applyFilters — filters the tasks array based on FilterState.
 *
 * This runs client-side on the data we've already fetched from Supabase.
 * We don't re-query Supabase on every filter change — that would be slow
 * and wasteful. Instead, we fetch all tasks once and filter in memory.
 *
 * This works well at the scale we expect (< 500 tasks per user).
 * For thousands of tasks, you'd move filtering to the Supabase query.
 *
 * @param tasks   — the full unfiltered tasks array
 * @param filters — the current filter state from the search bar
 */
export function applyFilters(tasks: Task[], filters: FilterState): Task[] {
  return tasks.filter(task => {
    // ── Search filter ──────────────────────────────────────────────────────
    // Case-insensitive match against the task title
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const titleMatch = task.title.toLowerCase().includes(searchLower)
      // Also search description if it exists
      const descMatch = task.description?.toLowerCase().includes(searchLower) ?? false
      if (!titleMatch && !descMatch) return false
    }

    // ── Priority filter ────────────────────────────────────────────────────
    // 'all' means no filter applied — show every priority level
    if (filters.priority !== 'all' && task.priority !== filters.priority) {
      return false
    }

    // ── Label filter ───────────────────────────────────────────────────────
    // Empty string means no label filter — show all tasks
    if (filters.label && !task.labels.includes(filters.label)) {
      return false
    }

    // Task passed all filters — include it
    return true
  })
}


// ─── Sprint Helpers ───────────────────────────────────────────────────────────

/**
 * computeSprintProgress — calculates sprint completion percentage.
 *
 * Two dimensions of progress:
 * 1. Time: how far through the sprint are we? (days elapsed / total days)
 * 2. Tasks: what % of tasks are done?
 *
 * We show the task completion % in the banner (more meaningful to users)
 * and use the time % for the progress bar background.
 *
 * @param startDate  — sprint start 'YYYY-MM-DD'
 * @param endDate    — sprint end 'YYYY-MM-DD'
 * @param tasks      — all tasks (we count done vs total)
 */
export function computeSprintProgress(
  startDate: string,
  endDate: string,
  tasks: Task[]
): { taskPct: number; timePct: number; daysLeft: number } {
  const start = parseISO(startDate)
  const end   = parseISO(endDate)
  const today = new Date()

  const totalDays   = differenceInCalendarDays(end, start)
  const elapsedDays = differenceInCalendarDays(today, start)
  const daysLeft    = Math.max(0, differenceInCalendarDays(end, today))

  // Clamp time percentage between 0-100
  const timePct = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)))

  // Task completion %
  const taskPct = tasks.length === 0
    ? 0
    : Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)

  return { taskPct, timePct, daysLeft }
}


// ─── Label Colors ─────────────────────────────────────────────────────────────

/**
 * LABEL_COLORS — a fixed set of label color options.
 *
 * Users pick from these when creating labels.
 * We store only the label string in the DB (e.g. "Bug") and derive
 * the color from this mapping at render time.
 *
 * The colors are chosen to be visible on our dark pitch background.
 */
export const LABEL_COLORS: Record<string, { bg: string; text: string }> = {
  'Bug':       { bg: 'bg-red-900/50',    text: 'text-red-300' },
  'Feature':   { bg: 'bg-violet-900/50', text: 'text-violet-300' },
  'Design':    { bg: 'bg-pink-900/50',   text: 'text-pink-300' },
  'Backend':   { bg: 'bg-blue-900/50',   text: 'text-blue-300' },
  'Frontend':  { bg: 'bg-cyan-900/50',   text: 'text-cyan-300' },
  'Testing':   { bg: 'bg-green-900/50',  text: 'text-green-300' },
  'DevOps':    { bg: 'bg-orange-900/50', text: 'text-orange-300' },
  'Research':  { bg: 'bg-amber-900/50',  text: 'text-amber-300' },
  'Urgent':    { bg: 'bg-red-800/70',    text: 'text-red-200' },
}

/**
 * getLabelStyle — gets the Tailwind classes for a label string.
 * Falls back to a generic gray if the label isn't in our config.
 */
export function getLabelStyle(label: string): { bg: string; text: string } {
  return LABEL_COLORS[label] ?? { bg: 'bg-pitch-500/50', text: 'text-pitch-200' }
}
