/**
 * Dexie database — local cache of Supabase data.
 *
 * Strategy:
 *   - Tables mirror the Supabase tables we read most often.
 *   - Hooks read from Dexie first (instant), then fetch from Supabase in the
 *     background to refresh the cache.
 *   - Realtime events write through to Dexie so all open tabs stay in sync.
 *
 * Push 8 (offline writes) will add an `outbox` table here.
 */

import Dexie, { type Table } from 'dexie'
import type {
  Reminder, ReminderCompletion, ReminderSkip,
  Connection, ConnectionInvite, Profile,
} from '../types/database'

class PlaybookDB extends Dexie {
  reminders!: Table<Reminder, string>
  reminder_completions!: Table<ReminderCompletion, string>
  reminder_skips!: Table<ReminderSkip, string>
  connections!: Table<Connection, string>
  connection_invites!: Table<ConnectionInvite, string>
  profiles!: Table<Profile, string>

  constructor() {
    super('playbook')
    this.version(1).stores({
      // Primary key first, then secondary indexes (& = unique, * = multi-entry).
      reminders:             'id, owner_id, target_user_id, archived_at, recurrence',
      reminder_completions:  'id, reminder_id, completed_by, completed_for_date',
      reminder_skips:        'id, reminder_id, skipped_by, skipped_for_date',
      connections:           'id, user_a, user_b',
      connection_invites:    'id, inviter_id, invite_code, accepted_at, expires_at',
      profiles:              'id',
    })
  }
}

export const db = new PlaybookDB()

/**
 * Replace all rows in a Dexie table with the given list.
 * Used after a fresh fetch from Supabase to keep the cache canonical.
 *
 * Wrapped in a transaction so partial failures don't leave the table half-empty.
 */
export async function replaceAll<T>(table: Table<T, string>, rows: T[]): Promise<void> {
  await db.transaction('rw', table, async () => {
    await table.clear()
    if (rows.length > 0) await table.bulkPut(rows)
  })
}

/**
 * Upsert a subset of rows (used when realtime delivers individual changes).
 */
export async function upsertMany<T>(table: Table<T, string>, rows: T[]): Promise<void> {
  if (rows.length === 0) return
  await table.bulkPut(rows)
}

/**
 * Delete rows by id (used when realtime delivers DELETE events).
 */
export async function deleteByIds<T>(table: Table<T, string>, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await table.bulkDelete(ids)
}
