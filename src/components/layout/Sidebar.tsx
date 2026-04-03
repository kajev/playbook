/**
 * components/layout/Sidebar.tsx — Left navigation sidebar
 *
 * A narrow (200px) fixed sidebar containing:
 * - App logo / wordmark
 * - Navigation items (currently just Board — expandable later)
 * - User session indicator at the bottom (shows first 6 chars of userId)
 *
 * Design notes:
 * - bg-pitch-900: slightly lighter than the main bg, creating depth
 * - The volt accent is used sparingly — only for the active nav item
 * - The user indicator at the bottom is subtle — guests don't need
 *   to think about their session, it just works
 *
 * Props:
 * - userId: shown truncated at the bottom as a "session" indicator
 */

import { LayoutGrid, Zap } from 'lucide-react'

interface SidebarProps {
  userId: string
}

export function Sidebar({ userId }: SidebarProps) {
  return (
    /*
     * w-[200px]: fixed width — must match the value in AppLayout
     * flex-col: stack logo, nav, user vertically
     * border-r: subtle right border separates sidebar from content
     * shrink-0: prevents sidebar from shrinking in the flex layout
     */
    <aside className="w-[200px] shrink-0 flex flex-col bg-pitch-900 border-r border-pitch-500/30">

      {/* ── Logo / App Name ─────────────────────────────────────────────── */}
      {/*
        * The logo area doubles as a visual anchor at the top.
        * We use a bolt icon (Zap) alongside "Playbook" — sports + tech aesthetic.
        * h-[60px] matches the TopBar height for visual alignment.
      */}
      <div className="h-[60px] flex items-center gap-2.5 px-5 border-b border-pitch-500/30">
        {/* Volt-colored bolt icon — the brand mark */}
        <div className="w-7 h-7 rounded-lg bg-volt-500/10 flex items-center justify-center">
          <Zap size={14} className="text-volt-500 fill-volt-500" />
        </div>
        {/* App name — Space Grotesk for the display/brand feel */}
        <span className="font-display font-600 text-pitch-50 text-[15px] tracking-tight">
          Playbook
        </span>
      </div>

      {/* ── Navigation Items ─────────────────────────────────────────────── */}
      {/*
        * Currently just one item (Board). Structure is ready to expand
        * with more nav items in the future (e.g., Settings, Archive).
      */}
      <nav className="flex-1 px-3 py-4">

        {/* Board — the only nav item, always active */}
        {/*
          * The active state uses:
          * - bg-volt-500/10: very subtle volt background
          * - text-volt-500: volt-colored text and icon
          * - border-l-2: a left border accent (Linear's nav pattern)
          *
          * In a multi-page app, we'd use React Router's NavLink here
          * which auto-applies active classes. For this single-page board,
          * we hardcode the active state.
        */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-volt-500/10 border-l-2 border-volt-500 cursor-pointer">
          <LayoutGrid size={15} className="text-volt-500" />
          <span className="font-sans font-500 text-volt-500 text-[13px]">Board</span>
        </div>

      </nav>

      {/* ── User / Session Indicator ──────────────────────────────────────── */}
      {/*
        * Shows a truncated version of the user's UUID as a "Guest #XXXXXX" label.
        * This communicates:
        * a) The app knows who they are (session is persisted)
        * b) They're in a guest session (no sign-in required)
        *
        * We show only the first 6 chars of the UUID — enough to be unique-feeling
        * without displaying the full 36-character UUID.
      */}
      <div className="px-4 py-4 border-t border-pitch-500/30">
        <div className="flex items-center gap-2">
          {/* Guest avatar — a simple colored circle with "G" */}
          <div className="w-6 h-6 rounded-full bg-pitch-600 flex items-center justify-center flex-shrink-0">
            <span className="font-mono text-[10px] text-pitch-200">G</span>
          </div>
          <div className="min-w-0">
            <div className="font-sans text-[11px] text-pitch-300 leading-tight">
              Guest session
            </div>
            {/* Truncated user ID — font-mono for the technical/scoreboard aesthetic */}
            <div className="font-mono text-[10px] text-pitch-400 truncate">
              #{userId.slice(0, 6)}
            </div>
          </div>
        </div>
      </div>

    </aside>
  )
}
