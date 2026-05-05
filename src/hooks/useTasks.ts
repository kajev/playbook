/**
 * hooks/useTasks.ts — Primary data hook for all task operations
 *
 * This hook is the single interface between the board UI and Supabase.
 * It owns all task state and exposes clean functions for every operation.
 *
 * What it manages:
 *   - tasks[]   : flat array of all tasks for the current user
 *   - loading   : true only during the initial page load fetch
 *   - error     : string if any operation failed, null otherwise
 *
 * What it exposes:
 *   - createTask(newTask)     : INSERT a new task row
 *   - updateTask(id, changes) : UPDATE specific fields on a task
 *   - deleteTask(id)          : DELETE a task row
 *   - moveTask(id, newStatus) : optimistic UPDATE for drag-and-drop
 *   - refetch()               : manually re-fetch all tasks from Supabase
 *
 * Optimistic updates:
 *   moveTask updates local state IMMEDIATELY before the Supabase call resolves,
 *   making drag-and-drop feel instant. On failure it rolls back to a snapshot.
 *   create/update/delete wait for Supabase confirmation before updating state.
 *
 * RLS note:
 *   We never pass user_id to queries — Supabase RLS enforces:
 *     WHERE user_id = auth.uid()
 *   automatically on every query, so we simply query `tasks` and get
 *   back only the current user's rows.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task, NewTask, TaskUpdate, TaskStatus } from '@/types'

// ─── Return type ──────────────────────────────────────────────────────────────

interface UseTasksReturn {
  /** Flat array of all tasks for the current user, sorted by created_at ASC */
  tasks: Task[]
  /** True only during the initial page load fetch — not during mutations */
  loading: boolean
  /** Last error message, or null if everything is fine */
  error: string | null
  /** Create a new task. Returns the created Task or throws on failure. */
  createTask: (newTask: NewTask) => Promise<Task>
  /** Update specific fields on an existing task. */
  updateTask: (id: string, changes: TaskUpdate) => Promise<void>
  /** Delete a task permanently. */
  deleteTask: (id: string) => Promise<void>
  /**
   * Optimistically move a task to a new column for drag-and-drop.
   * Updates local state immediately, syncs to Supabase, rolls back on failure.
   */
  moveTask: (id: string, newStatus: TaskStatus) => Promise<void>
  /** Manually trigger a re-fetch from Supabase */
  refetch: () => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTasks(): UseTasksReturn {
  // All tasks for the current user — flat array, columns derived from this
  const [tasks, setTasks] = useState<Task[]>([])

  /**
   * tasksRef — always holds the latest tasks[] value without being a dep.
   *
   * Problem: moveTask needs a snapshot of tasks[] at the moment of drop
   * for rollback. If we put `tasks` in moveTask's useCallback dep array,
   * the callback is recreated on every render (every task state change) —
   * expensive and causes subtle bugs with dnd-kit's event handlers.
   *
   * Solution: a ref that's kept in sync with state every render.
   * The ref is always fresh without being a dependency.
   * moveTask reads tasksRef.current for the rollback snapshot.
   */
  const tasksRef = useRef<Task[]>([])
  tasksRef.current = tasks // Sync on every render — always reflects latest state

  // True only during the initial fetch (board shows loading skeleton)
  const [loading, setLoading] = useState<boolean>(true)

  // Last error string — null when everything is working
  const [error, setError] = useState<string | null>(null)

  // ── fetchTasks ───────────────────────────────────────────────────────────────

  /**
   * fetchTasks — loads all tasks for the current user from Supabase.
   *
   * Wrapped in useCallback for a stable reference so it can be:
   *   a) Safely listed in useEffect's dep array (won't cause infinite loop)
   *   b) Exposed as `refetch` for manual triggering
   *
   * Query translates to:
   *   SELECT * FROM tasks
   *   WHERE user_id = auth.uid()   -- RLS enforces this automatically
   *   ORDER BY created_at ASC      -- oldest first within each column
   *
   * Ordering by created_at ASC is a simple default. Within-column drag-to-reorder
   * would require a separate `position` integer column — a future improvement.
   */
  const fetchTasks = useCallback(async (): Promise<void> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true })

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      // Cast is safe: Database['public']['Tables']['tasks']['Row'] matches Task
      setTasks(data as Task[])
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks'
      setError(message)
    }
  }, []) // Empty deps — this function never needs to change

  // ── Initial fetch on mount ────────────────────────────────────────────────────

  useEffect(() => {
    /**
     * Async IIFE because useEffect callbacks cannot be async directly.
     * Sets loading true → fetches → sets loading false regardless of outcome.
     * The board renders a skeleton while loading is true.
     */
    ;(async () => {
      setLoading(true)
      await fetchTasks()
      setLoading(false)
    })()
  }, [fetchTasks]) // fetchTasks is stable — this runs exactly once on mount

  // ── createTask ────────────────────────────────────────────────────────────────

  /**
   * createTask — inserts a new task and adds it to local state.
   *
   * Why NOT optimistic:
   *   We need the Supabase-generated `id` (UUID) and `created_at` before we
   *   can render the card — without them the React key prop would be undefined.
   *
   * The INSERT intentionally omits user_id — Supabase sets it to auth.uid()
   * via DEFAULT, and the RLS INSERT policy rejects any attempt to override it.
   *
   * .select().single() returns the inserted row including generated fields.
   *
   * @param newTask — all task fields except id, user_id, created_at
   * @returns the fully populated Task with Supabase-generated id and created_at
   */
  const createTask = useCallback(async (newTask: NewTask): Promise<Task> => {
    const { data, error: insertError } = await supabase
      .from('tasks')
      .insert({
        title:       newTask.title,
        description: newTask.description,
        status:      newTask.status,
        priority:    newTask.priority,
        due_date:    newTask.due_date,
        labels:      newTask.labels,
        // user_id omitted intentionally — set by Supabase via auth.uid()
      })
      .select()  // Without .select(), Supabase returns empty data
      .single()  // We inserted exactly one row, expect one row back

    if (insertError) {
      throw new Error(`Failed to create task: ${insertError.message}`)
    }

    const createdTask = data as Task

    // Append to the end of tasks array.
    // Since we sort by created_at ASC, new tasks land at the bottom of
    // their column — consistent with the sort order from fetchTasks.
    setTasks(prev => [...prev, createdTask])

    return createdTask
  }, [])

  // ── updateTask ────────────────────────────────────────────────────────────────

  /**
   * updateTask — updates specific fields on an existing task.
   *
   * Used for editing details: title, description, priority, due_date, labels.
   * For column changes during drag-and-drop, use moveTask (it is optimistic).
   *
   * We wait for Supabase confirmation before updating local state so that
   * if the save fails, the modal can stay open and show the error — no data loss.
   *
   * RLS handles the user_id filter — .eq('id', id) targets the specific row.
   *
   * @param id      — UUID of the task to update
   * @param changes — only the fields being changed (Partial<TaskUpdate>)
   */
  const updateTask = useCallback(async (id: string, changes: TaskUpdate): Promise<void> => {
    const { error: updateError } = await supabase
      .from('tasks')
      .update(changes)
      .eq('id', id)

    if (updateError) {
      throw new Error(`Failed to update task: ${updateError.message}`)
    }

    // Merge changes into the matching task, leave all others untouched
    setTasks(prev =>
      prev.map(task =>
        task.id === id
          ? { ...task, ...changes }
          : task
      )
    )
  }, [])

  // ── deleteTask ────────────────────────────────────────────────────────────────

  /**
   * deleteTask — permanently removes a task from Supabase and local state.
   *
   * Hard delete — no soft-delete or archive. A future improvement:
   * add archived_at TIMESTAMPTZ column, set instead of DELETE.
   *
   * We wait for Supabase confirmation before removing from local state —
   * the card stays visible if the network request fails.
   *
   * @param id — UUID of the task to delete
   */
  const deleteTask = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      // RLS ensures only the task owner can delete it, even if id is known

    if (deleteError) {
      throw new Error(`Failed to delete task: ${deleteError.message}`)
    }

    setTasks(prev => prev.filter(task => task.id !== id))
  }, [])

  // ── moveTask ──────────────────────────────────────────────────────────────────

  /**
   * moveTask — optimistically moves a task to a different column.
   *
   * The drag-and-drop sequence:
   *   1. Capture snapshot via tasksRef.current (pre-update state)
   *   2. setTasks immediately → card moves to new column in the UI
   *   3. UPDATE Supabase in the background
   *   4a. Success → nothing more needed (state already reflects reality)
   *   4b. Failure → setTasks(snapshot) → card snaps back + error shown
   *
   * Why tasksRef instead of tasks in deps:
   *   We need a current snapshot but can't put `tasks` in the dep array
   *   without the callback being recreated on every render.
   *   tasksRef.current is always up-to-date (synced above) and is
   *   accessed at call time, not closure time — so it's always fresh.
   *
   * @param id        — UUID of the task being moved
   * @param newStatus — the destination column's status value
   */
  const moveTask = useCallback(async (id: string, newStatus: TaskStatus): Promise<void> => {
    // Step 1: Snapshot via ref — always current, not a stale closure value
    const previousTasks = tasksRef.current

    // Step 2: Optimistic update — card moves immediately, no network wait
    setTasks(prev =>
      prev.map(task =>
        task.id === id
          ? { ...task, status: newStatus }
          : task
      )
    )

    // Step 3: Persist to Supabase
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', id)

    if (updateError) {
      // Step 4b: Rollback to pre-drag state
      setTasks(previousTasks)
      setError(`Failed to move task: ${updateError.message}`)
    }
    // Step 4a: Success path — nothing to do, state is correct
  }, []) // Empty deps — reads tasksRef.current at call time, not closure time

  // ── Return ────────────────────────────────────────────────────────────────────

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    refetch: fetchTasks,
  }
}
