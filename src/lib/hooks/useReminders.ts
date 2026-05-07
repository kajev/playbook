import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import { listVisibleReminders } from '../supabase/reminders'
import type { Reminder } from '../types/database'

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listVisibleReminders()
      setReminders(data)
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
      .channel('reminders-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reminders' },
        () => { refetch() },
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [refetch])

  return { reminders, loading, error, refetch }
}
