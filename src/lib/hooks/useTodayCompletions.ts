import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import type { ReminderCompletion, ReminderSkip } from '../types/database'

export function useTodayCompletions() {
  const [today, setToday] = useState<string | null>(null)
  const [completions, setCompletions] = useState<ReminderCompletion[]>([])
  const [skips, setSkips] = useState<ReminderSkip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('not authenticated')
      const { data: t, error: te } = await supabase.rpc('user_today', { uid: u.user.id })
      if (te) throw te
      const todayStr = t as string
      setToday(todayStr)

      const [{ data: cs, error: ce }, { data: sk, error: se }] = await Promise.all([
        supabase.from('reminder_completions')
          .select('*').eq('completed_by', u.user.id).eq('completed_for_date', todayStr),
        supabase.from('reminder_skips')
          .select('*').eq('skipped_by', u.user.id).eq('skipped_for_date', todayStr),
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
  }, [])

  useEffect(() => {
    refetch()
    const ch = supabase
      .channel('today-completions-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reminder_completions' },
        () => { refetch() })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reminder_skips' },
        () => { refetch() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [refetch])

  const isCompletedToday = useCallback(
    (reminderId: string) => completions.some(c => c.reminder_id === reminderId),
    [completions],
  )
  const isSkippedToday = useCallback(
    (reminderId: string) => skips.some(s => s.reminder_id === reminderId),
    [skips],
  )

  return { today, completions, skips, isCompletedToday, isSkippedToday, loading, error, refetch }
}
