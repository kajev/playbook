import type { Reminder, ReminderCompletion, ReminderSkip } from '../types/database'
import { isDueOn, parseDate, formatDate, addDays } from './recurrence'

export type DayStatus = 'done' | 'skipped' | 'missed' | 'not-due' | 'pending'

export interface StreakResult {
  current: number
  longest: number
  last30: { date: string; status: DayStatus }[]
}

export function computeStreak(
  reminder: Pick<Reminder, 'recurrence' | 'custom_days' | 'created_at'>,
  completions: ReminderCompletion[],
  skips: ReminderSkip[],
  today: string,
): StreakResult {
  const done = new Set(completions.map(c => c.completed_for_date))
  const skipped = new Set(skips.map(s => s.skipped_for_date))
  const todayDate = parseDate(today)
  const startDate = reminder.created_at
    ? parseDate(formatDate(new Date(reminder.created_at)))
    : todayDate

  let current = 0
  let cursor = todayDate
  if (isDueOn(reminder, todayDate) && !done.has(today) && !skipped.has(today)) {
    cursor = addDays(cursor, -1)
  }
  while (cursor >= startDate) {
    if (!isDueOn(reminder, cursor)) {
      cursor = addDays(cursor, -1)
      continue
    }
    const key = formatDate(cursor)
    if (done.has(key) || skipped.has(key)) {
      current++
      cursor = addDays(cursor, -1)
      continue
    }
    break
  }

  let longest = 0
  let run = 0
  let walk = startDate
  while (walk <= todayDate) {
    if (isDueOn(reminder, walk)) {
      const key = formatDate(walk)
      if (done.has(key) || skipped.has(key)) {
        run++
        if (run > longest) longest = run
      } else if (key !== today) {
        run = 0
      }
    }
    walk = addDays(walk, 1)
  }

  const last30: { date: string; status: DayStatus }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = addDays(todayDate, -i)
    const key = formatDate(d)
    let status: DayStatus
    if (!isDueOn(reminder, d)) status = 'not-due'
    else if (done.has(key)) status = 'done'
    else if (skipped.has(key)) status = 'skipped'
    else if (key === today) status = 'pending'
    else status = 'missed'
    last30.push({ date: key, status })
  }

  return { current, longest, last30 }
}
