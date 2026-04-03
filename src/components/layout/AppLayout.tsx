/**
 * components/layout/AppLayout.tsx — Main application shell
 *
 * This is the outer container for everything the user sees after auth.
 * It renders:
 * - A narrow left sidebar (logo, nav, user indicator)
 * - A top header bar (board title, search/filter, stats strip)
 * - The main board area (columns + cards)
 *
 * Layout uses CSS Grid:
 *   [sidebar] [main content]
 *   The sidebar is fixed-width; main content takes remaining space.
 *
 * Props:
 * - userId: the Supabase user ID of the current guest session.
 *   Passed down and used by hooks that interact with Supabase.
 */

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Board } from '@/components/board/Board'
import type { FilterState } from '@/types'

interface AppLayoutProps {
  userId: string
}

export function AppLayout({ userId }: AppLayoutProps) {
  /**
   * filterState — lives here (not in the board) so TopBar and Board
   * can both access it. TopBar writes it, Board reads it.
   *
   * Lifting state up to the lowest common ancestor is the React pattern
   * for sharing state between sibling components.
   */
  const [filters, setFilters] = useState<FilterState>({
    search:   '',
    priority: 'all',
    label:    '',
  })

  return (
    /*
     * Outer container:
     * - h-screen: exactly the viewport height — no page scroll, board scrolls internally
     * - flex: sidebar on left, main content on right
     * - bg-pitch-950: deepest background color
     * - overflow-hidden: prevents any accidental body scroll
     */
    <div className="flex h-screen overflow-hidden bg-pitch-950">

      {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
      {/*
        * Fixed-width sidebar. Contains:
        * - Logo / app name
        * - Navigation items (Board, etc.)
        * - User/session indicator at the bottom
        *
        * w-[200px] is a fixed pixel width — the board adjusts to fill remaining space.
        * On small screens we'd hide this and show a hamburger menu — future enhancement.
      */}
      <Sidebar userId={userId} />

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      {/*
        * flex-1: takes up all remaining horizontal space after the sidebar
        * flex-col: stacks TopBar above the board area
        * min-w-0: critical for flex children — without this, the content area
        *          won't shrink below its content's natural width, causing overflow
      */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* ── Top Header Bar ──────────────────────────────────────────────── */}
        {/*
          * Contains:
          * - Board title ("Playbook")
          * - Sprint banner (name, days left, completion %)
          * - Stats strip (total tasks, done, overdue)
          * - Search input and filter dropdowns
          *
          * Passes setFilters down so the filter controls can update state.
        */}
        <TopBar filters={filters} onFiltersChange={setFilters} />

        {/*
          * Board area — fills remaining height below the TopBar.
          * overflow-hidden: the Board component manages its own scroll internally.
          * The Board mounts its own data hooks (useTasks, useSprint) — this
          * component just passes down the filter state that TopBar controls.
        */}
        <main className="flex-1 overflow-hidden">
          <Board filters={filters} />
        </main>

      </div>
    </div>
  )
}
