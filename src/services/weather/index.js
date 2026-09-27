// Resilient weather orchestrator:
//   1. live Open-Meteo (with timeout)
//   2. recent cached live payload (< 3 h) if the network fails
//   3. the local mock engine, which always succeeds instantly
import { fetchLiveWeather, WeatherHttpError } from './openMeteo'
import { generateMockWeather } from './mockEngine'

export { describeCode, PRECIP_GROUPS } from './codes'
export { searchCities, reverseGeocode } from './geocoding'
export { CITIES, DEFAULT_LOCATION } from './cities'

const TIMEOUT_MS = 8000
const CACHE_TTL = 3 * 3600
const cacheKey = (loc) => `atmos:wx:${loc.lat.toFixed(2)},${loc.lon.toFixed(2)}`

function readCache(loc) {
  try {
    const hit = JSON.parse(localStorage.getItem(cacheKey(loc)) ?? 'null')
    if (hit && Date.now() / 1000 - hit.fetchedAt < CACHE_TTL) return hit
  } catch {
    /* storage unavailable */
  }
  return null
}

function writeCache(loc, data) {
  try {
    localStorage.setItem(cacheKey(loc), JSON.stringify(data))
  } catch {
    /* quota / private mode */
  }
}

function reasonFor(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline'
  if (err instanceof WeatherHttpError && err.status === 429) return 'rate-limited'
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return 'timeout'
  return 'unavailable'
}

export async function getWeather(location, { signal, forceMock = false } = {}) {
  if (forceMock || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return { ...generateMockWeather(location), reason: forceMock ? 'simulated' : 'offline' }
  }
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const combined = signal && AbortSignal.any ? AbortSignal.any([signal, timeout]) : signal ?? timeout
  try {
    const data = await fetchLiveWeather(location, combined)
    writeCache(location, data)
    return data
  } catch (err) {
    if (signal?.aborted) throw err
    const reason = reasonFor(err)
    const cached = readCache(location)
    if (cached) return { ...cached, location: { ...cached.location, ...location }, source: 'cache', reason }
    return { ...generateMockWeather(location), reason }
  }
}
