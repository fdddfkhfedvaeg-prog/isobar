import { describeCode, PRECIP_GROUPS } from '../services/weather'
import { formatHour, formatTime, localDayKey } from './format'
import { convert } from './units'

/** The next `count` hourly entries starting at the hour containing `now`. */
export function upcomingHours(data, now, count = 25) {
  const start = data.hourly.findIndex((h) => h.time + 3600 > now)
  return start < 0 ? [] : data.hourly.slice(start, start + count)
}

export function todayHours(data, now) {
  const key = localDayKey(now, data.utcOffset)
  return data.hourly.filter((h) => localDayKey(h.time, data.utcOffset) === key)
}

/** Apple-style one-line narrative for the hourly card. */
export function hourlySummary(data, now, system) {
  const hours = upcomingHours(data, now, 12)
  const cur = describeCode(data.current.code, data.current.isDay)
  const gust = Math.round(convert.wind(data.current.windGust, system))
  const windUnit = system === 'imperial' ? 'mph' : 'km/h'
  const change = hours.find((h) => describeCode(h.code).group !== cur.group)
  const wetSoon = hours.find((h) => PRECIP_GROUPS.has(describeCode(h.code).group))

  let first
  if (PRECIP_GROUPS.has(cur.group)) {
    const dry = hours.find((h) => !PRECIP_GROUPS.has(describeCode(h.code).group))
    first = dry ? `${cur.label} easing around ${formatHour(dry.time, data.utcOffset)}.` : `${cur.label} continuing through the evening.`
  } else if (wetSoon) {
    first = `${describeCode(wetSoon.code).label} expected around ${formatHour(wetSoon.time, data.utcOffset)}.`
  } else if (change) {
    first = `${describeCode(change.code, change.isDay).label} conditions from ${formatHour(change.time, data.utcOffset)}.`
  } else {
    first = `${cur.label} conditions will continue for the rest of the day.`
  }
  return `${first} Wind gusts are up to ${gust} ${windUnit}.`
}

export function uvCategory(uv) {
  const v = Math.round(uv)
  if (v <= 2) return { label: 'Low', tone: 'text-emerald-300' }
  if (v <= 5) return { label: 'Moderate', tone: 'text-yellow-300' }
  if (v <= 7) return { label: 'High', tone: 'text-orange-300' }
  if (v <= 10) return { label: 'Very High', tone: 'text-red-300' }
  return { label: 'Extreme', tone: 'text-fuchsia-300' }
}

export function uvAdvice(data, now) {
  const today = todayHours(data, now)
  const risky = today.filter((h) => h.uv >= 3)
  if (!risky.length) return 'Low for the rest of the day.'
  const end = risky[risky.length - 1].time
  if (end < now) return 'Low for the rest of the day.'
  return `Use sun protection ${formatHour(risky[0].time, data.utcOffset)}–${formatHour(end + 3600, data.utcOffset)}.`
}

const BEAUFORT = [
  [1, 'Calm'],
  [6, 'Light air'],
  [12, 'Light breeze'],
  [20, 'Gentle breeze'],
  [29, 'Moderate breeze'],
  [39, 'Fresh breeze'],
  [50, 'Strong breeze'],
  [62, 'Near gale'],
  [75, 'Gale'],
  [89, 'Strong gale'],
  [103, 'Storm'],
  [Infinity, 'Violent storm'],
]
export const beaufort = (kmh) => BEAUFORT.find(([max]) => kmh < max)[1]

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
export const compassPoint = (deg) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]

export function aqiCategory(v) {
  if (v <= 50) return { label: 'Good', advice: 'Air quality is ideal for outdoor activities.', color: '#34c759' }
  if (v <= 100)
    return { label: 'Moderate', advice: 'Unusually sensitive people should consider reducing prolonged exertion.', color: '#ffd60a' }
  if (v <= 150)
    return { label: 'Unhealthy for Sensitive Groups', advice: 'Children, older adults and people with lung disease should limit outdoor exertion.', color: '#ff9f0a' }
  if (v <= 200) return { label: 'Unhealthy', advice: 'Everyone may begin to experience health effects; limit time outdoors.', color: '#ff453a' }
  if (v <= 300) return { label: 'Very Unhealthy', advice: 'Health alert: avoid outdoor exertion and keep windows closed.', color: '#bf5af2' }
  return { label: 'Hazardous', advice: 'Emergency conditions: stay indoors with filtered air.', color: '#8e2c48' }
}

export function visibilityDescription(km) {
  if (km < 1) return 'Fog is severely limiting visibility.'
  if (km < 4) return 'Haze is reducing visibility.'
  if (km < 10) return 'Moderate visibility right now.'
  if (km < 20) return 'Good visibility.'
  return 'Perfectly clear view.'
}

export function pressureTrend(data, now) {
  const idx = data.hourly.findIndex((h) => h.time + 3600 > now)
  if (idx < 3) return { dir: 0, label: 'Steady' }
  const diff = data.hourly[idx].pressure - data.hourly[idx - 3].pressure
  if (diff > 1.5) return { dir: 1, label: diff > 3 ? 'Rising quickly' : 'Rising' }
  if (diff < -1.5) return { dir: -1, label: diff < -3 ? 'Falling quickly' : 'Falling' }
  return { dir: 0, label: 'Steady' }
}

/** Next two hours of 15-minute precipitation (mm per 15 min). */
export function nextTwoHours(data, now) {
  const fromMinutely = data.minutely.filter((m) => m.time + 900 > now).slice(0, 8)
  if (fromMinutely.length === 8) return fromMinutely
  return upcomingHours(data, now, 2).flatMap((h) =>
    [0, 1, 2, 3].map((q) => ({ time: h.time + q * 900, precip: h.precip / 4 })),
  )
}

export function precipNarrative(slots, data) {
  const threshold = 0.02
  const wetIdx = slots.findIndex((s) => s.precip > threshold)
  if (wetIdx === -1) return 'No precipitation expected in the next 2 hours.'
  if (wetIdx === 0) {
    const stop = slots.findIndex((s) => s.precip <= threshold)
    return stop === -1 ? 'Precipitation continuing for the next 2 hours.' : `Precipitation easing by ${formatTime(slots[stop].time, data.utcOffset)}.`
  }
  return `Precipitation starting around ${formatTime(slots[wetIdx].time, data.utcOffset)}.`
}

export function nextSunEvent(data, now) {
  const today = data.daily.find((d) => localDayKey(d.time, data.utcOffset) === localDayKey(now, data.utcOffset)) ?? data.daily[0]
  const tomorrow = data.daily[data.daily.indexOf(today) + 1]
  if (now < today.sunrise) return { kind: 'Sunrise', time: today.sunrise, other: { kind: 'Sunset', time: today.sunset }, today }
  if (now < today.sunset) return { kind: 'Sunset', time: today.sunset, other: { kind: 'Sunrise', time: tomorrow?.sunrise ?? today.sunrise }, today }
  return { kind: 'Sunrise', time: tomorrow?.sunrise ?? today.sunrise, other: { kind: 'Sunset', time: tomorrow?.sunset ?? today.sunset }, today }
}
