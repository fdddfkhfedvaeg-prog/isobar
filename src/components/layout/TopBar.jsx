import { motion, useScroll, useTransform } from 'framer-motion'
import { LocateFixed, RefreshCw, Search, WifiOff } from 'lucide-react'
import { describeCode } from '../../services/weather'
import { useUnits } from '../../hooks/useUnits'
import { fmtTemp } from '../../lib/units'
import { formatRelative } from '../../lib/format'
import { SNAPPY } from '../../lib/motion'
import { cn } from '../../lib/cn'

const glassPill =
  'border border-white/15 bg-white/[0.1] backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_30px_-12px_rgba(0,0,0,0.5)]'

export default function TopBar({ data, status, geoState, onSearch, onLocate, onRefresh }) {
  const { system, setSystem } = useUnits()
  const { scrollY } = useScroll()
  const compactOpacity = useTransform(scrollY, [170, 250], [0, 1], { clamp: true })
  const compactY = useTransform(scrollY, [170, 250], [8, 0], { clamp: true })
  const refreshing = status === 'refreshing' || status === 'loading'

  return (
    <div className="pointer-events-none sticky top-0 z-30 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
      <nav className="pointer-events-auto mx-auto flex max-w-6xl items-center gap-2" aria-label="Primary">
        <div className={cn('flex h-10 items-center gap-2 rounded-full px-2 min-[480px]:pr-3.5', glassPill)}>
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-sky-300 to-indigo-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-200 shadow-[0_0_8px_rgba(253,230,138,0.9)]" />
          </span>
          <span className="hidden text-[14px] font-semibold tracking-tight min-[480px]:inline">
            Atmosphere<span className="ml-0.5 font-light text-white/60">OS</span>
          </span>
        </div>

        {/* Collapsed hero, revealed once the big temperature scrolls away. */}
        <motion.div
          style={{ opacity: compactOpacity, y: compactY }}
          className={cn('hidden h-10 min-w-0 items-center gap-2 rounded-full px-4 text-[14px] sm:flex', glassPill)}
          aria-hidden="true"
        >
          {data && (
            <>
              <span className="truncate font-semibold">{data.location.name}</span>
              <span className="text-white/40">·</span>
              <span className="tabular-nums">{fmtTemp(data.current.temp, system)}</span>
              <span className="truncate text-white/70">{describeCode(data.current.code, data.current.isDay).label}</span>
            </>
          )}
        </motion.div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {data && data.source !== 'live' && (
            <span
              className={cn('hidden h-10 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-amber-100 md:flex', glassPill)}
              title={data.source === 'cache' ? 'Showing recently cached forecast' : 'Showing simulated forecast'}
            >
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              {data.source === 'cache' ? 'Cached' : 'Simulated'}
            </span>
          )}
          <IconButton label={data ? `Refresh (updated ${formatRelative(data.fetchedAt)})` : 'Refresh'} onClick={onRefresh}>
            <motion.span animate={refreshing ? { rotate: 360 } : { rotate: 0 }} transition={refreshing ? { repeat: Infinity, duration: 0.9, ease: 'linear' } : SNAPPY}>
              <RefreshCw className="h-4 w-4" />
            </motion.span>
          </IconButton>
          <IconButton label="Use my location" onClick={onLocate} pulsing={geoState === 'locating'}>
            <LocateFixed className="h-4 w-4" />
          </IconButton>
          <div className={cn('relative flex h-10 items-center rounded-full p-1', glassPill)} role="group" aria-label="Units">
            {[
              ['metric', '°C'],
              ['imperial', '°F'],
            ].map(([sys, label]) => (
              <button
                key={sys}
                type="button"
                onClick={() => setSystem(sys)}
                aria-pressed={system === sys}
                className="relative z-10 h-8 w-9 rounded-full text-[13px] font-semibold"
              >
                {system === sys && (
                  <motion.span layoutId="unit-pill" transition={SNAPPY} className="absolute inset-0 -z-10 rounded-full bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]" />
                )}
                {label}
              </button>
            ))}
          </div>
          <motion.button
            type="button"
            onClick={onSearch}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={SNAPPY}
            className={cn('flex h-10 items-center gap-2 rounded-full px-3 text-[13px] text-white/80 sm:px-4', glassPill)}
            aria-label="Search for a city"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 font-sans text-[10px] text-white/60 lg:inline">⌘K</kbd>
          </motion.button>
        </div>
      </nav>
    </div>
  )
}

function IconButton({ label, onClick, children, pulsing }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      transition={SNAPPY}
      className={cn('relative grid h-10 w-10 place-items-center rounded-full', glassPill)}
    >
      {pulsing && <motion.span className="absolute inset-0 rounded-full ring-2 ring-sky-300/70" animate={{ scale: [1, 1.35], opacity: [0.8, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} />}
      {children}
    </motion.button>
  )
}
