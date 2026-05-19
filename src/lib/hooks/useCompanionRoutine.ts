import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import type { Reminder, ReminderCompletion, ReminderSkip } from '../types/database'

/**
 * useCompanionRoutine - read-only view of a companion's shared reminders + today's check status.
 * Push 7.6: requires the new RLS policy "companions read shared completions/skips" to be live.
 */
export function useCompanionRoutine(companionId: string | null) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [completions, setCompletions] = useState<ReminderCompletion[]>([])
  const [skips, setSkips] = useState<ReminderSkip[]>([])
  const [today, setToday] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!companionId) return
    try {
      setLoading(true)

      const { data: t, error: te } = await supabase.rpc('user_today', { uid: companionId })
      if (te) throw te
      const todayStr = t as string
      setToday(todayStr)

      const { data: rems, error: re } = await supabase
        .from('reminders')
        .select('*')
        .eq('visibility', 'shared')
        .or(`owner_id.eq.${companionId},target_user_id.eq.${companionId}`)
        .is('archived_at', null)
      if (re) throw re

      const list = (rems ?? []) as Reminder[]
      setReminders(list)

      if (list.length === 0) {
        setCompletions([])
        setSkips([])
        setError(null)
        return
      }

      const ids = list.map(r => r.id)
      const [{ data: cs, error: ce }, { data: sk, error: se }] = await Promise.all([
        supabase.from('reminder_completions')
          .select('*')
          .eq('completed_by', companionId)
          .eq('completed_for_date', todayStr)
          .in('reminder_id', ids),
        supabase.from('reminder_skips')
          .select('*')
          .eq('skipped_by', companionId)
          .eq('skipped_for_date', todayStr)
          .in('reminder_id', ids),
      ])
      if (ce) throw ce
      if (se) throw se

      setCompletions((cs ?? []) as ReminderCompletion[])
      setSkips((sk ?? []) as ReminderSkip[])
      setError(null)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [companionId])

  useEffect(() => {
    if (!companionId) {
      setReminders([])
      setCompletions([])
      setSkips([])
      setToday(null)
      setLoading(false)
      return
    }
    refetch()
    const ch = supabase
      .channel(`companion-routine-${companionId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reminder_completions',
          filter: `completed_by=eq.${companionId}` },
        () => { refetch() })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reminder_skips',
          filter: `skipped_by=eq.${companionId}` },
        () => { refetch() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [companionId, refetch])

  const isCompletedToday = (rid: string) => completions.some(c => c.reminder_id === rid)
  const isSkippedToday = (rid: string) => skips.some(s => s.reminder_id === rid)

  return {
    reminders,
    today,
    completions,
    skips,
    isCompletedToday,
    isSkippedToday,
    loading,
    error,
    refetch,
  }
}
