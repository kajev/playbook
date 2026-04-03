/**
 * App.tsx — Root application component
 *
 * Responsibilities:
 * 1. Initialize the Supabase guest session on first load
 * 2. Show a loading screen while auth is being established
 * 3. Show an error screen if auth fails
 * 4. Render the main application layout once auth is ready
 *
 * Auth flow:
 * - On mount, we call getOrCreateGuestSession()
 * - This either restores an existing session from localStorage
 *   or creates a new anonymous Supabase user
 * - Once we have a user, we render the Board
 * - The user's ID is stored in state and passed down to components
 *   that need it (though most get it via the Supabase auth context)
 */

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getOrCreateGuestSession } from '@/lib/supabase'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ErrorScreen } from '@/components/ui/ErrorScreen'

// The three possible states our app can be in before rendering the board
type AuthState = 'loading' | 'ready' | 'error'

export default function App() {
  // Track the current Supabase user — null until auth resolves
  const [user, setUser] = useState<User | null>(null)

  // Track where we are in the auth initialization process
  const [authState, setAuthState] = useState<AuthState>('loading')

  // Store any auth error message to display to the user
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    /**
     * initializeAuth — called once on component mount.
     *
     * We don't put the async logic directly in useEffect because
     * useEffect callbacks can't be async. Instead we define an
     * inner async function and call it immediately.
     *
     * This pattern is standard in React for async initialization.
     */
    async function initializeAuth() {
      try {
        // getOrCreateGuestSession either:
        // a) Finds an existing session in localStorage → returns that user
        // b) Creates a new anonymous Supabase user → returns the new user
        const user = await getOrCreateGuestSession()

        if (user) {
          setUser(user)
          setAuthState('ready')
        } else {
          // This shouldn't happen — signInAnonymously always returns a user
          // or throws. But we handle it defensively.
          throw new Error('Authentication returned no user')
        }
      } catch (err) {
        // Auth failed — could be network error, Supabase down, bad config, etc.
        const message = err instanceof Error ? err.message : 'Unknown authentication error'
        setAuthError(message)
        setAuthState('error')
        // Log for debugging — remove in production or use a proper logger
        console.error('[Auth] Failed to initialize guest session:', err)
      }
    }

    initializeAuth()

    // No cleanup needed — auth init is a one-time operation, not a subscription
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps array = run once on mount only

  // ── Render based on auth state ─────────────────────────────────────────────

  if (authState === 'loading') {
    // Show animated loading screen while Supabase session is being established
    return <LoadingScreen />
  }

  if (authState === 'error') {
    // Show error screen with the failure message
    // In dev, this often means missing .env.local file
    return <ErrorScreen message={authError ?? 'Failed to connect'} />
  }

  // Auth is ready — render the main app
  // We know user is non-null here because authState === 'ready'
  // only gets set when we successfully received a user object
  return <AppLayout userId={user!.id} />
}
