// All timestamps are unix seconds. Location-local rendering is done by shifting
// by the location's UTC offset and reading UTC fields, which avoids depending
// on the viewer's own timezone.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const localDate = (ts, offset = 0) => new Date((ts + offset) * 1000)

export function formatHour(ts, offset) {
  const h = localDate(ts, offset).getUTCHours()
  const suffix = h < 12 ? 'AM' : 'PM'
  return `${h % 12 === 0 ? 12 : h % 12}${suffix}`
}

export function formatTime(ts, offset) {
  const d = localDate(ts, offset)
  const h = d.getUTCHours()
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'AM' : 'PM'}`
}

export function formatWeekday(ts, offset, long = false) {
  const d = localDate(ts, offset).getUTCDay()
  return long ? WEEKDAYS_LONG[d] : WEEKDAYS[d]
}

export function localDayKey(ts, offset) {
  const d = localDate(ts, offset)
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export function formatRelative(ts) {
  const diff = Math.max(0, Date.now() / 1000 - ts)
  if (diff < 45) return 'just now'
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`
  return `${Math.round(diff / 3600)} h ago`
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
export const lerp = (a, b, t) => a + (b - a) * t
