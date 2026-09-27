// NOAA-style sunrise/sunset approximation. Used by the offline mock engine.
const rad = Math.PI / 180

/** Returns { sunrise, sunset } unix seconds for the UTC day containing `dayTs`. */
export function sunTimes(lat, lon, dayTs) {
  const date = new Date(dayTs * 1000)
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const dayOfYear = Math.floor((dayTs * 1000 - start) / 86400000)
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1)
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma)
  const cosHa =
    Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl)
  const ha = Math.acos(Math.min(1, Math.max(-1, cosHa))) / rad
  const noonMin = 720 - 4 * lon - eqTime
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000
  return {
    sunrise: Math.round(midnight + (noonMin - 4 * ha) * 60),
    sunset: Math.round(midnight + (noonMin + 4 * ha) * 60),
  }
}
