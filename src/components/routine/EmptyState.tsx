/**
 * EmptyState — shared empty state for Today and All tabs.
 */

import { CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  body: string
  ctaLabel?: string
  onCta?: () => void
}

export function EmptyState({ title, body, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="w-12 h-12 rounded-2xl bg-volt-500/10 flex items-center justify-center mx-auto mb-4">
        <CalendarCheck size={22} className="text-volt-500" />
      </div>
      <h2 className="font-display font-600 text-pitch-100 text-[18px] mb-1">{title}</h2>
      <p className="font-sans text-[13px] text-pitch-400 mb-5">{body}</p>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className={cn(
            'h-9 px-4 bg-volt-500 hover:bg-volt-400 text-pitch-950',
            'font-sans font-600 text-[13px] rounded-lg shadow-volt transition-colors duration-150',
          )}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
