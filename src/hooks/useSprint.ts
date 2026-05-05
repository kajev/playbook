/**
 * hooks/useSprint.ts — Data hook for the active sprint/milestone
 *
 * Manages the sprint banner shown in the header TopBar.
 * A sprint is a named time-boxed period (e.g. "Sprint 3 — Season Launch")
 * with a start date, end date, and completion % derived from task state.
 *
 * What it manages:
 *   - sprint     : the active Sprint object, or null if none exists
 *   - loading    : true during the initial fetch
 *   - error      : error string or null
 *
 * What it exposes:
 *   - createSprint(newSprint) : INSERT a sprint and mark it active
 *   - updateSprint(id, changes): UPDATE sprint name/dates
 *   - endSprint(id)           : SET is_active = false (close the sprint)
 *
 * Design decisions:
 *   - Only ONE sprint is active at a time (enforced by DB partial unique index)
 *   - We fetch only the active sprint (is_active = true) — no sprint history UI
 *   - Sprint completion % is computed in utils.ts from the tasks[] passed in,
 *     so this hook doesn't need to know about tasks directly
 *
 * RLS:
 *   Same as tasks — RLS scopes all queries to auth.uid() automatically.
 *   We never pass user_id to queries.
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sprint, NewSprint } from '@/types'

// ─── Return type ──────────────────────────────────────────────────────────────

interface UseSprintReturn {
  /** The currently active sprint, or null if no sprint is active */
  sprint: Sprint | null
  /** True during the initial fetch */
  loading: boolean
  /** Error message or null */
  error: string | null
  /** Create a new sprint and make it active */
  createSprint: (newSprint: NewSprint) => Promise<Sprint>
  /** Update the active sprint's name or dates */
  updateSprint: (id: string, changes: Partial<Pick<Sprint, 'name' | 'start_date' | 'end_date'>>) => Promise<void>
  /** End (deactivate) the current sprint */
  endSprint: (id: string) => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSprint(): UseSprintReturn {
  // The active sprint — null means no sprint is currently running
  const [sprint, setSprint] = useState<Sprint | null>(null)

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError]     = useState<string | null>(null)

  // ── fetchActiveSprint ─────────────────────────────────────────────────────────

  /**
   * fetchActiveSprint — fetches the single active sprint for the current user.
   *
   * Query:
   *   SELECT * FROM sprints
   *   WHERE user_id = auth.uid()   -- RLS
   *   AND is_active = true
   *   LIMIT 1
   *
   * .maybeSingle() is used instead of .single() because there might be no
   * active sprint — which is a valid state (not an error).
   * .single() would throw if it finds zero rows.
   * .maybeSingle() returns null when zero rows are found.
   */
  const fetchActiveSprint = useCallback(async (): Promise<void> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('sprints')
        .select('*')
        .eq('is_active', true)
        .maybeSingle() // Returns null (not error) if no active sprint exists

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      // data is Sprint | null — maybeSingle returns null when no rows match
      setSprint(data as Sprint | null)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sprint'
      setError(message)
    }
  }, [])

  // ── Mount effect ──────────────────────────────────────────────────────────────

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      await fetchActiveSprint()
      setLoading(false)
    })()
  }, [fetchActiveSprint])

  // ── createSprint ──────────────────────────────────────────────────────────────

  /**
   * createSprint — creates a new sprint and makes it the active one.
   *
   * The DB has a partial unique index:
   *   UNIQUE on (user_id) WHERE is_active = true
   *
   * This means only ONE active sprint per user can exist at the DB level.
   * If the user tries to create a second active sprint without ending the first,
   * Supabase will return a constraint violation error.
   *
   * We handle this in the UI by only showing the create form when sprint is null,
   * but the DB constraint is the real safety net.
   *
   * @param newSprint — name, start_date, end_date, is_active (defaults true)
   * @returns the created Sprint
   */
  const createSprint = useCallback(async (newSprint: NewSprint): Promise<Sprint> => {
    const { data, error: insertError } = await supabase
      .from('sprints')
      .insert({
        name:       newSprint.name,
        start_date: newSprint.start_date,
        end_date:   newSprint.end_date,
        is_active:  newSprint.is_active ?? true, // Default to active
        // user_id omitted — set by Supabase RLS to auth.uid()
      })
      .select()
      .single()

    if (insertError) {
      // If the partial unique index fires, this error message will mention
      // "duplicate key value violates unique constraint" — the UI can check for
      // this and show "Please end your current sprint first"
      throw new Error(`Failed to create sprint: ${insertError.message}`)
    }

    const createdSprint = data as Sprint
    setSprint(createdSprint)
    return createdSprint
  }, [])

  // ── updateSprint ──────────────────────────────────────────────────────────────

  /**
   * updateSprint — edits the sprint's name or date range.
   *
   * We only allow updating name, start_date, end_date — not is_active.
   * To deactivate, use endSprint() which has clearer semantics.
   *
   * Local state is updated after Supabase confirms the change.
   *
   * @param id      — UUID of the sprint to update
   * @param changes — subset of Sprint fields to update
   */
  const updateSprint = useCallback(async (
    id: string,
    changes: Partial<Pick<Sprint, 'name' | 'start_date' | 'end_date'>>
  ): Promise<void> => {
    const { error: updateError } = await supabase
      .from('sprints')
      .update(changes)
      .eq('id', id)

    if (updateError) {
      throw new Error(`Failed to update sprint: ${updateError.message}`)
    }

    // Merge changes into local sprint state
    setSprint(prev =>
      prev && prev.id === id
        ? { ...prev, ...changes }
        : prev
    )
  }, [])

  // ── endSprint ─────────────────────────────────────────────────────────────────

  /**
   * endSprint — marks a sprint as inactive (is_active = false).
   *
   * This is how a sprint is "closed" — it's not deleted, just deactivated.
   * The sprint history remains in the DB even though we don't display it yet.
   * After ending, sprint becomes null in local state and the banner disappears.
   *
   * Once is_active is false, the partial unique index allows a new sprint
   * to be created (it only constrains active = true rows).
   *
   * @param id — UUID of the sprint to end
   */
  const endSprint = useCallback(async (id: string): Promise<void> => {
    const { error: updateError } = await supabase
      .from('sprints')
      .update({ is_active: false })
      .eq('id', id)

    if (updateError) {
      throw new Error(`Failed to end sprint: ${updateError.message}`)
    }

    // Sprint is no longer active — clear from local state
    // The banner in TopBar will disappear on next render
    setSprint(null)
  }, [])

  // ── Return ────────────────────────────────────────────────────────────────────

  return {
    sprint,
    loading,
    error,
    createSprint,
    updateSprint,
    endSprint,
  }
}
