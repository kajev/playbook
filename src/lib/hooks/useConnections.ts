import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import { listConnections, listPendingInvites } from '../supabase/connections'
import type { Connection, ConnectionInvite } from '../types/database'

export function useConnections() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [pendingInvites, setPendingInvites] = useState<ConnectionInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      const [c, p] = await Promise.all([listConnections(), listPendingInvites()])
      setConnections(c)
      setPendingInvites(p)
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

  return { connections, pendingInvites, loading, error, refetch }
}
