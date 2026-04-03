/**
 * components/board/SprintModal.tsx -- Sprint management modal
 *
 * Allows the user to:
 *   A) Create a new sprint   (when sprint is null)
 *   B) Edit an active sprint (change name or dates)
 *   C) End an active sprint  (sets is_active = false)
 *
 * This modal is opened by clicking the sprint banner in TopBar.
 * TopBar passes onOpenSprintModal down from AppLayout, which owns
 * the useSprint() mutation handlers and passes them here as props.
 *
 * Two modes driven by the sprint prop:
 *   sprint === null  --> "Start a sprint" form (create mode)
 *   sprint !== null  --> "Edit sprint" form with End Sprint button (edit mode)
 *
 * Form state:
 *   name       : string  -- sprint name, e.g. "Sprint 3 - Season Launch"
 *   start_date : string  -- YYYY-MM-DD, defaults to today
 *   end_date   : string  -- YYYY-MM-DD, defaults to 14 days from today
 *
 * Validation:
 *   - name cannot be empty
 *   - end_date must be after start_date
 *   - Both dates must be valid ISO date strings
 *
 * Error handling:
 *   Supabase errors are caught and displayed inline below the form.
 *   The modal stays open on error so the user can correct and retry.
 *
 * Props:
 *   sprint        : Sprint | null         -- current active sprint
 *   onClose       : () => void            -- close the modal
 *   createSprint  : useSprint handler     -- INSERT new sprint
 *   updateSprint  : useSprint handler     -- UPDATE name/dates
 *   endSprint     : useSprint handler     -- SET is_active = false
 */

import { useState } from 'react'
import { Zap, Calendar, X, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Sprint, NewSprint } from '@/types'

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * todayISO -- returns today's date as 'YYYY-MM-DD'.
 * Used to default the start_date field when creating a sprint.
 * We use toISOString().split('T')[0] which gives UTC date.
 * For a local-date version we'd use toLocaleDateString but ISO is safer.
 */
function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * addDays -- returns a date string N days from a given YYYY-MM-DD string.
 * Used to default end_date to start_date + 14 (two-week sprint).
 */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface SprintModalProps {
  sprint:       Sprint | null
  onClose:      () => void
  createSprint: (sprint: NewSprint) => Promise<Sprint>
  updateSprint: (id: string, changes: Partial<Pick<Sprint, 'name' | 'start_date' | 'end_date'>>) => Promise<void>
  endSprint:    (id: string) => Promise<void>
}

// ─── SprintModal ───────────────────────────────────────────────────────────────

export function SprintModal({
  sprint,
  onClose,
  createSprint,
  updateSprint,
  endSprint,
}: SprintModalProps) {

  // ── Form state ──────────────────────────────────────────────────────────────

  /**
   * Form fields initialized from the existing sprint (edit mode)
   * or sensible defaults (create mode: today + 14 days).
   *
   * We use lazy useState initializers (() => ...) so the default
   * computation only runs once on mount, not on every render.
   */
  const [name, setName] = useState(() =>
    sprint?.name ?? ''
  )
  const [startDate, setStartDate] = useState(() =>
    sprint?.start_date ?? todayISO()
  )
  const [endDate, setEndDate] = useState(() =>
    sprint?.end_date ?? addDays(todayISO(), 14)
  )

  // ── Operation state ─────────────────────────────────────────────────────────

  /** True while the createSprint or updateSprint Supabase call is in flight */
  const [saving, setSaving] = useState(false)

  /** True while the endSprint Supabase call is in flight */
  const [ending, setEnding] = useState(false)

  /**
   * endConfirm -- two-step protection for the destructive "End sprint" action.
   * First click: sets this true, button text changes to "Confirm end sprint?"
   * Second click: calls endSprint()
   * Clicking anywhere else resets it via onBlur.
   */
  const [endConfirm, setEndConfirm] = useState(false)

  /** Inline error message from a failed Supabase call */
  const [error, setError] = useState('')

  // ── Validation ──────────────────────────────────────────────────────────────

  /**
   * validate -- checks form fields before submitting.
   * Returns an error string if invalid, empty string if valid.
   *
   * Checks:
   *   1. Name is not empty after trimming
   *   2. Both dates are present
   *   3. end_date is strictly after start_date
   */
  function validate(): string {
    if (!name.trim()) return 'Sprint name cannot be empty.'
    if (!startDate)   return 'Start date is required.'
    if (!endDate)     return 'End date is required.'
    if (endDate <= startDate) return 'End date must be after start date.'
    return ''
  }

  // ── isDirty check (edit mode) ───────────────────────────────────────────────

  /**
   * isDirty -- true if any field differs from the current sprint values.
   * In create mode sprint is null so we always treat the form as dirty.
   * The Save button is disabled when not dirty -- no-op protection.
   */
  const isDirty = sprint === null || (
    name.trim()  !== sprint.name       ||
    startDate    !== sprint.start_date ||
    endDate      !== sprint.end_date
  )

  // ── Handlers ────────────────────────────────────────────────────────────────

  /**
   * handleSave -- creates or updates the sprint.
   *
   * Create mode (sprint === null):
   *   Calls createSprint({ name, start_date, end_date, is_active: true })
   *   Supabase inserts the row and the sprint banner appears immediately.
   *
   * Edit mode (sprint !== null):
   *   Calls updateSprint(id, { name, start_date, end_date })
   *   Only sends fields that actually changed (diff computed inside useSprint).
   *
   * On success: close modal.
   * On failure: show error inline, keep modal open.
   */
  async function handleSave() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')

    try {
      if (sprint === null) {
        // Create mode -- insert a new sprint
        await createSprint({
          name:       name.trim(),
          start_date: startDate,
          end_date:   endDate,
          is_active:  true,
        })
      } else {
        // Edit mode -- update changed fields only
        await updateSprint(sprint.id, {
          name:       name.trim(),
          start_date: startDate,
          end_date:   endDate,
        })
      }
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Check your connection and try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  /**
   * handleEnd -- ends the active sprint (sets is_active = false).
   *
   * Two-step: first click sets endConfirm=true, second click calls endSprint.
   * The confirm state resets on blur so accidental navigation doesn't linger.
   *
   * After ending: the sprint banner disappears and the modal closes.
   */
  async function handleEnd() {
    if (!sprint) return

    if (!endConfirm) {
      setEndConfirm(true)
      return
    }

    setEnding(true)
    setError('')

    try {
      await endSprint(sprint.id)
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not end sprint. Try again.'
      )
      setEnding(false)
      setEndConfirm(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isEditMode = sprint !== null

  return (
    /**
     * Modal content wrapper.
     * This renders inside the shared Modal component from Push 4.
     * Modal handles: backdrop, Escape key, scroll lock, focus trap.
     * We only render the inner content here.
     *
     * flex flex-col gap-5: vertical stack with consistent 20px spacing.
     */
    <div className="flex flex-col gap-5">

      {/* ── Mode header ──────────────────────────────────────────────────────── */}
      {/*
        * Shows context-appropriate subtitle below the Modal's title prop.
        * "Start a sprint" vs "Edit sprint" drives the copy.
        * The volt Zap icon matches the sprint banner's live indicator.
      */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-volt-500/10 border border-volt-500/20 flex items-center justify-center shrink-0">
          <Zap size={15} className="text-volt-500" />
        </div>
        <div>
          <p className="font-sans text-[13px] text-pitch-300">
            {isEditMode
              ? 'Update the sprint name or date range. Changes apply immediately.'
              : 'Define a time-boxed period to focus your team\'s effort.'}
          </p>
        </div>
      </div>

      {/* ── Sprint name field ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-[12px] font-500 text-pitch-300">
          Sprint name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder='e.g. "Sprint 3 - Season Launch"'
          maxLength={120}
          autoFocus
          className={cn(
            'w-full h-9 px-3',
            'font-sans text-[13px] text-pitch-100 placeholder:text-pitch-500',
            'bg-pitch-700 border border-pitch-500/40 rounded-lg',
            'focus:outline-none focus:border-volt-500/60',
            'transition-colors duration-150',
          )}
        />
      </div>

      {/* ── Date range row ────────────────────────────────────────────────────── */}
      {/*
        * Two date inputs side by side.
        * grid-cols-2 with gap-3 gives equal widths with 12px between.
        * [color-scheme:dark] fixes the native date picker to use dark chrome
        * on browsers that support it (Chrome/Edge). Firefox ignores it.
      */}
      <div className="grid grid-cols-2 gap-3">

        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-[12px] font-500 text-pitch-300 flex items-center gap-1.5">
            <Calendar size={11} className="text-pitch-400" />
            Start date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => {
              setStartDate(e.target.value)
              // Auto-advance end date to maintain at least 1 day gap
              if (e.target.value >= endDate) {
                setEndDate(addDays(e.target.value, 14))
              }
            }}
            className={cn(
              'h-9 px-3 w-full',
              'font-sans text-[13px] text-pitch-100',
              'bg-pitch-700 border border-pitch-500/40 rounded-lg',
              'focus:outline-none focus:border-volt-500/60',
              'transition-colors duration-150',
              '[color-scheme:dark]',
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-[12px] font-500 text-pitch-300 flex items-center gap-1.5">
            <Calendar size={11} className="text-pitch-400" />
            End date
          </label>
          <input
            type="date"
            value={endDate}
            min={addDays(startDate, 1)} // Must be after start_date
            onChange={e => setEndDate(e.target.value)}
            className={cn(
              'h-9 px-3 w-full',
              'font-sans text-[13px] text-pitch-100',
              'bg-pitch-700 border border-pitch-500/40 rounded-lg',
              'focus:outline-none focus:border-volt-500/60',
              'transition-colors duration-150',
              '[color-scheme:dark]',
            )}
          />
        </div>

      </div>

      {/* ── Inline error ─────────────────────────────────────────────────────── */}
      {/*
        * Shows validation errors and Supabase error messages.
        * Only rendered when error is non-empty.
        * AlertCircle icon + red background matches the error toast style.
      */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
          <p className="font-sans text-[12px] text-red-400 leading-snug">{error}</p>
        </div>
      )}

      {/* ── Action bar ───────────────────────────────────────────────────────── */}
      {/*
        * Three-button row: End sprint (left, edit mode only) + Cancel + Save.
        * pt-2 border-t: matches TaskDetailModal action bar pattern.
      */}
      <div className="flex items-center justify-between pt-2 border-t border-pitch-500/20">

        {/* End sprint -- only shown in edit mode */}
        {isEditMode ? (
          <button
            type="button"
            onClick={handleEnd}
            disabled={ending || saving}
            onBlur={() => setEndConfirm(false)}
            className={cn(
              'flex items-center gap-1.5 h-8 px-3 rounded-lg',
              'font-sans text-[12px] transition-colors duration-150',
              endConfirm
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'text-pitch-400 hover:text-red-400 hover:bg-red-500/10',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <X size={13} />
            {ending ? 'Ending...' : endConfirm ? 'Confirm end sprint?' : 'End sprint'}
          </button>
        ) : (
          // Spacer in create mode so Save stays right-aligned
          <div />
        )}

        {/* Cancel + Save */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving || ending}
            className="h-8 px-3 font-sans text-[12px] text-pitch-400 hover:text-pitch-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || ending || !isDirty}
            className={cn(
              'flex items-center gap-1.5 h-8 px-3 rounded-lg',
              'font-sans font-500 text-[12px] text-pitch-950',
              'bg-volt-500 hover:bg-volt-400 active:bg-volt-600',
              'transition-colors duration-150',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            <Check size={13} />
            {saving
              ? 'Saving...'
              : isEditMode
                ? 'Save changes'
                : 'Start sprint'}
          </button>
        </div>

      </div>
    </div>
  )
}
