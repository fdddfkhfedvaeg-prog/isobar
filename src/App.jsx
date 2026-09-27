import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import AtmosphereCanvas from './components/canvas/AtmosphereCanvas'
import TopBar from './components/layout/TopBar'
import SearchOverlay from './components/layout/SearchOverlay'
import StatusNotice from './components/layout/StatusNotice'
import Skeleton from './components/layout/Skeleton'
import Hero from './components/widgets/Hero'
import HourlyForecast from './components/widgets/HourlyForecast'
import DailyOutlook from './components/widgets/DailyOutlook'
import AirQualityTile from './components/widgets/AirQualityTile'
import UVIndexTile from './components/widgets/UVIndexTile'
import SunArcTile from './components/widgets/SunArcTile'
import WindTile from './components/widgets/WindTile'
import HumidityTile from './components/widgets/HumidityTile'
import PrecipitationTile from './components/widgets/PrecipitationTile'
import VisibilityTile from './components/widgets/VisibilityTile'
import PressureTile from './components/widgets/PressureTile'
import { useWeather } from './hooks/useWeather'
import { useGeolocation } from './hooks/useGeolocation'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useNow } from './hooks/useNow'
import { DEFAULT_LOCATION, describeCode } from './services/weather'
import { pageVariants } from './lib/motion'

const params = new URLSearchParams(window.location.search)
const FORCE_MOCK = params.has('mock')
// Design-review override for the sky, e.g. ?sky=rain-night or ?sky=snow.
const SKY = params.get('sky')?.match(/^(clear|partly|cloudy|fog|drizzle|rain|snow|storm)(-night)?$/)

export default function App() {
  const [location, setLocation] = useLocalStorage('atmos:location', null)
  const [recents, setRecents] = useLocalStorage('atmos:recents', [])
  const [searchOpen, setSearchOpen] = useState(false)
  const { locate, state: geoState } = useGeolocation()
  const { data, status, refresh } = useWeather(location, { forceMock: FORCE_MOCK })
  const now = useNow(30000)

  // First visit: try the browser's location, fall back to Cupertino.
  useEffect(() => {
    if (location) return
    let alive = true
    locate().then((loc) => alive && setLocation(loc ?? DEFAULT_LOCATION))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectLocation = useCallback(
    (loc) => {
      setSearchOpen(false)
      setLocation(loc)
      if (!loc.isCurrent) {
        setRecents((prev) => [loc, ...prev.filter((r) => !(Math.abs(r.lat - loc.lat) < 0.01 && Math.abs(r.lon - loc.lon) < 0.01))].slice(0, 5))
      }
    },
    [setLocation, setRecents],
  )

  const useMyLocation = useCallback(async () => {
    setSearchOpen(false)
    const loc = await locate()
    if (loc) setLocation(loc)
  }, [locate, setLocation])

  // ⌘K / Ctrl+K / "/" open search.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/input|textarea/i.test(document.activeElement?.tagName))) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const scene = useMemo(() => {
    if (SKY) return { group: SKY[1], isDay: !SKY[2] }
    if (!data) return { group: 'clear', isDay: true }
    return { group: describeCode(data.current.code).group, isDay: Boolean(data.current.isDay) }
  }, [data])

  useEffect(() => {
    if (data) document.title = `${data.location.name} · ${Math.round(data.current.temp)}° — Atmosphere OS`
  }, [data])

  const cityKey = data ? `${data.location.lat.toFixed(3)},${data.location.lon.toFixed(3)}` : 'none'
  const pulseKey = data?.fetchedAt
  const tile = { data, now, pulseKey }

  return (
    <MotionConfig reducedMotion="user">
      <AtmosphereCanvas group={scene.group} isDay={scene.isDay} ready={Boolean(data) || Boolean(SKY)} />
      <TopBar data={data} status={status} geoState={geoState} onSearch={() => setSearchOpen(true)} onLocate={useMyLocation} onRefresh={refresh} />

      {!data ? (
        <Skeleton label={location ? 'Loading forecast…' : 'Finding your location…'} />
      ) : (
        <AnimatePresence mode="wait">
          <motion.main key={cityKey} variants={pageVariants} initial="hidden" animate="show" exit="exit" className="mx-auto max-w-6xl px-3 pb-20 sm:px-6">
            <Hero data={data} />
            <StatusNotice data={data} onRetry={refresh} />
            <div className="grid grid-flow-dense grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <HourlyForecast {...tile} className="col-span-2 lg:col-span-4" />
              <DailyOutlook {...tile} className="col-span-2 lg:row-span-3" />
              <AirQualityTile {...tile} className="col-span-2" />
              <UVIndexTile {...tile} className="min-h-[11.5rem]" />
              <SunArcTile {...tile} className="min-h-[11.5rem]" />
              <WindTile {...tile} className="min-h-[11.5rem]" />
              <HumidityTile {...tile} className="min-h-[11.5rem]" />
              <PrecipitationTile {...tile} className="col-span-2" />
              <VisibilityTile {...tile} className="min-h-[11.5rem]" />
              <PressureTile {...tile} className="min-h-[11.5rem]" />
            </div>
            <footer className="mt-10 text-center text-[12px] text-white/50">
              Weather data by{' '}
              <a href="https://open-meteo.com/" className="underline decoration-white/30 underline-offset-2 hover:text-white/80" target="_blank" rel="noreferrer">
                Open-Meteo
              </a>
              {data.source !== 'live' && ' · currently simulated locally'}
            </footer>
          </motion.main>
        </AnimatePresence>
      )}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} onSelect={selectLocation} onLocate={useMyLocation} recents={recents} />
    </MotionConfig>
  )
}
