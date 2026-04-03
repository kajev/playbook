/**
 * components/board/CreateTaskModal.tsx — New task creation form
 *
 * A controlled form rendered inside the Modal shell component.
 * Collects all task fields and calls createTask() from useTasks on submit.
 *
 * Fields:
 *   Title*       — required text input (min 1, max 500 chars)
 *   Description  — optional textarea
 *   Status       — select (pre-filled if opened from a column's "+ Add task" button)
 *   Priority     — select (high / normal / low)
 *   Due date     — optional date input
 *   Labels       — multi-select pills from the LABEL_COLORS config
 *
 * Form state:
 *   Local useState — we don't need anything more complex for a single form.
 *   Reset on successful submit so the form is clean if reopened.
 *
 * Error handling:
 *   - Client-side: title required check before calling createTask
 *   - Server-side: if createTask throws, show the error inline (not a toast)
 *
 * Props:
 *   onClose        — closes the modal (called after successful create)
 *   createTask     — from useTasks() — the Supabase insert function
 *   defaultStatus  — which column was clicked, pre-selects that column in the form
 */

import { useState } from 'react'
import { cn, LABEL_COLORS } from '@/lib/utils'
import { PRIORITY_CONFIG, COLUMNS } from '@/types'
import type { NewTask, TaskStatus, TaskPriority } from '@/types'

interface CreateTaskModalProps {
  onClose: () => void
  createTask: (newTask: NewTask) => Promise<unknown>
  /** Which column the user clicked "+ Add task" from — pre-selects that status */
  defaultStatus?: TaskStatus
}

// ─── Form state shape ─────────────────────────────────────────────────────────

interface FormState {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string    // Empty string = no due date (maps to null on submit)
  labels: string[]
}

const DEFAULT_FORM: FormState = {
  title:       '',
  description: '',
  status:      'todo',
  priority:    'normal',
  due_date:    '',
  labels:      [],
}

export function CreateTaskModal({
  onClose,
  createTask,
  defaultStatus = 'todo',
}: CreateTaskModalProps) {

  // ── Form state ──────────────────────────────────────────────────────────────

  /**
   * form — controlled form state.
   * We initialise status from defaultStatus so clicking "+ Add task"
   * on a specific column pre-fills that column in the dropdown.
   */
  const [form, setForm] = useState<FormState>({
    ...DEFAULT_FORM,
    status: defaultStatus,
  })

  // Inline error message — shown below the title field if validation fails
  const [titleError, setTitleError] = useState<string>('')

  // True while the Supabase insert is in flight — disables the submit button
  const [submitting, setSubmitting] = useState(false)

  // Server error — shown at the bottom of the form if createTask throws
  const [submitError, setSubmitError] = useState<string>('')

  // ── Field update helpers ────────────────────────────────────────────────────

  /**
   * setField — updates a single field in form state.
   * Spreading the previous state keeps all other fields unchanged.
   * This pattern avoids one onChange handler per field.
   */
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    // Clear title error as soon as the user starts typing in the title field
    if (key === 'title') setTitleError('')
  }

  /**
   * toggleLabel — adds or removes a label from the form's labels array.
   * Labels are stored as a string[] — we toggle membership.
   */
  function toggleLabel(label: string) {
    setForm(prev => ({
      ...prev,
      labels: prev.labels.includes(label)
        ? prev.labels.filter(l => l !== label)   // Remove if already selected
        : [...prev.labels, label],               // Add if not yet selected
    }))
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  /**
   * handleSubmit — validates and submits the form.
   *
   * Validation:
   *   - Title is required (non-empty after trimming whitespace)
   *   We don't validate max length here — the DB CHECK constraint handles that,
   *   and the textarea's maxLength attribute prevents over-long input.
   *
   * On success:
   *   - createTask() resolves → task is added to the board
   *   - onClose() is called → modal closes
   *   No need to reset form state — the component will unmount when modal closes.
   *
   * On failure:
   *   - setSubmitError() shows the error below the form
   *   - setSubmitting(false) re-enables the submit button
   *   - Modal stays open so the user can retry
   */
  async function handleSubmit(e: React.FormEvent) {
    // Prevent the native browser form submission (which would reload the page)
    e.preventDefault()

    // Client-side validation
    if (!form.title.trim()) {
      setTitleError('Title is required')
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      await createTask({
        title:       form.title.trim(),
        description: form.description.trim() || null,  // Empty string → null in DB
        status:      form.status,
        priority:    form.priority,
        due_date:    form.due_date || null,             // Empty string → null in DB
        labels:      form.labels,
      })
      // Success — close the modal (task is already in the board via setTasks in useTasks)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create task'
      setSubmitError(message)
      setSubmitting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

      {/* ── Title field ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-[12px] font-500 text-pitch-300">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          placeholder="What needs to get done?"
          value={form.title}
          onChange={e => setField('title', e.target.value)}
          maxLength={500}
          autoFocus
          className={cn(
            'w-full h-9 px-3',
            'font-sans text-[13px] text-pitch-100 placeholder:text-pitch-400',
            'bg-pitch-700 border rounded-lg',
            'focus:outline-none focus:border-volt-500/60 transition-colors duration-150',
            titleError
              ? 'border-red-500/60'         // Red border on validation error
              : 'border-pitch-500/40',       // Normal border
          )}
        />
        {/* Inline validation error */}
        {titleError && (
          <p className="font-sans text-[11px] text-red-400">{titleError}</p>
        )}
      </div>

      {/* ── Description field ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-[12px] font-500 text-pitch-300">
          Description
        </label>
        <textarea
          placeholder="Add more context..."
          value={form.description}
          onChange={e => setField('description', e.target.value)}
          rows={3}
          className={cn(
            'w-full px-3 py-2 resize-none',
            'font-sans text-[13px] text-pitch-100 placeholder:text-pitch-400',
            'bg-pitch-700 border border-pitch-500/40 rounded-lg',
            'focus:outline-none focus:border-volt-500/60 transition-colors duration-150',
          )}
        />
      </div>

      {/* ── Status + Priority row ────────────────────────────────────────────── */}
      {/*
        * Two selects side by side.
        * grid-cols-2 with a gap — equal width on both.
      */}
      <div className="grid grid-cols-2 gap-3">

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-[12px] font-500 text-pitch-300">
            Column
          </label>
          <select
            value={form.status}
            onChange={e => setField('status', e.target.value as TaskStatus)}
            className={cn(
              'h-9 px-3 appearance-none cursor-pointer',
              'font-sans text-[13px] text-pitch-100',
              'bg-pitch-700 border border-pitch-500/40 rounded-lg',
              'focus:outline-none focus:border-volt-500/60 transition-colors duration-150',
            )}
          >
            {COLUMNS.map(col => (
              <option key={col.id} value={col.id}>
                {col.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-[12px] font-500 text-pitch-300">
            Priority
          </label>
          <select
            value={form.priority}
            onChange={e => setField('priority', e.target.value as TaskPriority)}
            className={cn(
              'h-9 px-3 appearance-none cursor-pointer',
              'font-sans text-[13px] text-pitch-100',
              'bg-pitch-700 border border-pitch-500/40 rounded-lg',
              'focus:outline-none focus:border-volt-500/60 transition-colors duration-150',
            )}
          >
            {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG[TaskPriority]][]).map(
              ([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              )
            )}
          </select>
        </div>

      </div>

      {/* ── Due date field ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-[12px] font-500 text-pitch-300">
          Due date
        </label>
        <input
          type="date"
          value={form.due_date}
          onChange={e => setField('due_date', e.target.value)}
          className={cn(
            'h-9 px-3 cursor-pointer',
            'font-sans text-[13px] text-pitch-100',
            'bg-pitch-700 border border-pitch-500/40 rounded-lg',
            'focus:outline-none focus:border-volt-500/60 transition-colors duration-150',
            // Style the native date picker icon to match the dark theme
            '[color-scheme:dark]',
          )}
        />
      </div>

      {/* ── Labels ──────────────────────────────────────────────────────────── */}
      {/*
        * Toggle pill buttons — click to add/remove labels.
        * Selected labels have a solid background; unselected are outlined.
        * The colors come from LABEL_COLORS in utils.ts.
      */}
      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-[12px] font-500 text-pitch-300">
          Labels
        </label>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(LABEL_COLORS).map(label => {
            const isSelected = form.labels.includes(label)
            return (
              <button
                key={label}
                type="button"  // Prevent accidental form submission
                onClick={() => toggleLabel(label)}
                className={cn(
                  'px-2.5 py-1 rounded-md font-mono text-[11px] font-500',
                  'border transition-all duration-150',
                  isSelected
                    // Selected: solid background from LABEL_COLORS
                    ? 'bg-volt-500/20 text-volt-400 border-volt-500/40'
                    // Unselected: subtle outline
                    : 'bg-transparent text-pitch-400 border-pitch-500/30 hover:border-pitch-400/50 hover:text-pitch-200',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Server error ─────────────────────────────────────────────────────── */}
      {submitError && (
        <p className="font-sans text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {submitError}
        </p>
      )}

      {/* ── Form actions ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-pitch-500/20">

        {/* Cancel */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="h-8 px-4 font-sans text-[13px] text-pitch-300 hover:text-pitch-100 transition-colors"
        >
          Cancel
        </button>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'h-8 px-4 rounded-lg',
            'font-sans font-500 text-[13px] text-pitch-950',
            'bg-volt-500 hover:bg-volt-400 active:bg-volt-600',
            'transition-colors duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {submitting ? 'Creating...' : 'Create task'}
        </button>

      </div>
    </form>
  )
}
