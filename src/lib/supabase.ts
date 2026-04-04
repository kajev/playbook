/// <reference types="vite/client" />
/**
 * lib/supabase.ts — Supabase client initialization
 *
 * This file creates and exports the single Supabase client instance
 * used throughout the entire app. We create it once here and import
 * it wherever needed — never instantiate it in components directly.
 *
 * SECURITY NOTES:
 * - We use the PUBLIC ANON KEY only — never the service role key
 * - The anon key is safe to expose in client-side code
 * - Row Level Security (RLS) in Supabase is what actually protects data
 * - Even if someone finds the anon key, they can only access data
 *   that RLS policies allow (their own tasks only)
 *
 * ENV VARS:
 * - VITE_SUPABASE_URL: your project URL (https://xyz.supabase.co)
 * - VITE_SUPABASE_ANON_KEY: your project's public anon key
 * - These are set in .env.local (never committed to git — see .gitignore)
 * - On Vercel, set them in the Environment Variables section of your project settings
 *
 * NOTE: The `/// <reference types="vite/client" />` directive at the top of this
 * file is what tells TypeScript about `import.meta.env`. Without it, tsc sees
 * `ImportMeta` as the bare DOM type which has no `env` property (TS2339).
 * Vite's client types augment ImportMeta to add the `env` field.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// ─── Environment Variable Validation ──────────────────────────────────────────

/*
 * Vite exposes env vars prefixed with VITE_ via import.meta.env.
 * We validate them at startup so errors are caught immediately,
 * not buried in a confusing runtime error later.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error(
    'Missing VITE_SUPABASE_URL environment variable.\n' +
    'Create a .env.local file with VITE_SUPABASE_URL=https://your-project.supabase.co'
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY environment variable.\n' +
    'Create a .env.local file with VITE_SUPABASE_ANON_KEY=your-anon-key'
  )
}


// ─── Client Creation ──────────────────────────────────────────────────────────

/**
 * The Supabase client — our interface to everything Supabase:
 * - supabase.from('tasks').select() → database queries
 * - supabase.auth.signInAnonymously() → guest auth
 * - supabase.auth.getSession() → check current session
 *
 * The Database generic type (from database.types.ts) gives us
 * full TypeScript autocomplete for table names and column names.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    /*
     * persistSession: true (default) — Supabase stores the auth token
     * in localStorage so the guest session survives page refreshes.
     * Without this, every refresh would create a new anonymous user
     * and they'd lose all their tasks.
     */
    persistSession: true,

    /*
     * autoRefreshToken: true (default) — automatically refreshes the
     * JWT before it expires. Anonymous sessions last 1 hour by default
     * in Supabase, but with auto-refresh they can persist indefinitely.
     */
    autoRefreshToken: true,

    /*
     * detectSessionInUrl: true (default) — handles OAuth redirect callbacks.
     * We don't use OAuth, but it's harmless to leave enabled.
     */
    detectSessionInUrl: true,
  },
})


// ─── Auth Helpers ─────────────────────────────────────────────────────────────

/**
 * getOrCreateGuestSession — ensures a guest session exists.
 *
 * Called on app startup (in App.tsx). The flow:
 * 1. Check if a session already exists in localStorage
 * 2. If yes → return the existing user (their tasks are waiting)
 * 3. If no → create a new anonymous user via Supabase Auth
 *
 * Anonymous users are real Supabase auth users — they get a UUID,
 * they can have RLS policies applied to them, and their tasks persist
 * in the database linked to their user_id.
 *
 * Returns the user object so callers know who is logged in.
 */
export async function getOrCreateGuestSession() {
  // Step 1: Check for existing session
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.user) {
    // Existing session found — return the user, no action needed
    return session.user
  }

  // Step 2: No session — create anonymous user
  // signInAnonymously() creates a new user with no email/password.
  // Supabase assigns them a UUID which becomes their user_id.
  const { data, error } = await supabase.auth.signInAnonymously()

  if (error) {
    throw new Error(`Failed to create guest session: ${error.message}`)
  }

  return data.user
}
