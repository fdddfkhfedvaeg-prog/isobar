// Open-Meteo adapter: fetches forecast + air quality and normalises them into
// the app's weather model (see mockEngine.js for the same shape).

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'

export class WeatherHttpError extends Error {
  constructor(status) {
    super(status === 429 ? 'Rate limited by Open-Meteo' : `Open-Meteo responded ${status}`)
    this.status = status
  }
}

async function getJSON(url, signal) {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new WeatherHttpError(res.status)
  return res.json()
}

function forecastUrl(lat, lon) {
  const p = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'weather_code',
      'precipitation_probability',
      'precipitation',
      'is_day',
      'pressure_msl',
      'visibility',
      'uv_index',
      'dew_point_2m',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'uv_index_max',
      'precipitation_probability_max',
      'precipitation_sum',
      'wind_speed_10m_max',
    ].join(','),
    minutely_15: 'precipitation',
    forecast_days: '10',
    timezone: 'auto',
    timeformat: 'unixtime',
  })
  return `${FORECAST_URL}?${p}`
}

const num = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

export function normaliseForecast(raw, location) {
  const H = raw.hourly
  const hourly = H.time.map((time, i) => ({
    time,
    temp: num(H.temperature_2m[i]),
    code: num(H.weather_code[i]),
    isDay: num(H.is_day[i], 1),
    pop: num(H.precipitation_probability?.[i]),
    precip: num(H.precipitation?.[i]),
    pressure: num(H.pressure_msl?.[i], 1013),
    uv: num(H.uv_index?.[i]),
    visibility: num(H.visibility?.[i], 20000) / 1000,
    dewPoint: num(H.dew_point_2m?.[i]),
  }))

  const C = raw.current
  const now = C.time ?? Math.floor(Date.now() / 1000)
  const nearest = hourly.reduce((best, h) => (Math.abs(h.time - now) < Math.abs(best.time - now) ? h : best), hourly[0])

  const D = raw.daily
  const daily = D.time.map((time, i) => ({
    time,
    code: num(D.weather_code[i]),
    max: num(D.temperature_2m_max[i]),
    min: num(D.temperature_2m_min[i]),
    sunrise: num(D.sunrise[i]),
    sunset: num(D.sunset[i]),
    uvMax: num(D.uv_index_max?.[i]),
    pop: num(D.precipitation_probability_max?.[i]),
    precipSum: num(D.precipitation_sum?.[i]),
    windMax: num(D.wind_speed_10m_max?.[i]),
  }))

  const M = raw.minutely_15
  const minutely = M?.time ? M.time.map((time, i) => ({ time, precip: num(M.precipitation?.[i]) })) : []

  return {
    location: { ...location, timezone: raw.timezone ?? location.timezone },
    source: 'live',
    fetchedAt: Math.floor(Date.now() / 1000),
    utcOffset: num(raw.utc_offset_seconds),
    current: {
      time: now,
      temp: num(C.temperature_2m),
      feelsLike: num(C.apparent_temperature, C.temperature_2m),
      code: num(C.weather_code),
      isDay: num(C.is_day, 1),
      humidity: num(C.relative_humidity_2m),
      dewPoint: nearest.dewPoint,
      pressure: num(C.pressure_msl, 1013),
      windSpeed: num(C.wind_speed_10m),
      windDir: num(C.wind_direction_10m),
      windGust: num(C.wind_gusts_10m, C.wind_speed_10m),
      visibility: nearest.visibility,
      uv: nearest.uv,
      precip: num(C.precipitation),
      cloudCover: num(C.cloud_cover),
    },
    hourly,
    daily,
    minutely,
    aqi: null,
  }
}

async function fetchAirQuality(lat, lon, signal) {
  const p = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: 'us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide',
    timezone: 'auto',
  })
  const raw = await getJSON(`${AIR_URL}?${p}`, signal)
  const c = raw.current ?? {}
  if (typeof c.us_aqi !== 'number') return null
  return { value: c.us_aqi, pm25: c.pm2_5, pm10: c.pm10, o3: c.ozone, no2: c.nitrogen_dioxide }
}

export async function fetchLiveWeather(location, signal) {
  const [forecast, aqi] = await Promise.all([
    getJSON(forecastUrl(location.lat, location.lon), signal),
    // Air quality is a nice-to-have: never let it sink the forecast.
    fetchAirQuality(location.lat, location.lon, signal).catch(() => null),
  ])
  const data = normaliseForecast(forecast, location)
  data.aqi = aqi
  return data
}
