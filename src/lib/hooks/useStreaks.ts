import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import { listCompletions, listSkips } from '../supabase/reminders'
import { computeStreak, type StreakResult } from '../utils/streaks'
import type { Reminder } from '../types/database'

export function useStreak(
  reminder: Pick<Reminder, 'id' | 'recurrence' | 'custom_days' | 'created_at'> | null,
) {
  const [streak, setStreak] = useState<StreakResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!reminder) return
    try {
      setLoading(true)
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('not authenticated')
      const { data: t, error: te } = await supabase.rpc('user_today', { uid: u.user.id })
      if (te) throw te
      const [comps, sks] = await Promise.all([
        listCompletions(reminder.id),
        listSkips(reminder.id),
      ])
      setStreak(computeStreak(reminder, comps, sks, t as string))
      setError(null)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [reminder])

  useEffect(() => {
    if (!reminder) return
    refetch()
    const ch = supabase
      .channel(`streak-${reminder.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reminder_completions',
          filter: `reminder_id=eq.${reminder.id}` },
        () => { refetch() })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reminder_skips',
          filter: `reminder_id=eq.${reminder.id}` },
        () => { refetch() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [reminder, refetch])

  return { streak, loading, error, refetch }
}
