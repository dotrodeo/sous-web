// Port of the date bits of DateHelper.swift used by the pantry/list tabs.
// Swift uses ISO8601 with fractional seconds, which Date.toISOString() matches.

export function toISOString(date: Date = new Date()): string {
  return date.toISOString()
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

/** True if the date is in the past or within the next three days. */
export function isWithinThreeDaysOrPast(dateStr: string): boolean {
  const t = new Date(dateStr).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() >= t - THREE_DAYS_MS
}

/** Weekday name if within the next 3 days, else MM/DD/YYYY (DateHelper.upcomingFormat). */
export function upcomingFormat(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const limit = new Date()
  limit.setDate(limit.getDate() + 3)
  if (d.getTime() <= limit.getTime()) {
    return d.toLocaleDateString(undefined, { weekday: 'long' })
  }
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}/${d.getFullYear()}`
}

/** "today" / "tomorrow" / "in 2 days" / "3 days ago" (DateHelper.relative). */
export function relativeDay(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.round((target.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000))
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(diffDays, 'day')
}
