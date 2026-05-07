/**
 * AllTab — every active reminder, grouped by visibility, with edit + archive.
 */

import { ReminderRow } from './ReminderRow'
import { EmptyState } from './EmptyState'
import type { Reminder } from '@/lib/types/database'
import type { useTodayCompletions } from '@/lib/hooks/useTodayCompletions'

interface AllTabProps {
  reminders: Reminder[]
  today: ReturnType<typeof useTodayCompletions>
  onEdit: (r: Reminder) => void
  onError: (msg: string) => void
  onCreateFirst: () => void
}

export function AllTab({ reminders, today, onEdit, onError, onCreateFirst }: AllTabProps) {
  if (!reminders.length) {
    return (
      <EmptyState
        title="No reminders yet"
        body="Create your first reminder to start a daily routine."
        ctaLabel="Create reminder"
        onCta={onCreateFirst}
      />
    )
  }
  const shared = reminders.filter(r => r.visibility === 'shared')
  const privateOnes = reminders.filter(r => r.visibility !== 'shared')

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {shared.length > 0 && (
        <section>
          <h2 className="font-display font-600 text-pitch-300 text-[12px] uppercase tracking-wider mb-2">Companions</h2>
          <div className="flex flex-col gap-2">
            {shared.map(r => (
              <ReminderRow
                key={r.id}
                reminder={r}
                isCompleted={today.isCompletedToday(r.id)}
                isSkipped={today.isSkippedToday(r.id)}
                onEdit={onEdit}
                onError={onError}
                mode="all"
              />
            ))}
          </div>
        </section>
      )}
      {privateOnes.length > 0 && (
        <section>
          <h2 className="font-display font-600 text-pitch-300 text-[12px] uppercase tracking-wider mb-2">Private</h2>
          <div className="flex flex-col gap-2">
            {privateOnes.map(r => (
              <ReminderRow
                key={r.id}
                reminder={r}
                isCompleted={today.isCompletedToday(r.id)}
                isSkipped={today.isSkippedToday(r.id)}
                onEdit={onEdit}
                onError={onError}
                mode="all"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
