// Offline weather synthesiser.
//
// Produces data in exactly the same normalised shape as the Open-Meteo adapter,
// derived from a small but physically plausible climate model: latitude- and
// season-driven baselines, a diurnal cycle, a Markov chain of daily weather
// regimes, real solar geometry and consistent derived quantities (dew point,
// feels-like, UV, visibility, pressure tendency). It is seeded by location and
// date, so the same place shows the same story across refreshes.

import { sunTimes } from './solar'
import { approxOffsetFromLon, tzOffsetSeconds } from './timezone'

const HOUR = 3600
const DAY = 86400
const TAU = Math.PI * 2

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hashSeed = (...nums) =>
  nums.reduce((h, n) => Math.imul(h ^ Math.round(n * 1000), 2654435761) >>> 0, 2166136261)

const REGIMES = ['clear', 'partly', 'cloudy', 'rain', 'storm', 'fog']
// Row = today's regime, columns = tomorrow's probability (same order as REGIMES).
const TRANSITIONS = {
  clear: [0.5, 0.3, 0.1, 0.05, 0.02, 0.03],
  partly: [0.3, 0.35, 0.2, 0.1, 0.03, 0.02],
  cloudy: [0.1, 0.3, 0.3, 0.22, 0.04, 0.04],
  rain: [0.08, 0.22, 0.3, 0.32, 0.06, 0.02],
  storm: [0.15, 0.3, 0.25, 0.25, 0.05, 0.0],
  fog: [0.3, 0.35, 0.2, 0.1, 0.0, 0.05],
}

function pick(weights, r) {
  let acc = 0
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i]
    if (r <= acc) return i
  }
  return weights.length - 1
}

const magnusDewPoint = (t, rh) => {
  const a = 17.62
  const b = 243.12
  const g = Math.log(Math.max(rh, 1) / 100) + (a * t) / (b + t)
  return (b * g) / (a - g)
}

function feelsLike(t, rh, windKmh) {
  if (t <= 10 && windKmh > 4.8) {
    const v = Math.pow(windKmh, 0.16)
    return 13.12 + 0.6215 * t - 11.37 * v + 0.3965 * t * v
  }
  if (t >= 26) {
    const e = (rh / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t))
    return t + 0.33 * e - 0.7
  }
  return t
}

function regimeCode(regime, hourFrac, temp, rand, wet) {
  const frozen = temp < 0.8
  switch (regime) {
    case 'clear':
      return rand < 0.75 ? 0 : 1
    case 'partly':
      return rand < 0.25 ? 1 : 2
    case 'cloudy':
      return rand < 0.3 ? 2 : 3
    case 'fog':
      return hourFrac > 0.2 && hourFrac < 0.45 ? 45 : rand < 0.5 ? 2 : 3
    case 'rain':
      if (!wet) return 3
      if (frozen) return rand < 0.5 ? 71 : 73
      return rand < 0.35 ? 61 : rand < 0.75 ? 63 : 80
    case 'storm':
      if (!wet) return rand < 0.5 ? 2 : 3
      if (frozen) return 75
      return rand < 0.6 ? 95 : 81
    default:
      return 2
  }
}

export function generateMockWeather(location, nowMs = Date.now()) {
  const { lat, lon } = location
  const now = Math.floor(nowMs / 1000)
  const offset = tzOffsetSeconds(location.timezone, nowMs) ?? approxOffsetFromLon(lon)
  const localMidnight = Math.floor((now + offset) / DAY) * DAY - offset
  const absLat = Math.abs(lat)

  // --- climate baseline ------------------------------------------------------
  const yearStart = Date.UTC(new Date(nowMs).getUTCFullYear(), 0, 0) / 1000
  const doy = (localMidnight - yearStart) / DAY
  const annualMean = 27 - 0.4 * Math.max(0, absLat - 10)
  const seasonalAmp = 0.28 * absLat
  const seasonPhase = Math.cos((TAU * (doy - 200)) / 365) * Math.sign(lat || 1)

  // --- daily regimes via a Markov chain -------------------------------------
  const dayIndex = Math.floor((localMidnight + offset) / DAY)
  const seedRand = mulberry32(hashSeed(lat, lon, dayIndex))
  const days = []
  let regime = REGIMES[pick([0.35, 0.3, 0.15, 0.12, 0.04, 0.04], seedRand())]
  for (let d = 0; d < 10; d++) {
    if (d > 0) regime = REGIMES[pick(TRANSITIONS[regime], seedRand())]
    const start = localMidnight + d * DAY
    const { sunrise, sunset } = sunTimes(lat, lon, start + 12 * HOUR)
    const rainStart = 4 + Math.floor(seedRand() * 14)
    days.push({
      regime,
      start,
      sunrise,
      sunset,
      anomaly: (seedRand() - 0.5) * 6,
      wetFrom: rainStart,
      wetTo: rainStart + 3 + Math.floor(seedRand() * 7),
      windBase: 6 + seedRand() * 14 + (regime === 'storm' ? 22 : regime === 'rain' ? 8 : 0),
      windDir: seedRand() * 360,
      aqiBase: 18 + seedRand() * 60,
    })
  }

  const cloudFor = { clear: 0.08, partly: 0.4, cloudy: 0.85, rain: 0.9, storm: 0.95, fog: 0.7 }

  // --- hourly ----------------------------------------------------------------
  const hourly = []
  const hourRand = mulberry32(hashSeed(lat, lon, dayIndex, 7))
  for (let h = 0; h < 240; h++) {
    const time = localMidnight + h * HOUR
    const day = days[Math.floor(h / 24)]
    const hod = h % 24
    const cloud = Math.min(1, cloudFor[day.regime] + (hourRand() - 0.5) * 0.15)
    const diurnalRange = 10 * (1 - 0.55 * cloud) * (absLat > 55 ? 0.7 : 1)
    const diurnal = Math.cos((TAU * (hod - 15)) / 24) * (diurnalRange / 2)
    const temp =
      annualMean + seasonalAmp * seasonPhase + day.anomaly + diurnal + (hourRand() - 0.5) * 0.6 - (day.regime === 'rain' ? 1.5 : 0)
    const wet = (day.regime === 'rain' || day.regime === 'storm') && hod >= day.wetFrom && hod <= day.wetTo
    const code = regimeCode(day.regime, hod / 24, temp, hourRand(), wet)
    const isDay = time >= day.sunrise && time < day.sunset ? 1 : 0
    const precip = wet ? (day.regime === 'storm' ? 2 + hourRand() * 6 : 0.3 + hourRand() * 2.5) : 0
    const pop = wet ? 60 + Math.round(hourRand() * 35) : Math.round(cloud * 25 * hourRand())
    const rh = Math.min(99, 48 + cloud * 26 + (wet ? 18 : 0) - diurnal * 1.8 + (hourRand() - 0.5) * 6)
    const sunFrac = isDay ? Math.sin((Math.PI * (time - day.sunrise)) / (day.sunset - day.sunrise)) : 0
    const uvPeak = Math.max(0.5, 12.5 - absLat * 0.14 + seasonPhase * 2.8 * (absLat / 45))
    const uv = Math.max(0, uvPeak * Math.pow(sunFrac, 1.4) * (1 - 0.72 * cloud))
    const pressure =
      1014 + 7 * Math.sin((TAU * (time / DAY)) / 5.3 + lon) + { clear: 5, partly: 2, cloudy: -2, rain: -8, storm: -14, fog: 3 }[day.regime]
    const visibility =
      code === 45 ? 0.3 + hourRand() * 0.6 : wet ? 4 + hourRand() * 6 : day.regime === 'clear' ? 24 + hourRand() * 16 : 12 + hourRand() * 12
    const windSpeed = Math.max(1, day.windBase * (0.7 + 0.5 * Math.sin((TAU * (hod - 9)) / 24)) + (hourRand() - 0.5) * 4)
    hourly.push({
      time,
      temp,
      code,
      isDay,
      pop,
      precip,
      pressure,
      uv,
      visibility,
      humidity: rh,
      dewPoint: magnusDewPoint(temp, rh),
      windSpeed,
      windDir: (day.windDir + h * 3) % 360,
      windGust: windSpeed * (1.35 + hourRand() * 0.5),
      cloudCover: cloud * 100,
    })
  }

  // --- current (interpolated so it drifts naturally between refreshes) -------
  const idx = Math.min(hourly.length - 2, Math.max(0, Math.floor((now - localMidnight) / HOUR)))
  const k = (now - hourly[idx].time) / HOUR
  const a = hourly[idx]
  const b = hourly[idx + 1]
  const mix = (key) => a[key] + (b[key] - a[key]) * k
  const today = days[0]
  const temp = mix('temp')
  const humidity = mix('humidity')
  const windSpeed = mix('windSpeed')
  const current = {
    time: now,
    temp,
    feelsLike: feelsLike(temp, humidity, windSpeed),
    code: a.code,
    isDay: now >= today.sunrise && now < today.sunset ? 1 : 0,
    humidity,
    dewPoint: magnusDewPoint(temp, humidity),
    pressure: mix('pressure'),
    windSpeed,
    windDir: a.windDir,
    windGust: mix('windGust'),
    visibility: mix('visibility'),
    uv: mix('uv'),
    precip: a.precip,
    cloudCover: a.cloudCover,
  }

  // --- daily ---------------------------------------------------------------
  const daily = days.map((d, i) => {
    const hours = hourly.slice(i * 24, i * 24 + 24)
    const temps = hours.map((x) => x.temp)
    const daytime = hours.filter((x) => x.isDay)
    const codeCounts = {}
    for (const x of daytime.length ? daytime : hours) codeCounts[x.code] = (codeCounts[x.code] ?? 0) + (x.code >= 51 ? 3 : 1)
    const code = Number(Object.entries(codeCounts).sort((p, q) => q[1] - p[1])[0][0])
    return {
      time: d.start,
      code,
      max: Math.max(...temps),
      min: Math.min(...temps),
      sunrise: d.sunrise,
      sunset: d.sunset,
      uvMax: Math.max(...hours.map((x) => x.uv)),
      pop: Math.max(...hours.map((x) => x.pop)),
      precipSum: hours.reduce((s, x) => s + x.precip, 0),
      windMax: Math.max(...hours.map((x) => x.windSpeed)),
    }
  })

  // --- 15-minute precipitation for the radar tile ----------------------------
  const minutely = []
  for (let m = 0; m < 96 * 2; m++) {
    const time = localMidnight + m * 900
    const hr = hourly[Math.floor(m / 4)]
    minutely.push({ time, precip: hr.precip > 0 ? (hr.precip / 4) * (0.6 + hourRand() * 0.8) : 0 })
  }

  const wetToday = today.regime === 'rain' || today.regime === 'storm'
  const aqiValue = Math.round(today.aqiBase * (wetToday ? 0.6 : 1) + (absLat < 35 ? 15 : 0))

  return {
    location: { ...location },
    source: 'mock',
    fetchedAt: now,
    utcOffset: offset,
    current,
    hourly,
    daily,
    minutely,
    aqi: {
      value: aqiValue,
      pm25: +(aqiValue * 0.23).toFixed(1),
      pm10: +(aqiValue * 0.41).toFixed(1),
      o3: +(35 + aqiValue * 0.6).toFixed(0),
      no2: +(6 + aqiValue * 0.18).toFixed(1),
    },
  }
}
