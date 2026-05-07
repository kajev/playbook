import { supabase } from '../supabase'
import type {
  Reminder, ReminderInsert, ReminderUpdate,
  ReminderCompletion, ReminderSkip,
} from '../types/database'

// The Push 4 RPCs (mark_reminder_complete, etc.) won't appear in generated types
// until after the migration runs in Supabase. Until then, route those calls
// through this loosely-typed alias. After running the migration and regenerating
// types, we can remove the cast.
const sb = supabase as unknown as {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
}

export async function listVisibleReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .is('archived_at', null)
    .order('due_time', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Reminder[]
}

export async function getReminder(id: string): Promise<Reminder | null> {
  const { data, error } = await supabase
    .from('reminders').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data ?? null) as Reminder | null
}

export async function createReminder(payload: ReminderInsert): Promise<Reminder> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('not authenticated')
  const row = {
    visibility: 'private',
    recurrence: 'daily',
    ...payload,
    owner_id: u.user.id,
    created_by: u.user.id,
  } as ReminderInsert
  const { data, error } = await supabase
    .from('reminders').insert(row).select().single()
  if (error) throw error
  return data as Reminder
}

export async function updateReminder(id: string, patch: ReminderUpdate): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Reminder
}

export async function archiveReminder(id: string): Promise<Reminder> {
  const { data, error } = await sb.rpc('archive_reminder', { p_reminder_id: id })
  if (error) throw error as Error
  return data as Reminder
}

export async function markComplete(reminderId: string): Promise<ReminderCompletion> {
  const { data, error } = await sb.rpc('mark_reminder_complete', { p_reminder_id: reminderId })
  if (error) throw error as Error
  return data as ReminderCompletion
}

export async function unmarkComplete(reminderId: string): Promise<void> {
  const { error } = await sb.rpc('unmark_reminder_complete', { p_reminder_id: reminderId })
  if (error) throw error as Error
}

export async function skipDay(reminderId: string): Promise<ReminderSkip> {
  const { data, error } = await sb.rpc('skip_reminder_today', { p_reminder_id: reminderId })
  if (error) throw error as Error
  return data as ReminderSkip
}

export async function unskipDay(reminderId: string): Promise<void> {
  const { error } = await sb.rpc('unskip_reminder_today', { p_reminder_id: reminderId })
  if (error) throw error as Error
}

export async function listCompletions(
  reminderId: string,
  fromDate?: string,
): Promise<ReminderCompletion[]> {
  let q = supabase
    .from('reminder_completions')
    .select('*')
    .eq('reminder_id', reminderId)
    .order('completed_for_date', { ascending: false })
  if (fromDate) q = q.gte('completed_for_date', fromDate)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as ReminderCompletion[]
}

export async function listSkips(
  reminderId: string,
  fromDate?: string,
): Promise<ReminderSkip[]> {
  let q = supabase
    .from('reminder_skips')
    .select('*')
    .eq('reminder_id', reminderId)
    .order('skipped_for_date', { ascending: false })
  if (fromDate) q = q.gte('skipped_for_date', fromDate)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as ReminderSkip[]
}

export async function getUserToday(): Promise<string> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('not authenticated')
  const { data, error } = await supabase.rpc('user_today', { uid: u.user.id })
  if (error) throw error
  return data as string
}
