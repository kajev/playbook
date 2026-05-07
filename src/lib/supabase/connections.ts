import { supabase } from '../supabase'
import type { Connection, ConnectionInvite } from '../types/database'

// connection_invites Insert columns are tightly typed (likely RLS auto-fills
// inviter_id via a default). Cast around the typed insert.
type InviteInsertLoose = Record<string, unknown>

export async function listConnections(): Promise<Connection[]> {
  const { data, error } = await supabase
    .from('connections').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Connection[]
}

export async function listPendingInvites(): Promise<ConnectionInvite[]> {
  const { data, error } = await supabase
    .from('connection_invites')
    .select('*')
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ConnectionInvite[]
}

export async function sendInvite(opts: { email?: string; ttlHours?: number } = {}): Promise<ConnectionInvite> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('not authenticated')
  const ttlHours = opts.ttlHours ?? 168
  const expires_at = new Date(Date.now() + ttlHours * 3600_000).toISOString()
  for (let i = 0; i < 3; i++) {
    const code = generateCode()
    const row: InviteInsertLoose = {
      inviter_id: u.user.id,
      code,
      email: opts.email ?? null,
      expires_at,
    }
    const { data, error } = await supabase
      .from('connection_invites')
      .insert(row as never)
      .select()
      .single()
    if (!error) return data as ConnectionInvite
    if ((error as { code?: string }).code !== '23505') throw error
  }
  throw new Error('could not generate a unique invite code')
}

export async function cancelInvite(id: string): Promise<void> {
  const { error } = await supabase.from('connection_invites').delete().eq('id', id)
  if (error) throw error
}

export async function acceptInvite(code: string): Promise<unknown> {
  const { data, error } = await supabase.rpc('accept_invite', { code })
  if (error) throw error
  return data
}

export async function removeConnection(id: string): Promise<void> {
  const { error } = await supabase.from('connections').delete().eq('id', id)
  if (error) throw error
}

function generateCode(): string {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const buf = new Uint32Array(6)
  crypto.getRandomValues(buf)
  let s = ''
  for (let i = 0; i < 6; i++) s += alpha[buf[i] % alpha.length]
  return s
}
