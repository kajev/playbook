import { useEffect, useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { supabase } from '../supabase'
import { listConnections, listPendingInvites } from '../supabase/connections'
import { db, replaceAll } from '../db/dexie'

export function useConnections() {
  const [error, setError] = useState<Error | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const connections = useLiveQuery(async () =>
    db.connections.toArray().then(rs =>
      rs.sort((a, b) => ((a.created_at ?? '') < (b.created_at ?? '') ? 1 : -1)),
    ),
    [], [],
  )

  const pendingInvites = useLiveQuery(async () => {
    const nowIso = new Date().toISOString()
    const all = await db.connection_invites.toArray()
    return all
      .filter(i => i.accepted_at == null && i.expires_at > nowIso)
      .sort((a, b) => ((a.created_at ?? '') < (b.created_at ?? '') ? 1 : -1))
  }, [], [])

  const refetch = useCallback(async () => {
    try {
      setRefreshing(true)
      const [c, p] = await Promise.all([listConnections(), listPendingInvites()])
      await replaceAll(db.connections, c)
      // Don't blow away invites we don't have visibility into. Just upsert ours.
      await db.transaction('rw', db.connection_invites, async () => {
        // Clear inviter-owned visible rows; keep any others Dexie may have.
        const own = await db.connection_invites.toArray()
        const ownIds = own.map(i => i.id)
        await db.connection_invites.bulkDelete(ownIds)
        if (p.length > 0) await db.connection_invites.bulkPut(p)
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
      .channel('connections-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'connections' },
        () => { refetch() })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'connection_invites' },
        () => { refetch() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [refetch])

  const loading = refreshing && (connections?.length ?? 0) === 0 && (pendingInvites?.length ?? 0) === 0

  return {
    connections: connections ?? [],
    pendingInvites: pendingInvites ?? [],
    loading,
    error,
    refetch,
    refreshing,
  }
}
