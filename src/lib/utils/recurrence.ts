import type { Reminder } from '../types/database'

export function isDueOn(
  r: Pick<Reminder, 'recurrence' | 'custom_days'>,
  date: Date,
): boolean {
  if (r.recurrence === 'daily') return true
  if (r.recurrence === 'weekly') {
    return Array.isArray(r.custom_days) && r.custom_days.includes(date.getDay())
  }
  return true
}

export function parseDate(yyyymmdd: string): Date {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
