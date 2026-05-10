import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getProfilesByIds, getMyProfile } from '../supabase/profiles'
import { supabase } from '../supabase'
import { db } from '../db/dexie'
import type { Profile } from '../types/database'

/**
 * useProfiles — cache-first profile lookup for a set of user IDs.
 */
export function useProfiles(ids: string[]) {
  const key = ids.slice().sort().join(',')

  const cached = useLiveQuery(async (): Promise<Profile[]> => {
    if (ids.length === 0) return []
    return db.profiles.where('id').anyOf(ids).toArray()
  }, [key])

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

/**
 * useMyProfile — strictly read MY OWN profile row from the cache (filtered
 * by auth.uid). Push 7.5 fix: previously read toArray()[0] which could
 * return a companion's profile if theirs was cached first.
 */
export function useMyProfile() {
  const [refreshing, setRefreshing] = useState(true)
  const [myId, setMyId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null))
  }, [])

  const profile = useLiveQuery(async (): Promise<Profile | null> => {
    if (!myId) return null
    const row = await db.profiles.where('id').equals(myId).first()
    return row ?? null
  }, [myId])

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
