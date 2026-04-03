/**
 * components/board/TaskDetailModal.tsx — Task detail view and editor
 *
 * Shown when the user clicks a task card. Displays all task fields
 * and allows inline editing of any field. Changes are saved to Supabase
 * via updateTask() when the user clicks "Save changes".
 *
 * Two modes:
 *   View mode  — displays all fields read-only (default)
 *   Edit mode  — clicking "Edit" switches to editable form fields
 *
 * We use a single "dirty" flag to know if the user changed anything.
 * If not dirty, "Save changes" button is disabled (no-op protection).
 *
 * Delete:
 *   A "Delete task" button with a confirmation step (click once to show confirm,
 *   click again to actually delete). Prevents accidental deletion.
 *
 * Props:
 *   task         — the Task object to display/edit
 *   onClose      — closes the modal
 *   updateTask   — from useTasks(), Supabase UPDATE
 *   deleteTask   — from useTasks(), Supabase DELETE
 */

import { useState } from 'react'
import { cn, formatDueDate, getDueDateStatus, getLabelStyle, LABEL_COLORS } from '@/lib/utils'
import { PRIORITY_CONFIG, COLUMNS } from '@/types'
import type { Task, TaskStatus, TaskPriority, TaskUpdate } from '@/types'
import { Pencil, Trash2, Check } from 'lucide-react'

interface TaskDetailModalProps {
  task: Task
  onClose: () => void
  updateTask: (id: string, changes: TaskUpdate) => Promise<void>
  deleteTask: (id: string) => Promise<void>
}

// ─── Edit form state ──────────────────────────────────────────────────────────

/**
 * EditState — mirrors the editable Task fields.
 * We initialise this from the task prop and track changes here locally.
 * Only sent to Supabase when the user explicitly clicks "Save changes".
 */
interface EditState {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string   // '' = no due date
  labels: string[]
}

function taskToEditState(task: Task): EditState {
  return {
    title:       task.title,
    description: task.description ?? '',
    status:      task.status,
    priority:    task.priority,
    due_date:    task.due_date ?? '',
    labels:      [...task.labels],  // Shallow copy — don't mutate the original
  }
}

export function TaskDetailModal({
  task,
  onClose,
  updateTask,
  deleteTask,
}: TaskDetailModalProps) {

  // ── Mode + edit state ───────────────────────────────────────────────────────

  /** Whether the form is in edit mode (fields are editable) or view mode */
  const [isEditing, setIsEditing] = useState(false)

  /** Editable copy of the task — only applied to Supabase on explicit save */
  const [editState, setEditState] = useState<EditState>(() => taskToEditState(task))

  // ── Operation state ─────────────────────────────────────────────────────────

  /** True while the Supabase UPDATE is in flight */
  const [saving, setSaving] = useState(false)

  /** True while the Supabase DELETE is in flight */
  const [deleting, setDeleting] = useState(false)

  /**
   * deleteConfirm — two-step delete protection.
   * First click: sets this to true, button text changes to "Confirm delete?"
   * Second click: actually calls deleteTask()
   * Any other interaction resets it to false.
   */
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  /** Save error — shown inline if updateTask throws */
  const [saveError, setSaveError] = useState<string>('')

  // ── Derived values ──────────────────────────────────────────────────────────

  /**
   * isDirty — true if any field in editState differs from the original task.
   * Used to enable/disable the "Save changes" button.
   * We compare field by field — JSON.stringify would work but is less readable.
   */
  const isDirty =
    editState.title       !== task.title ||
    editState.description !== (task.description ?? '') ||
    editState.status      !== task.status ||
    editState.priority    !== task.priority ||
    editState.due_date    !== (task.due_date ?? '') ||
    JSON.stringify(editState.labels) !== JSON.stringify(task.labels)

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function setField<K extends keyof EditState>(key: K, value: EditState[K]) {
    setEditState(prev => ({ ...prev, [key]: value }))
  }

  function toggleLabel(label: string) {
    setEditState(prev => ({
      ...prev,
      labels: prev.labels.includes(label)
        ? prev.labels.filter(l => l !== label)
        : [...prev.labels, label],
    }))
  }

  function handleStartEdit() {
    setIsEditing(true)
    setDeleteConfirm(false)
    setSaveError('')
  }

  function handleCancelEdit() {
    // Reset edit state back to original task values
    setEditState(taskToEditState(task))
    setIsEditing(false)
    setSaveError('')
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  /**
   * handleSave — sends only the changed fields to Supabase.
   *
   * We compute a diff between editState and the original task so we
   * don't send fields that haven't changed. This is more efficient
   * and avoids overwriting any concurrent changes to other fields.
   *
   * After success: switch back to view mode (isEditing = false).
   * After failure: stay in edit mode, show error below the form.
   */
  async function handleSave() {
    if (!editState.title.trim()) {
      setSaveError('Title cannot be empty')
      return
    }

    setSaving(true)
    setSaveError('')

    // Build a partial update containing only changed fields
    const changes: TaskUpdate = {}
    if (editState.title.trim()  !== task.title)             changes.title       = editState.title.trim()
    if ((editState.description.trim() || null) !== task.description) changes.description = editState.description.trim() || null
    if (editState.status        !== task.status)            changes.status      = editState.status
    if (editState.priority      !== task.priority)          changes.priority    = editState.priority
    if ((editState.due_date || null) !== task.due_date)     changes.due_date    = editState.due_date || null
    if (JSON.stringify(editState.labels) !== JSON.stringify(task.labels)) changes.labels = editState.labels

    try {
      await updateTask(task.id, changes)
      setIsEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteConfirm) {
      // First click: show confirmation
      setDeleteConfirm(true)
      return
    }

    // Second click: actually delete
    setDeleting(true)
    try {
      await deleteTask(task.id)
      onClose() // Modal closes when task is deleted
    } catch (err) {
      console.error('[TaskDetailModal] Delete failed:', err)
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  // ── Due date display ─────────────────────────────────────────────────────────

  const dueDateStatus = getDueDateStatus(task.due_date)
  const dueDateLabel  = formatDueDate(task.due_date)

  const dueBadgeClasses: Record<string, string> = {
    overdue: 'bg-red-500/15 text-red-400 border border-red-500/20',
    soon:    'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    ok:      'bg-pitch-600/50 text-pitch-300 border border-pitch-500/20',
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 flex flex-col gap-4">

      {/* ── View mode ─────────────────────────────────────────────────────────── */}
      {!isEditing ? (
        <>
          {/* Title + priority dot */}
          <div className="flex items-start gap-2">
            <div
              className={cn(
                'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                PRIORITY_CONFIG[task.priority].dotColor,
              )}
            />
            <h3 className="font-sans font-500 text-[16px] text-pitch-50 leading-snug">
              {task.title}
            </h3>
          </div>

          {/* Description */}
          {task.description && (
            <p className="font-sans text-[13px] text-pitch-300 leading-relaxed ml-4">
              {task.description}
            </p>
          )}

          {/* Metadata row */}
          <div className="flex flex-wrap gap-2 ml-4">
            {/* Status badge */}
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-pitch-700 border border-pitch-500/30 font-mono text-[11px] text-pitch-300">
              {COLUMNS.find(c => c.id === task.status)?.label ?? task.status}
            </span>
            {/* Priority badge */}
            <span className={cn(
              'inline-flex items-center px-2 py-1 rounded-md font-mono text-[11px]',
              'bg-pitch-700 border border-pitch-500/30',
              PRIORITY_CONFIG[task.priority].color,
            )}>
              {PRIORITY_CONFIG[task.priority].label}
            </span>
            {/* Due date badge */}
            {dueDateLabel && dueDateStatus && (
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-md font-mono text-[11px]',
                dueBadgeClasses[dueDateStatus],
              )}>
                {dueDateLabel}
              </span>
            )}
          </div>

          {/* Labels */}
          {task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 ml-4">
              {task.labels.map(label => {
                const style = getLabelStyle(label)
                return (
                  <span
                    key={label}
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-md',
                      'font-mono text-[11px] font-500',
                      style.bg, style.text,
                    )}
                  >
                    {label}
                  </span>
                )
              })}
            </div>
          )}

          {/* Created at */}
          <p className="font-mono text-[10px] text-pitch-500 ml-4">
            Created {new Date(task.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })}
          </p>
        </>
      ) : (

        /* ── Edit mode ────────────────────────────────────────────────────────── */
        <>
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[12px] font-500 text-pitch-300">Title</label>
            <input
              type="text"
              value={editState.title}
              onChange={e => setField('title', e.target.value)}
              maxLength={500}
              autoFocus
              className="w-full h-9 px-3 font-sans text-[13px] text-pitch-100 bg-pitch-700 border border-pitch-500/40 rounded-lg focus:outline-none focus:border-volt-500/60 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[12px] font-500 text-pitch-300">Description</label>
            <textarea
              value={editState.description}
              onChange={e => setField('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 resize-none font-sans text-[13px] text-pitch-100 bg-pitch-700 border border-pitch-500/40 rounded-lg focus:outline-none focus:border-volt-500/60 transition-colors"
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[12px] font-500 text-pitch-300">Column</label>
              <select
                value={editState.status}
                onChange={e => setField('status', e.target.value as TaskStatus)}
                className="h-9 px-3 appearance-none font-sans text-[13px] text-pitch-100 bg-pitch-700 border border-pitch-500/40 rounded-lg focus:outline-none focus:border-volt-500/60 transition-colors"
              >
                {COLUMNS.map(col => (
                  <option key={col.id} value={col.id}>{col.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[12px] font-500 text-pitch-300">Priority</label>
              <select
                value={editState.priority}
                onChange={e => setField('priority', e.target.value as TaskPriority)}
                className="h-9 px-3 appearance-none font-sans text-[13px] text-pitch-100 bg-pitch-700 border border-pitch-500/40 rounded-lg focus:outline-none focus:border-volt-500/60 transition-colors"
              >
                {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG[TaskPriority]][]).map(
                  ([value, config]) => (
                    <option key={value} value={value}>{config.label}</option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[12px] font-500 text-pitch-300">Due date</label>
            <input
              type="date"
              value={editState.due_date}
              onChange={e => setField('due_date', e.target.value)}
              className="h-9 px-3 font-sans text-[13px] text-pitch-100 bg-pitch-700 border border-pitch-500/40 rounded-lg focus:outline-none focus:border-volt-500/60 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Labels */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[12px] font-500 text-pitch-300">Labels</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(LABEL_COLORS).map(label => {
                const isSelected = editState.labels.includes(label)
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleLabel(label)}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-mono text-[11px] font-500',
                      'border transition-all duration-150',
                      isSelected
                        ? 'bg-volt-500/20 text-volt-400 border-volt-500/40'
                        : 'bg-transparent text-pitch-400 border-pitch-500/30 hover:border-pitch-400/50 hover:text-pitch-200',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Save error */}
          {saveError && (
            <p className="font-sans text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}
        </>
      )}

      {/* ── Action bar ─────────────────────────────────────────────────────────── */}
      {/*
        * Always visible at the bottom of the modal.
        * Contents change based on isEditing mode.
        * border-t separates actions from content.
      */}
      <div className="flex items-center justify-between pt-2 border-t border-pitch-500/20">

        {/* Delete button — left side */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || saving}
          onBlur={() => setDeleteConfirm(false)} // Reset confirm if focus leaves
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 rounded-lg',
            'font-sans text-[12px] transition-colors duration-150',
            deleteConfirm
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'text-pitch-400 hover:text-red-400 hover:bg-red-500/10',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <Trash2 size={13} />
          {deleting ? 'Deleting...' : deleteConfirm ? 'Confirm delete?' : 'Delete'}
        </button>

        {/* Edit/Save/Cancel — right side */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              {/* Cancel edit */}
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="h-8 px-3 font-sans text-[12px] text-pitch-400 hover:text-pitch-100 transition-colors"
              >
                Cancel
              </button>
              {/* Save changes */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isDirty}
                className={cn(
                  'flex items-center gap-1.5 h-8 px-3 rounded-lg',
                  'font-sans font-500 text-[12px] text-pitch-950',
                  'bg-volt-500 hover:bg-volt-400 active:bg-volt-600',
                  'transition-colors duration-150',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                <Check size={13} />
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </>
          ) : (
            /* Edit button — view mode */
            <button
              type="button"
              onClick={handleStartEdit}
              className={cn(
                'flex items-center gap-1.5 h-8 px-3 rounded-lg',
                'font-sans text-[12px] text-pitch-300',
                'hover:text-pitch-100 hover:bg-pitch-700',
                'border border-pitch-500/30 transition-colors duration-150',
              )}
            >
              <Pencil size={13} />
              Edit
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
