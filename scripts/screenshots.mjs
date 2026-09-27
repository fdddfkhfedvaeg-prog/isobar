// Visual verification harness.
//
// Boots the Vite dev server, then drives Chromium through desktop, tablet and
// phone viewports. Open-Meteo is intercepted with payloads in the real API
// format (synthesised by the mock engine), so the live normaliser is exercised
// end-to-end without depending on the network.
//
//   npm run shots            → ./screenshots/*.png
import { createServer } from 'vite'
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const OUT = new URL('../screenshots/', import.meta.url).pathname
await mkdir(OUT, { recursive: true })

const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: 'error' })
await server.listen()
const BASE = 'http://localhost:5199/'
const { generateMockWeather } = await server.ssrLoadModule('/src/services/weather/mockEngine.js')
const { CITIES } = await server.ssrLoadModule('/src/services/weather/cities.js')

function nearestCity(lat, lon) {
  return CITIES.reduce((b, c) => (Math.hypot(c.lat - lat, c.lon - lon) < Math.hypot(b.lat - lat, b.lon - lon) ? c : b))
}

function openMeteoPayload(lat, lon) {
  const m = generateMockWeather({ ...nearestCity(lat, lon), lat, lon })
  const H = m.hourly
  const D = m.daily
  return {
    latitude: lat,
    longitude: lon,
    timezone: m.location.timezone,
    utc_offset_seconds: m.utcOffset,
    current: {
      time: Math.floor(m.current.time / 900) * 900,
      temperature_2m: +m.current.temp.toFixed(1),
      relative_humidity_2m: Math.round(m.current.humidity),
      apparent_temperature: +m.current.feelsLike.toFixed(1),
      is_day: m.current.isDay,
      precipitation: m.current.precip,
      weather_code: m.current.code,
      cloud_cover: Math.round(m.current.cloudCover),
      pressure_msl: +m.current.pressure.toFixed(1),
      wind_speed_10m: +m.current.windSpeed.toFixed(1),
      wind_direction_10m: Math.round(m.current.windDir),
      wind_gusts_10m: +m.current.windGust.toFixed(1),
    },
    hourly: {
      time: H.map((h) => h.time),
      temperature_2m: H.map((h) => +h.temp.toFixed(1)),
      weather_code: H.map((h) => h.code),
      precipitation_probability: H.map((h) => h.pop),
      precipitation: H.map((h) => +h.precip.toFixed(2)),
      is_day: H.map((h) => h.isDay),
      pressure_msl: H.map((h) => +h.pressure.toFixed(1)),
      visibility: H.map((h) => Math.round(h.visibility * 1000)),
      uv_index: H.map((h) => +h.uv.toFixed(2)),
      dew_point_2m: H.map((h) => +h.dewPoint.toFixed(1)),
    },
    daily: {
      time: D.map((d) => d.time),
      weather_code: D.map((d) => d.code),
      temperature_2m_max: D.map((d) => +d.max.toFixed(1)),
      temperature_2m_min: D.map((d) => +d.min.toFixed(1)),
      sunrise: D.map((d) => d.sunrise),
      sunset: D.map((d) => d.sunset),
      uv_index_max: D.map((d) => +d.uvMax.toFixed(2)),
      precipitation_probability_max: D.map((d) => d.pop),
      precipitation_sum: D.map((d) => +d.precipSum.toFixed(1)),
      wind_speed_10m_max: D.map((d) => +d.windMax.toFixed(1)),
    },
    minutely_15: { time: m.minutely.map((x) => x.time), precipitation: m.minutely.map((x) => +x.precip.toFixed(2)) },
    _aqi: m.aqi,
  }
}

const browser = await chromium.launch({
  // Use a preinstalled Chromium when the bundled one isn't downloaded (CI/sandboxes).
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] })
const errors = []

async function open({ name, viewport, mobile = false, url = '', location, geo, setup }) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 3 : 2,
    isMobile: mobile,
    hasTouch: mobile,
    permissions: geo ? ['geolocation'] : [],
    geolocation: geo,
    locale: 'en-US',
  })
  await ctx.addInitScript((loc) => {
    if (loc) localStorage.setItem('atmos:location', JSON.stringify(loc))
  }, location ?? null)
  await ctx.route(/^https?:\/\/(?!localhost)/, async (route) => {
    const u = new URL(route.request().url())
    const lat = Number(u.searchParams.get('latitude'))
    const lon = Number(u.searchParams.get('longitude'))
    if (u.hostname === 'api.open-meteo.com') {
      const { _aqi, ...body } = openMeteoPayload(lat, lon)
      return route.fulfill({ json: body })
    }
    if (u.hostname === 'air-quality-api.open-meteo.com') {
      const a = openMeteoPayload(lat, lon)._aqi
      return route.fulfill({ json: { current: { us_aqi: a.value, pm2_5: a.pm25, pm10: a.pm10, ozone: a.o3, nitrogen_dioxide: a.no2 } } })
    }
    if (u.hostname === 'geocoding-api.open-meteo.com') {
      const q = (u.searchParams.get('name') ?? '').toLowerCase()
      const results = CITIES.filter((c) => c.name.toLowerCase().includes(q)).map((c, i) => ({
        id: i + 1,
        name: c.name,
        admin1: c.region,
        country: c.country,
        latitude: c.lat,
        longitude: c.lon,
        timezone: c.timezone,
      }))
      return route.fulfill({ json: { results } })
    }
    return route.abort() // fonts, reverse geocoding → exercise offline fallbacks
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text()) && errors.push(`${name}: ${m.text()}`))
  await page.goto(BASE + url)
  await page.waitForSelector('main h1', { timeout: 20000 })
  await page.waitForTimeout(1800) // let springs settle
  if (setup) await setup(page)
  return { page, ctx }
}

const shot = (page, file, opts = {}) => page.screenshot({ path: OUT + file, ...opts })

const tokyo = CITIES.find((c) => c.name === 'Tokyo')
const london = CITIES.find((c) => c.name === 'London')

// Desktop — geolocated (San Francisco), live-format data.
{
  const { page, ctx } = await open({ name: 'desktop', viewport: { width: 1440, height: 900 }, geo: { latitude: 37.7749, longitude: -122.4194 } })
  await shot(page, 'desktop-top.png')
  await shot(page, 'desktop-full.png', { fullPage: true })
  // Hover tilt on a tile.
  const tile = page.locator('section', { hasText: 'UV Index' }).first()
  const box = await tile.boundingBox()
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.2, { steps: 8 })
  await page.waitForTimeout(500)
  await shot(page, 'desktop-tilt.png', { clip: { x: box.x - 30, y: box.y - 30, width: box.width + 60, height: box.height + 60 } })
  // Expand a day row.
  await page.locator('button[aria-expanded]').nth(1).click()
  await page.waitForTimeout(700)
  const daily = await page.locator('section', { hasText: '10-Day Forecast' }).first().boundingBox()
  await shot(page, 'desktop-daily-expanded.png', { clip: daily })
  // Scroll → hero collapse + compact header.
  await page.mouse.wheel(0, 420)
  await page.waitForTimeout(700)
  await shot(page, 'desktop-scrolled.png')
  // Search overlay → switch city (cross-dissolve).
  await page.keyboard.press('Control+k')
  await page.keyboard.type('Lon')
  await page.waitForTimeout(700)
  await shot(page, 'desktop-search.png')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(250)
  await shot(page, 'desktop-switching.png')
  await page.waitForFunction(() => document.querySelector('main h1')?.textContent === 'London')
  await page.waitForTimeout(1500)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(600)
  await shot(page, 'desktop-london.png')
  await ctx.close()
}

// Tablet.
{
  const { page, ctx } = await open({ name: 'tablet', viewport: { width: 834, height: 1194 }, location: tokyo })
  await shot(page, 'tablet-full.png', { fullPage: true })
  await ctx.close()
}

// Phone.
{
  const { page, ctx } = await open({ name: 'mobile', viewport: { width: 390, height: 844 }, mobile: true, location: london })
  await shot(page, 'mobile-top.png')
  await shot(page, 'mobile-full.png', { fullPage: true })
  await page.evaluate(() => window.scrollTo(0, 300))
  await page.waitForTimeout(600)
  await shot(page, 'mobile-scrolled.png')
  await ctx.close()
}

// Offline fallback (forced mock) + sky scenes.
for (const sky of ['rain-night', 'snow', 'storm', 'fog', 'clear-night']) {
  const { page, ctx } = await open({ name: sky, viewport: { width: 1280, height: 800 }, url: `?mock&sky=${sky}`, location: tokyo })
  await page.waitForTimeout(2500)
  await shot(page, `sky-${sky}.png`)
  await ctx.close()
}

// Real offline: every request fails → mock engine with notice.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  await ctx.addInitScript((loc) => localStorage.setItem('atmos:location', JSON.stringify(loc)), london)
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.fulfill({ status: 429, body: 'Too Many Requests' }))
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`ratelimited: ${e.message}`))
  await page.goto(BASE)
  await page.waitForSelector('main h1', { timeout: 20000 })
  await page.waitForTimeout(1500)
  await shot(page, 'mobile-ratelimited.png')
  await ctx.close()
}

await browser.close()
await server.close()
if (errors.length) {
  console.error('Page errors:\n' + errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Screenshots written to ${OUT}`)
}
