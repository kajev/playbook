/**
 * components/ui/ErrorScreen.tsx — Full-page error state
 *
 * Shown when Supabase auth initialization fails.
 * Most common cause in development: missing .env.local file.
 *
 * Design: same centered layout as LoadingScreen but with a red
 * error indicator and the actual error message for debugging.
 *
 * Props:
 * - message: the error string to display (from the caught exception)
 */

import { AlertTriangle } from 'lucide-react'

interface ErrorScreenProps {
  message: string
}

export function ErrorScreen({ message }: ErrorScreenProps) {
  return (
    <div className="fixed inset-0 bg-pitch-950 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 max-w-md w-full text-center">

        {/* Red warning icon — signals something went wrong */}
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle size={28} className="text-red-400" />
        </div>

        {/* Error heading */}
        <div className="font-display font-600 text-pitch-50 text-xl">
          Connection failed
        </div>

        {/* Human-readable explanation */}
        <p className="font-sans text-[13px] text-pitch-300 leading-relaxed">
          Could not connect to the database. Make sure your{' '}
          <code className="font-mono text-volt-400 bg-pitch-800 px-1.5 py-0.5 rounded text-[12px]">
            .env.local
          </code>{' '}
          file exists with valid Supabase credentials.
        </p>

        {/* Technical error message — monospace, dimmer — for developers */}
        {message && (
          <div className="w-full bg-pitch-900 border border-red-500/20 rounded-lg px-4 py-3 text-left">
            <div className="font-mono text-[11px] text-red-400 leading-relaxed break-all">
              {message}
            </div>
          </div>
        )}

        {/* Quick fix instructions */}
        <div className="w-full bg-pitch-900 border border-pitch-500/30 rounded-lg px-4 py-3 text-left">
          <div className="font-mono text-[11px] text-pitch-300 leading-loose">
            <div className="text-pitch-400 mb-1"># Create .env.local in project root:</div>
            <div className="text-volt-400">VITE_SUPABASE_URL=https://xxx.supabase.co</div>
            <div className="text-volt-400">VITE_SUPABASE_ANON_KEY=your-anon-key</div>
          </div>
        </div>

        {/* Reload button — after fixing .env.local, user needs to reload */}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 h-9 px-5 bg-pitch-800 hover:bg-pitch-700 border border-pitch-500/40 rounded-lg font-sans text-[13px] text-pitch-100 transition-colors duration-150"
        >
          Reload page
        </button>

      </div>
    </div>
  )
}
