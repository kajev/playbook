import { useEffect, useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { supabase } from '../supabase'
import { listCompletions, listSkips } from '../supabase/reminders'
import { db } from '../db/dexie'
import { computeStreak, type StreakResult } from '../utils/streaks'
import type { Reminder } from '../types/database'

export function useStreak(
  reminder: Pick<Reminder, 'id' | 'recurrence' | 'custom_days' | 'created_at'> | null,
) {
  const [today, setToday] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const streak = useLiveQuery(async (): Promise<StreakResult | null> => {
    if (!reminder || !today) return null
    const [comps, sks] = await Promise.all([
      db.reminder_completions.where('reminder_id').equals(reminder.id).toArray(),
      db.reminder_skips.where('reminder_id').equals(reminder.id).toArray(),
    ])
    return computeStreak(reminder, comps, sks, today)
  }, [reminder?.id, today])

  const refetch = useCallback(async () => {
    if (!reminder) return
    try {
      setRefreshing(true)
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('not authenticated')
      const { data: t, error: te } = await supabase.rpc('user_today', { uid: u.user.id })
      if (te) throw te
      setToday(t as string)
      const [comps, sks] = await Promise.all([
        listCompletions(reminder.id),
        listSkips(reminder.id),
      ])
      await db.transaction('rw', db.reminder_completions, async () => {
        await db.reminder_completions.where('reminder_id').equals(reminder.id).delete()
        if (comps.length > 0) await db.reminder_completions.bulkPut(comps)
      })
      await db.transaction('rw', db.reminder_skips, async () => {
        await db.reminder_skips.where('reminder_id').equals(reminder.id).delete()
        if (sks.length > 0) await db.reminder_skips.bulkPut(sks)
      })
      setError(null)
    } catch (e) {
      setError(e as Error)
    } finally {
      setRefreshing(false)
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

  return { streak: streak ?? null, loading: refreshing && !streak, error, refetch, refreshing }
}
