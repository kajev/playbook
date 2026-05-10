/**
 * ReminderModal — create / edit reminder.
 * Push 6.x: target picker uses display names from profiles.
 */

import { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { createReminder, updateReminder } from '@/lib/supabase/reminders'
import { useConnections } from '@/lib/hooks/useConnections'
import { useProfiles } from '@/lib/hooks/useProfiles'
import { supabase } from '@/lib/supabase'
import type { Reminder, ReminderInsert, ReminderUpdate, Recurrence, Visibility } from '@/lib/types/database'

interface ReminderModalProps {
  editing: Reminder | null
  onClose: () => void
  onError: (msg: string) => void
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ReminderModal({ editing, onClose, onError }: ReminderModalProps) {
  const [selfId, setSelfId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('private')
  const [recurrence, setRecurrence] = useState<Recurrence>('daily')
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [dueTime, setDueTime] = useState('')
  const [targetId, setTargetId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const { connections } = useConnections()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSelfId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    if (editing) {
      setTitle(editing.title ?? '')
      setNotes(editing.notes ?? '')
      setVisibility((editing.visibility as Visibility) ?? 'private')
      setRecurrence((editing.recurrence as Recurrence) ?? 'daily')
      setCustomDays(editing.custom_days ?? [1, 2, 3, 4, 5])
      setDueTime(editing.due_time?.slice(0, 5) ?? '')
      setTargetId(editing.target_user_id ?? '')
    } else {
      setTitle('')
      setNotes('')
      setVisibility('private')
      setRecurrence('daily')
      setCustomDays([1, 2, 3, 4, 5])
      setDueTime('')
      setTargetId('')
    }
  }, [editing])

  const partners = useMemo(
    () => connections.map(c => (c.user_a === selfId ? c.user_b : c.user_a)),
    [connections, selfId],
  )
  const { displayName } = useProfiles(partners)

  const handleSubmit = async () => {
    if (saving) return
    if (!title.trim()) { onError('Title is required.'); return }
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        notes: notes.trim() || null,
        visibility,
        recurrence,
        custom_days: recurrence === 'weekly' ? customDays : null,
        due_time: dueTime ? `${dueTime}:00` : null,
        target_user_id: visibility === 'shared' && targetId ? targetId : null,
      }
      if (editing) {
        await updateReminder(editing.id, payload as ReminderUpdate)
      } else {
        await createReminder(payload as ReminderInsert)
      }
      onClose()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (d: number) => {
    setCustomDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())
  }

  return (
    <div className="flex flex-col gap-4 min-w-[400px]">
      <div>
        <label className="block font-sans text-[12px] text-pitch-300 mb-1">Title</label>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Drink water"
          className="w-full h-9 px-3 bg-pitch-800 border border-pitch-500/40 rounded-lg font-sans text-[14px] text-pitch-100 placeholder:text-pitch-400 focus:outline-none focus:border-volt-500/60"
        />
      </div>

      <div>
        <label className="block font-sans text-[12px] text-pitch-300 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-pitch-800 border border-pitch-500/40 rounded-lg font-sans text-[13px] text-pitch-100 placeholder:text-pitch-400 focus:outline-none focus:border-volt-500/60 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-sans text-[12px] text-pitch-300 mb-1">Visibility</label>
          <select
            value={visibility}
            onChange={e => setVisibility(e.target.value as Visibility)}
            className="w-full h-9 px-2 bg-pitch-800 border border-pitch-500/40 rounded-lg font-sans text-[13px] text-pitch-100 focus:outline-none focus:border-volt-500/60"
          >
            <option value="private">🔒 Private</option>
            <option value="shared">👥 Shared</option>
          </select>
        </div>
        <div>
          <label className="block font-sans text-[12px] text-pitch-300 mb-1">Recurrence</label>
          <select
            value={recurrence}
            onChange={e => setRecurrence(e.target.value as Recurrence)}
            className="w-full h-9 px-2 bg-pitch-800 border border-pitch-500/40 rounded-lg font-sans text-[13px] text-pitch-100 focus:outline-none focus:border-volt-500/60"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>

      {visibility === 'shared' && (
        <div>
          <label className="block font-sans text-[12px] text-pitch-300 mb-1">For</label>
          {partners.length === 0 ? (
            <div className="text-pitch-400 text-[12px] font-sans p-3 rounded-lg bg-pitch-800/60 border border-pitch-500/20">
              No companions yet. Add one from the Companions page first.
            </div>
          ) : (
            <select
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              className="w-full h-9 px-2 bg-pitch-800 border border-pitch-500/40 rounded-lg font-sans text-[13px] text-pitch-100 focus:outline-none focus:border-volt-500/60"
            >
              <option value="">Yourself (visible to companions)</option>
              {partners.map(pid => (
                <option key={pid} value={pid}>{displayName(pid)}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {recurrence === 'weekly' && (
        <div>
          <label className="block font-sans text-[12px] text-pitch-300 mb-1">Days</label>
          <div className="flex gap-1">
            {DAYS.map((d, i) => (
              <button
                key={d}
                onClick={() => toggleDay(i)}
                className={cn(
                  'flex-1 h-8 rounded-md font-mono text-[11px] transition-colors duration-150',
                  customDays.includes(i)
                    ? 'bg-volt-500 text-pitch-950'
                    : 'bg-pitch-800 text-pitch-300 hover:bg-pitch-700',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block font-sans text-[12px] text-pitch-300 mb-1">Due time (optional)</label>
        <input
          type="time"
          value={dueTime}
          onChange={e => setDueTime(e.target.value)}
          className="h-9 px-3 bg-pitch-800 border border-pitch-500/40 rounded-lg font-sans text-[13px] text-pitch-100 focus:outline-none focus:border-volt-500/60"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onClose}
          disabled={saving}
          className="h-8 px-3 rounded-lg font-sans text-[13px] text-pitch-300 hover:text-pitch-100 hover:bg-pitch-800"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !title.trim()}
          className={cn(
            'h-8 px-4 rounded-lg font-sans font-600 text-[13px] transition-colors duration-150',
            !title.trim() || saving
              ? 'bg-pitch-700 text-pitch-400 cursor-not-allowed'
              : 'bg-volt-500 hover:bg-volt-400 text-pitch-950 shadow-volt',
          )}
        >
          {saving ? 'Saving…' : editing ? 'Save' : 'Create'}
        </button>
      </div>
    </div>
  )
}
