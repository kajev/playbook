/**
 * TodayTab - reminders due today AND assigned to me, grouped by visibility.
 * Push 7.6: filter by doer. Shared reminders targeted at someone else hide from my Today.
 */

import { useMemo } from 'react'
import { ReminderRow } from './ReminderRow'
import { EmptyState } from './EmptyState'
import { isDueOn } from '@/lib/utils/recurrence'
import type { Reminder } from '@/lib/types/database'
import type { useTodayCompletions } from '@/lib/hooks/useTodayCompletions'

interface TodayTabProps {
  reminders: Reminder[]
  today: ReturnType<typeof useTodayCompletions>
  userId: string
  onEdit: (r: Reminder) => void
  onError: (msg: string) => void
  onCreateFirst: () => void
}

function isMyReminder(r: Reminder, userId: string): boolean {
  if (r.visibility !== 'shared') return true
  if (r.target_user_id) return r.target_user_id === userId
  return r.owner_id === userId
}

export function TodayTab({ reminders, today, userId, onEdit, onError, onCreateFirst }: TodayTabProps) {
  const mine = useMemo(
    () => reminders.filter(r => isMyReminder(r, userId)),
    [reminders, userId],
  )

  const dueToday = useMemo(() => {
    const now = new Date()
    return mine.filter(r => isDueOn(r, now))
  }, [mine])

  const shared = dueToday.filter(r => r.visibility === 'shared')
  const privateOnes = dueToday.filter(r => r.visibility !== 'shared')

  if (!mine.length) {
    return (
      <EmptyState
        title="No reminders yet"
        body="Create your first reminder to start a daily routine."
        ctaLabel="Create reminder"
        onCta={onCreateFirst}
      />
    )
  }

  if (!dueToday.length) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 text-pitch-400 text-sm">
        Nothing due today. Take a break.
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {shared.length > 0 && (
        <Section title="Companions" reminders={shared} today={today} onEdit={onEdit} onError={onError} />
      )}
      {privateOnes.length > 0 && (
        <Section title="Private" reminders={privateOnes} today={today} onEdit={onEdit} onError={onError} />
      )}
    </div>
  )
}

interface SectionProps {
  title: string
  reminders: Reminder[]
  today: ReturnType<typeof useTodayCompletions>
  onEdit: (r: Reminder) => void
  onError: (msg: string) => void
}
function Section({ title, reminders, today, onEdit, onError }: SectionProps) {
  return (
    <section>
      <h2 className="font-display font-600 text-pitch-300 text-[12px] uppercase tracking-wider mb-2">{title}</h2>
      <div className="flex flex-col gap-2">
        {reminders.map(r => (
          <ReminderRow
            key={r.id}
            reminder={r}
            isCompleted={today.isCompletedToday(r.id)}
            isSkipped={today.isSkippedToday(r.id)}
            onEdit={onEdit}
            onError={onError}
            mode="today"
          />
        ))}
      </div>
    </section>
  )
}
