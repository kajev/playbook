/**
 * components/ui/LoadingScreen.tsx — Full-page loading state
 *
 * Shown while Supabase auth is being initialized (typically < 500ms).
 * Design: centered volt logo with a subtle pulse animation.
 * We don't show a spinner — the pulse on the logo is more on-brand.
 */

import { Zap } from 'lucide-react'

export function LoadingScreen() {
  return (
    /*
     * Fixed full-screen overlay — same background as the app body.
     * Using fixed + inset-0 ensures it covers everything, even before
     * the React app has fully mounted its layout.
     */
    <div className="fixed inset-0 bg-pitch-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">

        {/* Volt bolt icon with pulse — the brand loading indicator */}
        <div className="w-14 h-14 rounded-2xl bg-volt-500/10 flex items-center justify-center animate-pulse">
          <Zap size={28} className="text-volt-500 fill-volt-500" />
        </div>

        {/* App name */}
        <div className="font-display font-600 text-pitch-50 text-xl tracking-tight">
          Playbook
        </div>

        {/* Subtle status text */}
        <div className="font-mono text-[11px] text-pitch-400">
          Starting session...
        </div>

      </div>
    </div>
  )
}
