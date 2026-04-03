/**
 * components/board/BoardSkeleton.tsx — Loading state for the board
 *
 * Shown while useTasks() is fetching the initial data from Supabase.
 * Renders placeholder columns and cards using the shimmer animation
 * defined in index.css — same layout as the real board so there's
 * no jarring layout shift when the real content arrives.
 *
 * Design principle: skeleton screens are better than spinners because
 * they set spatial expectations — the user knows exactly where content
 * will appear, reducing perceived load time.
 *
 * Each skeleton column has:
 *   - A placeholder header (title bar + count dot)
 *   - 2-4 placeholder cards of varying heights (mimics real card variance)
 *
 * The shimmer animation sweeps left-to-right across each element.
 * Defined in index.css as the .shimmer utility class.
 */

import { cn } from '@/lib/utils'

// ─── Skeleton primitives ──────────────────────────────────────────────────────

/**
 * SkeletonBlock — a single shimmer rectangle.
 * Used to build up skeleton cards and header elements.
 *
 * @param className — additional Tailwind classes for sizing/positioning
 */
function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-md shimmer',          // shimmer class from index.css
        'bg-pitch-700',                // base color the gradient animates over
        className,
      )}
    />
  )
}

/**
 * SkeletonCard — a placeholder task card with varying content lines.
 *
 * @param lines   — number of content lines to show (simulates card height)
 * @param hasTag  — whether to show a label pill placeholder
 */
function SkeletonCard({ lines = 2, hasTag = false }: { lines?: number; hasTag?: boolean }) {
  return (
    <div className="p-3 rounded-card bg-pitch-700/50 border border-pitch-500/20">
      {/* Title row: priority dot placeholder + title bar */}
      <div className="flex items-center gap-2 mb-2">
        <SkeletonBlock className="w-1.5 h-1.5 rounded-full flex-shrink-0" />
        <SkeletonBlock className="h-3 flex-1" />
      </div>
      {/* Extra content lines (simulates description) */}
      {lines >= 2 && (
        <SkeletonBlock className="h-2.5 w-4/5 mb-2 ml-3.5" />
      )}
      {lines >= 3 && (
        <SkeletonBlock className="h-2.5 w-3/5 mb-2 ml-3.5" />
      )}
      {/* Optional label pill placeholder */}
      {hasTag && (
        <SkeletonBlock className="h-4 w-14 rounded-md mb-2 ml-3.5" />
      )}
    </div>
  )
}

/**
 * SkeletonColumn — a placeholder column with header + cards.
 *
 * @param cardCount — how many skeleton cards to render in this column
 */
function SkeletonColumn({ cardCount }: { cardCount: number }) {
  return (
    <div className="flex flex-col w-column min-w-column rounded-col bg-pitch-800 border border-pitch-500/20 border-t-2 border-t-pitch-500/40">

      {/* Column header: title placeholder + count dot */}
      <div className="flex items-center justify-between px-4 py-3">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="h-5 w-5 rounded-full" />
      </div>

      {/* Divider */}
      <div className="h-px bg-pitch-500/20 mx-3" />

      {/* Skeleton cards */}
      <div className="p-3 flex flex-col gap-2">
        {Array.from({ length: cardCount }).map((_, i) => (
          <SkeletonCard
            key={i}
            // Alternate card heights and tag presence for visual realism
            lines={i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1}
            hasTag={i % 3 === 1}
          />
        ))}
      </div>

    </div>
  )
}

// ─── Main skeleton ────────────────────────────────────────────────────────────

/**
 * BoardSkeleton — four placeholder columns matching the real board layout.
 *
 * Card counts per column are intentionally varied to look like real data:
 *   To Do:       3 cards (backlog has the most)
 *   In Progress: 2 cards (active work is more focused)
 *   In Review:   1 card  (review is a bottleneck)
 *   Done:        2 cards (some completed work)
 *
 * Same container structure as Board.tsx so the transition is seamless.
 */
export function BoardSkeleton() {
  return (
    <div className="h-full overflow-hidden">
      <div className="board-scroll flex items-start gap-4 h-full px-6 py-5">
        <SkeletonColumn cardCount={3} />
        <SkeletonColumn cardCount={2} />
        <SkeletonColumn cardCount={1} />
        <SkeletonColumn cardCount={2} />
      </div>
    </div>
  )
}
