/**
 * hooks/useBoardState.ts — Derives board column state from the flat tasks array
 *
 * This hook does NOT talk to Supabase — it's purely a transformation layer.
 * It takes the flat tasks[] from useTasks and the current FilterState from
 * the TopBar, and produces a BoardState: tasks grouped by column, filtered.
 *
 * Why a separate hook?
 *   The Board component needs tasks grouped by status to render columns.
 *   The TopBar controls filters. We could compute this inline in the Board,
 *   but a dedicated hook makes the derivation testable and reusable.
 *
 * Data flow:
 *   useTasks().tasks (flat Task[])
 *     → applyFilters(tasks, filters) (client-side filtering)
 *     → groupByStatus(filteredTasks)  (group into BoardState)
 *     → Board renders each column from boardState[status]
 *
 * The hook is memoized with useMemo so the grouping/filtering only
 * recomputes when tasks or filters actually change — not on every render.
 *
 * @param tasks   — flat Task[] from useTasks
 * @param filters — current FilterState from TopBar
 * @returns BoardState — tasks grouped by TaskStatus key
 */

import { useMemo } from 'react'
import { applyFilters } from '@/lib/utils'
import type { Task, FilterState, BoardState } from '@/types'


export function useBoardState(tasks: Task[], filters: FilterState): BoardState {
  return useMemo(() => {
    /**
     * Step 1: Apply filters client-side.
     *
     * applyFilters() checks each task against:
     *   - filters.search   : title/description substring match
     *   - filters.priority : exact match or 'all'
     *   - filters.label    : array inclusion or ''
     *
     * If ALL filters are at their default values (search='', priority='all', label=''),
     * applyFilters returns the full tasks array unchanged (no filtering overhead).
     */
    const filteredTasks = applyFilters(tasks, filters)

    /**
     * Step 2: Group filtered tasks by status into BoardState.
     *
     * We initialize all four columns as empty arrays FIRST, then populate.
     * This guarantees every column key exists in the result even if empty —
     * the Board component can always access boardState['in_review'] safely
     * without checking if the key exists.
     *
     * reduce() iterates once through filteredTasks, pushing each task into
     * the array for its status column. O(n) — efficient even for many tasks.
     */
    const initialState: BoardState = {
      todo:        [],
      in_progress: [],
      in_review:   [],
      done:        [],
    }

    return filteredTasks.reduce((acc, task) => {
      // task.status is TaskStatus — the column key
      // We push into the matching array, building up each column's task list
      acc[task.status].push(task)
      return acc
    }, initialState)

  // Recompute only when tasks array reference changes (mutation → new array)
  // or when filter values change. React's useMemo compares deps by reference.
  // tasks changes whenever useTasks calls setTasks (create/update/delete/move).
  // filters changes whenever the user types in the search box or changes dropdowns.
  }, [tasks, filters])
}

/**
 * getColumnTaskIds — extracts just the IDs from a column's tasks.
 *
 * Used by dnd-kit's SortableContext which needs an array of IDs
 * to track item positions within a droppable container.
 * We keep this as a utility function here (not a hook) since it's
 * a pure transformation with no state.
 *
 * @param tasks — tasks in a single column
 * @returns string[] of task UUIDs in order
 */
export function getColumnTaskIds(tasks: Task[]): string[] {
  return tasks.map(task => task.id)
}

/**
 * getTaskById — finds a single task by ID from the flat tasks array.
 *
 * Used by the drag overlay to render a preview of the card being dragged.
 * dnd-kit gives us the active item's ID — we look up the full Task object.
 *
 * @param tasks — the full flat tasks array from useTasks
 * @param id    — UUID of the task to find
 * @returns the Task or undefined if not found
 */
export function getTaskById(tasks: Task[], id: string): Task | undefined {
  return tasks.find(task => task.id === id)
}

/**
 * getAllLabels — collects all unique labels in use across all tasks.
 *
 * Used to populate the label filter dropdown in TopBar — only labels
 * that actually exist on tasks are shown as filter options.
 *
 * @param tasks — the full flat tasks array
 * @returns string[] of unique label values, sorted alphabetically
 */
export function getAllLabels(tasks: Task[]): string[] {
  // Use a Set to deduplicate, then spread to array and sort
  const labelSet = new Set<string>()
  tasks.forEach(task => task.labels.forEach(label => labelSet.add(label)))
  return Array.from(labelSet).sort()
}

/**
 * isUrgentColumn — returns true if any task in this column is overdue.
 *
 * Used by the Board column header to show a red count badge when the
 * column contains at least one past-due, incomplete task.
 * Pure function — no state, no hooks.
 *
 * @param tasks — tasks belonging to a single column
 * @returns true if any task is overdue (due_date < today and not done)
 */
export function isUrgentColumn(tasks: Task[]): boolean {
  // A column is "urgent" if it contains any overdue tasks
  // We check due_date directly here to avoid importing getDueDateStatus
  // (that would create a dep on utils.ts just for the column header)
  const today = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'
  return tasks.some(task =>
    task.due_date !== null &&
    task.due_date < today &&
    task.status !== 'done'
  )
}
