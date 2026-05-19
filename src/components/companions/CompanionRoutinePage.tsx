/**
 * CompanionRoutinePage - read-only view of a companion's shared routine for today + all.
 * Push 7.6.
 */

import { ArrowLeft, Check, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCompanionRoutine } from '@/lib/hooks/useCompanionRoutine'
import { useProfiles } from '@/lib/hooks/useProfiles'
import { isDueOn } from '@/lib/utils/recurrence'
import type { Reminder } from '@/lib/types/database'

interface CompanionRoutinePageProps {
  companionId: string
  onBack: () => void
}

export function CompanionRoutinePage({ companionId, onBack }: CompanionRoutinePageProps) {
  const { reminders, today, isCompletedToday, isSkippedToday, loading, error } = useCompanionRoutine(companionId)
  const { displayName } = useProfiles([companionId])

  const dueToday = reminders.filter(r => {
    if (!today) return false
    const dt = new Date(today + 'T00:00:00')
    return isDueOn(r, dt)
  })

  return (
    <>
      <header className="h-[60px] flex items-center gap-3 px-6 bg-pitch-900 border-b border-pitch-500/30 z-10 shrink-0">
        <button
          onClick={onBack}
          className="h-8 w-8 rounded-md text-pitch-300 hover:text-pitch-100 hover:bg-pitch-800 flex items-center justify-center"
          title="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="font-display font-600 text-pitch-50 text-[18px] tracking-tight">
          {displayName(companionId)}'s routine
        </h1>
      </header>

      <main className="flex-1 overflow-auto px-6 py-6">
        {error && (
          <div className="max-w-2xl mx-auto p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-sm">
            Could not load routine. {error.message}
          </div>
        )}

        {loading && (
          <div className="text-pitch-400 text-sm text-center py-12">Loading...</div>
        )}

        {!loading && !error && reminders.length === 0 && (
          <div className="max-w-2xl mx-auto text-center py-16 text-pitch-400 text-sm">
            No shared reminders with this companion yet.
          </div>
        )}

        {!loading && !error && reminders.length > 0 && (
          <div className="max-w-2xl mx-auto flex flex-col gap-6">
            <section>
              <h2 className="font-display font-600 text-pitch-300 text-[12px] uppercase tracking-wider mb-2">
                Today
              </h2>
              {dueToday.length === 0 ? (
                <div className="text-pitch-400 text-[13px] font-sans py-4">
                  Nothing due today.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {dueToday.map(r => (
                    <ReadOnlyRow
                      key={r.id}
                      reminder={r}
                      done={isCompletedToday(r.id)}
                      skipped={isSkippedToday(r.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="font-display font-600 text-pitch-300 text-[12px] uppercase tracking-wider mb-2">
                All shared ({reminders.length})
              </h2>
              <div className="flex flex-col gap-2">
                {reminders.map(r => (
                  <ReadOnlyRow
                    key={r.id}
                    reminder={r}
                    done={isCompletedToday(r.id)}
                    skipped={isSkippedToday(r.id)}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  )
}

function ReadOnlyRow({ reminder, done, skipped }: { reminder: Reminder; done: boolean; skipped: boolean }) {
  const dim = done || skipped
  const dueTimeLabel = reminder.due_time ? reminder.due_time.slice(0, 5) : null

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-pitch-800/60 border border-pitch-500/20 transition-opacity duration-150',
        dim && 'opacity-60',
      )}
    >
      <div
        className={cn(
          'w-5 h-5 rounded-md border flex items-center justify-center shrink-0',
          done ? 'bg-volt-500 border-volt-500 text-pitch-950' : 'border-pitch-500',
        )}
        aria-label={done ? 'completed' : 'not completed'}
      >
        {done && <Check size={14} strokeWidth={3} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className={cn('font-sans text-[14px] text-pitch-100 truncate', done && 'line-through')}>
          {reminder.title}
        </div>
        {(dueTimeLabel || reminder.notes) && (
          <div className="font-mono text-[11px] text-pitch-400 truncate">
            {dueTimeLabel}
            {dueTimeLabel && reminder.notes && ' - '}
            {reminder.notes}
          </div>
        )}
      </div>

      {skipped && (
        <div className="h-7 px-2 rounded-md text-[11px] font-mono bg-pitch-600 text-pitch-100 flex items-center gap-1 shrink-0">
          <SkipForward size={11} />
          skipped
        </div>
      )}
    </div>
  )
}
