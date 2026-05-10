import { useEffect, useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { supabase } from '../supabase'
import { listVisibleReminders } from '../supabase/reminders'
import { db, replaceAll } from '../db/dexie'
import type { Reminder } from '../types/database'

/**
 * useReminders — cache-first reminders feed.
 * 1. Subscribes to local Dexie via useLiveQuery → instant UI on mount.
 * 2. On mount, fetches from Supabase and replaces Dexie cache.
 * 3. Subscribes to realtime; refetches + rewrites cache on any change.
 */
export function useReminders() {
  const [error, setError] = useState<Error | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const reminders = useLiveQuery(async () => {
    return db.reminders
      .filter(r => r.archived_at == null)
      .toArray()
      .then(rs => rs.sort((a, b) => {
        // due_time first (nulls last), then created_at
        const at = a.due_time ?? '~'
        const bt = b.due_time ?? '~'
        if (at !== bt) return at < bt ? -1 : 1
        return (a.created_at ?? '') < (b.created_at ?? '') ? -1 : 1
      }))
  }, [], [] as Reminder[])

  const refetch = useCallback(async () => {
    try {
      setRefreshing(true)
      const data = await listVisibleReminders()
      await replaceAll(db.reminders, data)
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
      .channel('reminders-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reminders' },
        () => { refetch() },
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [refetch])

  // Loading is "true" only when there's nothing yet AND we're refreshing.
  const loading = refreshing && (reminders?.length ?? 0) === 0

  return { reminders: reminders ?? [], loading, error, refetch, refreshing }
}
