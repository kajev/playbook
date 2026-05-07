/**
 * ReminderRow — single reminder line (used in Today + All).
 * mode='today': shows checkbox + skip
 * mode='all':   shows edit + archive
 */

import { useState } from 'react'
import { Check, SkipForward, Pencil, Archive, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  markComplete, unmarkComplete, skipDay, unskipDay, archiveReminder,
} from '@/lib/supabase/reminders'
import { useStreak } from '@/lib/hooks/useStreaks'
import type { Reminder } from '@/lib/types/database'

interface ReminderRowProps {
  reminder: Reminder
  isCompleted: boolean
  isSkipped: boolean
  onEdit: (r: Reminder) => void
  onError: (msg: string) => void
  mode: 'today' | 'all'
}

export function ReminderRow({
  reminder, isCompleted, isSkipped, onEdit, onError, mode,
}: ReminderRowProps) {
  const [busy, setBusy] = useState(false)
  const { streak } = useStreak(reminder)

  const dueTimeLabel = reminder.due_time
    ? formatTime(reminder.due_time)
    : null

  const handleToggleComplete = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (isCompleted) await unmarkComplete(reminder.id)
      else await markComplete(reminder.id)
    } catch {
      onError('Could not update reminder.')
    } finally {
      setBusy(false)
    }
  }

  const handleToggleSkip = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (isSkipped) await unskipDay(reminder.id)
      else await skipDay(reminder.id)
    } catch {
      onError('Could not skip reminder.')
    } finally {
      setBusy(false)
    }
  }

  const handleArchive = async () => {
    if (busy) return
    if (!confirm(`Archive "${reminder.title}"?`)) return
    setBusy(true)
    try {
      await archiveReminder(reminder.id)
    } catch {
      onError('Could not archive reminder.')
    } finally {
      setBusy(false)
    }
  }

  const dimmed = isSkipped || isCompleted

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-pitch-800/60 border border-pitch-500/20 transition-opacity duration-150',
        dimmed && 'opacity-60',
      )}
    >
      {mode === 'today' && (
        <button
          onClick={handleToggleComplete}
          disabled={busy}
          className={cn(
            'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors duration-150',
            isCompleted
              ? 'bg-volt-500 border-volt-500 text-pitch-950'
              : 'border-pitch-500 hover:border-volt-500',
          )}
          title={isCompleted ? 'Mark not done' : 'Mark complete'}
        >
          {isCompleted && <Check size={14} strokeWidth={3} />}
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'font-sans text-[14px] text-pitch-100 truncate',
            isCompleted && 'line-through',
          )}
        >
          {reminder.title}
        </div>
        {(dueTimeLabel || reminder.notes) && (
          <div className="font-mono text-[11px] text-pitch-400 truncate">
            {dueTimeLabel}
            {dueTimeLabel && reminder.notes && ' · '}
            {reminder.notes}
          </div>
        )}
      </div>

      {streak && streak.current > 0 && (
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-pitch-700/60 text-amber-300 shrink-0"
          title={`Current streak: ${streak.current} days · Longest: ${streak.longest}`}
        >
          <Flame size={11} />
          <span className="font-mono text-[11px]">{streak.current}</span>
        </div>
      )}

      {mode === 'today' && (
        <button
          onClick={handleToggleSkip}
          disabled={busy}
          className={cn(
            'h-7 px-2 rounded-md text-[11px] font-mono shrink-0 transition-colors duration-150',
            isSkipped
              ? 'bg-pitch-600 text-pitch-100'
              : 'bg-pitch-700/60 text-pitch-300 hover:bg-pitch-700 hover:text-pitch-100',
          )}
          title={isSkipped ? 'Unskip' : 'Skip today'}
        >
          <SkipForward size={11} className="inline mr-1" />
          {isSkipped ? 'skipped' : 'skip'}
        </button>
      )}

      {mode === 'all' && (
        <>
          <button
            onClick={() => onEdit(reminder)}
            disabled={busy}
            className="h-7 w-7 rounded-md text-pitch-400 hover:text-pitch-100 hover:bg-pitch-700 flex items-center justify-center shrink-0"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={handleArchive}
            disabled={busy}
            className="h-7 w-7 rounded-md text-pitch-400 hover:text-red-400 hover:bg-pitch-700 flex items-center justify-center shrink-0"
            title="Archive"
          >
            <Archive size={13} />
          </button>
        </>
      )}
    </div>
  )
}

function formatTime(t: string): string {
  // "HH:MM:SS" -> "HH:MM"
  return t.slice(0, 5)
}
