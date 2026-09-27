/** UTC offset in seconds for an IANA zone at a moment, via Intl. */
export function tzOffsetSeconds(timeZone, at = Date.now()) {
  if (!timeZone) return null
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(at)
    const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
    const m = name.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/)
    if (!m) return 0
    const sign = m[1] === '-' ? -1 : 1
    return sign * (Number(m[2]) * 3600 + Number(m[3] ?? 0) * 60)
  } catch {
    return null
  }
}

export const approxOffsetFromLon = (lon) => Math.round(lon / 15) * 3600
