// Single source of truth: re-export Row types from the generated schema.
// Regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
import type { Database } from '../database.types'

type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
type Insert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
type Update<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Profile = Row<'profiles'>
export type Connection = Row<'connections'>
export type ConnectionInvite = Row<'connection_invites'>
export type Reminder = Row<'reminders'>
export type ReminderCompletion = Row<'reminder_completions'>
export type ReminderSkip = Row<'reminder_skips'>
export type Message = Row<'messages'>
export type NotificationPreference = Row<'notification_preferences'>
export type NotificationSubscription = Row<'notification_subscriptions'>

export type ReminderInsert = Insert<'reminders'>
export type ReminderUpdate = Update<'reminders'>

export type Visibility = 'private' | 'shared'
export type Recurrence = 'daily' | 'weekly' | 'custom'
