import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getProfilesByIds, getMyProfile } from '../supabase/profiles'
import { db } from '../db/dexie'
import type { Profile } from '../types/database'

/**
 * useProfiles — cache-first profile lookup for a set of user IDs.
 */
export function useProfiles(ids: string[]) {
  const key = ids.slice().sort().join(',')

  // Read from Dexie immediately.
  const cached = useLiveQuery(async () => {
    if (ids.length === 0) return [] as Profile[]
    return db.profiles.where('id').anyOf(ids).toArray()
  }, [key], [] as Profile[])

  // Background refresh from Supabase.
  useEffect(() => {
    if (ids.length === 0) return
    let cancelled = false
    getProfilesByIds(ids).then(profiles => {
      if (cancelled) return
      if (profiles.length > 0) db.profiles.bulkPut(profiles).catch(() => {})
    }).catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const byId: Record<string, Profile> = {}
  for (const p of cached ?? []) byId[p.id] = p

  const displayName = (id: string): string => {
    const p = byId[id]
    if (p?.display_name && p.display_name.trim().length > 0) return p.display_name
    return `Companion #${id.slice(0, 6)}`
  }

  return { byId, displayName, loading: false }
}

export function useMyProfile() {
  const [refreshing, setRefreshing] = useState(true)

  // Cache-first: read whichever row in profiles matches my ID once we know it.
  const profile = useLiveQuery(async () => {
    const list = await db.profiles.toArray()
    if (list.length === 0) return null
    return list[0] ?? null
  }, [], null)

  const refetch = async () => {
    setRefreshing(true)
    try {
      const p = await getMyProfile()
      if (p) await db.profiles.put(p)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { refetch() }, [])

  return { profile: profile ?? null, loading: refreshing && !profile, refetch }
}
