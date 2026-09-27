import { CITIES } from './cities'

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function searchOffline(query) {
  const q = fold(query.trim())
  if (!q) return []
  return CITIES.filter((c) => fold(`${c.name} ${c.region} ${c.country}`).includes(q))
    .sort((a, b) => fold(a.name).indexOf(q) - fold(b.name).indexOf(q))
    .slice(0, 8)
    .map((c) => ({ ...c, id: `${c.lat},${c.lon}`, offline: true }))
}

export async function searchCities(query, signal) {
  const q = query.trim()
  if (q.length < 2) return searchOffline(q)
  try {
    const p = new URLSearchParams({ name: q, count: '8', language: 'en', format: 'json' })
    const res = await fetch(`${GEO_URL}?${p}`, { signal })
    if (!res.ok) throw new Error(String(res.status))
    const json = await res.json()
    return (json.results ?? []).map((r) => ({
      id: String(r.id),
      name: r.name,
      region: r.admin1 ?? '',
      country: r.country ?? '',
      lat: r.latitude,
      lon: r.longitude,
      timezone: r.timezone,
    }))
  } catch (err) {
    if (err.name === 'AbortError') throw err
    return searchOffline(q)
  }
}

export async function reverseGeocode(lat, lon) {
  try {
    const p = new URLSearchParams({ latitude: String(lat), longitude: String(lon), localityLanguage: 'en' })
    const res = await fetch(`${REVERSE_URL}?${p}`)
    if (!res.ok) throw new Error(String(res.status))
    const j = await res.json()
    return {
      name: j.city || j.locality || 'My Location',
      region: j.principalSubdivision ?? '',
      country: j.countryName ?? '',
    }
  } catch {
    // Offline: borrow the nearest known city's name.
    const nearest = CITIES.reduce((best, c) =>
      Math.hypot(c.lat - lat, c.lon - lon) < Math.hypot(best.lat - lat, best.lon - lon) ? c : best,
    )
    const close = Math.hypot(nearest.lat - lat, nearest.lon - lon) < 0.6
    return { name: close ? nearest.name : 'My Location', region: close ? nearest.region : '', country: close ? nearest.country : '' }
  }
}
