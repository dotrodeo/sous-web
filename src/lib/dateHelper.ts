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
