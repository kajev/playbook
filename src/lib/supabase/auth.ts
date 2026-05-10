import { supabase } from '../supabase'
import { db } from '../db/dexie'

/**
 * signOutCompletely — fully log the user out and reset local state.
 *
 * Steps:
 *   1. Sign out from Supabase Auth (clears localStorage tokens).
 *   2. Wipe the Dexie cache so no other user's data remains.
 *   3. Force a reload so App.tsx re-runs guest-session creation.
 *
 * Used by the "Sign out" button on the Companions page.
 * After this, the user has a fresh anonymous session.
 */
export async function signOutCompletely(): Promise<void> {
  try { await supabase.auth.signOut() } catch { /* ignore */ }

  // Clear every Dexie table we've populated.
  await db.transaction(
    'rw',
    [
      db.reminders,
      db.reminder_completions,
      db.reminder_skips,
      db.connections,
      db.connection_invites,
      db.profiles,
    ],
    async () => {
      await db.reminders.clear()
      await db.reminder_completions.clear()
      await db.reminder_skips.clear()
      await db.connections.clear()
      await db.connection_invites.clear()
      await db.profiles.clear()
    },
  )

  // Reload — App.tsx will create a fresh anonymous session.
  window.location.reload()
}
