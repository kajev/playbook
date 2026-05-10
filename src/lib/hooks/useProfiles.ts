import { useEffect, useState } from 'react'
import { getProfilesByIds } from '../supabase/profiles'
import type { Profile } from '../types/database'

/**
 * useProfiles — fetches profiles for a set of user IDs and exposes a lookup helper.
 * displayName(id) returns the profile.display_name or a fallback truncated id.
 */
export function useProfiles(ids: string[]) {
  const [byId, setById] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(false)

  // stable key to avoid reloading on every render
  const key = ids.slice().sort().join(',')

  useEffect(() => {
    let cancelled = false
    if (ids.length === 0) { setById({}); return }
    setLoading(true)
    getProfilesByIds(ids)
      .then(profiles => {
        if (cancelled) return
        const map: Record<string, Profile> = {}
        for (const p of profiles) map[p.id] = p
        setById(map)
      })
      .catch(() => { /* silent — UI falls back to truncated id */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const displayName = (id: string): string => {
    const p = byId[id]
    if (p?.display_name && p.display_name.trim().length > 0) return p.display_name
    return `Companion #${id.slice(0, 6)}`
  }

  return { byId, displayName, loading }
}

export function useMyProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = async () => {
    setLoading(true)
    try {
      const { getMyProfile } = await import('../supabase/profiles')
      const p = await getMyProfile()
      setProfile(p)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refetch() }, [])

  return { profile, loading, refetch }
}
