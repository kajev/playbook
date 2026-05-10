import { supabase } from '../supabase'
import type { Profile } from '../types/database'

export async function getMyProfile(): Promise<Profile | null> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) return null
  const { data, error } = await supabase
    .from('profiles').select('*').eq('id', u.user.id).maybeSingle()
  if (error) throw error
  return (data ?? null) as Profile | null
}

export async function getProfilesByIds(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('profiles').select('*').in('id', ids)
  if (error) throw error
  return (data ?? []) as Profile[]
}

export async function updateMyProfile(patch: { display_name?: string | null }): Promise<Profile> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('not authenticated')
  const { data, error } = await supabase
    .from('profiles')
    .update(patch as never)
    .eq('id', u.user.id)
    .select()
    .single()
  if (error) throw error
  return data as Profile
}
