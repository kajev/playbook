import { useEffect, useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { supabase } from '../supabase'
import { db } from '../db/dexie'
import type { ReminderCompletion, ReminderSkip } from '../types/database'

export function useTodayCompletions() {
  const [today, setToday] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const completions = useLiveQuery(async (): Promise<ReminderCompletion[]> => {
    if (!today || !userId) return []
    return db.reminder_completions
      .where('completed_for_date').equals(today)
      .and(r => r.completed_by === userId)
      .toArray()
  }, [today, userId])

  const skips = useLiveQuery(async (): Promise<ReminderSkip[]> => {
    if (!today || !userId) return []
    return db.reminder_skips
      .where('skipped_for_date').equals(today)
      .and(r => r.skipped_by === userId)
      .toArray()
  }, [today, userId])

  const refetch = useCallback(async () => {
    try {
      setRefreshing(true)
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('not authenticated')
      setUserId(u.user.id)

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

      await db.transaction('rw', db.reminder_completions, async () => {
        await db.reminder_completions
          .where('completed_for_date').equals(todayStr)
          .and(r => r.completed_by === u.user!.id)
          .delete()
        if ((cs ?? []).length > 0) await db.reminder_completions.bulkPut(cs as ReminderCompletion[])
      })
      await db.transaction('rw', db.reminder_skips, async () => {
        await db.reminder_skips
          .where('skipped_for_date').equals(todayStr)
          .and(r => r.skipped_by === u.user!.id)
          .delete()
        if ((sk ?? []).length > 0) await db.reminder_skips.bulkPut(sk as ReminderSkip[])
      })

      setError(null)
    } catch (e) {
      setError(e as Error)
    } finally {
      setRefreshing(false)
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
    (reminderId: string) => (completions ?? []).some(c => c.reminder_id === reminderId),
    [completions],
  )
  const isSkippedToday = useCallback(
    (reminderId: string) => (skips ?? []).some(s => s.reminder_id === reminderId),
    [skips],
  )

  const loading = refreshing && (completions?.length ?? 0) === 0 && (skips?.length ?? 0) === 0

  return {
    today,
    completions: completions ?? [],
    skips: skips ?? [],
    isCompletedToday,
    isSkippedToday,
    loading,
    error,
    refetch,
    refreshing,
  }
}
