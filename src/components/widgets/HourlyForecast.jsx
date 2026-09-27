import { useEffect, useMemo, useRef } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import WeatherIcon from '../ui/WeatherIcon'
import { useUnits } from '../../hooks/useUnits'
import { convert } from '../../lib/units'
import { formatHour, clamp } from '../../lib/format'
import { tempColor } from '../../lib/color'
import { hourlySummary, upcomingHours } from '../../lib/insights'
import { SOFT_SPRING } from '../../lib/motion'

const ITEM_W = 60
const CURVE_H = 44

/** Catmull-Rom → cubic Bézier: a smooth curve through every point. */
function smoothPath(pts) {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[Math.max(0, i - 1)]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const [x3, y3] = pts[Math.min(pts.length - 1, i + 2)]
    d += ` C${x1 + (x2 - x0) / 6},${y1 + (y2 - y0) / 6} ${x2 - (x3 - x1) / 6},${y2 - (y3 - y1) / 6} ${x2},${y2}`
  }
  return d
}

export default function HourlyForecast({ data, now, className, pulseKey }) {
  const { system } = useUnits()
  const viewport = useRef(null)
  const track = useRef(null)
  const x = useMotionValue(0)

  const hours = useMemo(() => {
    const list = upcomingHours(data, now, 25)
    if (list.length) list[0] = { ...list[0], temp: data.current.temp, code: data.current.code, isDay: data.current.isDay, now: true }
    return list
  }, [data, now])

  const temps = hours.map((h) => h.temp)
  const min = Math.min(...temps)
  const max = Math.max(...temps)
  const width = hours.length * ITEM_W
  const pts = hours.map((h, i) => [i * ITEM_W + ITEM_W / 2, 8 + (1 - (h.temp - min) / (max - min || 1)) * (CURVE_H - 16)])
  const path = smoothPath(pts)
  const gradId = `hourly-grad-${pulseKey ?? 0}`

  const bounds = () => Math.min(0, (viewport.current?.clientWidth ?? 0) - (track.current?.scrollWidth ?? 0))

  // Trackpads / horizontal wheels scroll the track natively-feeling.
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const onWheel = (e) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0
      if (!dx) return
      e.preventDefault()
      x.stop()
      x.set(clamp(x.get() - dx, bounds(), 0))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [x])

  const page = (dir) => {
    const w = viewport.current?.clientWidth ?? 300
    animate(x, clamp(x.get() - dir * w * 0.8, bounds(), 0), SOFT_SPRING)
  }

  return (
    <GlassCard className={className} pulseKey={pulseKey} tilt={false} title="Hourly Forecast" icon={Clock}>
      <p className="-mt-1 mb-3 border-b border-white/10 pb-3 text-[14px] leading-snug text-white/90">{hourlySummary(data, now, system)}</p>
      <div className="relative">
        <div
          ref={viewport}
          className="-mx-4 overflow-hidden px-4 [mask-image:linear-gradient(90deg,transparent,#000_16px,#000_calc(100%-16px),transparent)]"
          role="region"
          aria-label="Next 24 hours"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') page(0.4)
            if (e.key === 'ArrowLeft') page(-0.4)
          }}
        >
          <motion.div
            ref={track}
            drag="x"
            dragConstraints={viewport}
            dragElastic={0.12}
            dragTransition={{ power: 0.35, timeConstant: 260, bounceStiffness: 320, bounceDamping: 32 }}
            style={{ x, width }}
            className="cursor-grab select-none active:cursor-grabbing"
          >
            <ol className="flex">
              {hours.map((h) => (
                <li key={h.time} className="flex flex-col items-center gap-1.5" style={{ width: ITEM_W }}>
                  <span className="text-[13px] font-semibold text-white/90">{h.now ? 'Now' : formatHour(h.time, data.utcOffset)}</span>
                  <WeatherIcon code={h.code} isDay={h.isDay} className="h-6 w-6" />
                  <span className="h-3.5 text-[11px] font-semibold text-sky-300">{h.pop >= 20 ? `${Math.round(h.pop / 10) * 10}%` : ''}</span>
                </li>
              ))}
            </ol>
            <svg width={width} height={CURVE_H} className="block overflow-visible" aria-hidden="true">
              <defs>
                <linearGradient id={gradId} x1="0" x2={width} y1="0" y2="0" gradientUnits="userSpaceOnUse">
                  {pts.map(([px], i) => (
                    <stop key={i} offset={px / width} stopColor={tempColor(hours[i].temp)} />
                  ))}
                </linearGradient>
                <linearGradient id={`${gradId}-fill`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="white" stopOpacity="0.14" />
                  <stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${path} L${pts.at(-1)[0]},${CURVE_H} L${pts[0][0]},${CURVE_H} Z`} fill={`url(#${gradId}-fill)`} />
              <motion.path
                d={path}
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              />
              {pts.map(([px, py], i) => (
                <circle key={i} cx={px} cy={py} r={i === 0 ? 4 : 2.2} fill={i === 0 ? 'white' : tempColor(hours[i].temp)} stroke={i === 0 ? 'rgba(0,0,0,.25)' : 'none'} strokeWidth="2" />
              ))}
            </svg>
            <ol className="flex" aria-hidden="true">
              {hours.map((h) => (
                <li key={h.time} className="text-center text-[17px] font-medium tabular-nums" style={{ width: ITEM_W }}>
                  {Math.round(convert.temp(h.temp, system))}°
                </li>
              ))}
            </ol>
          </motion.div>
        </div>
        {[-1, 1].map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => page(dir)}
            aria-label={dir < 0 ? 'Earlier hours' : 'Later hours'}
            className={`absolute top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/15 opacity-0 backdrop-blur-xl transition hover:bg-white/25 group-hover/card:opacity-100 focus-visible:opacity-100 md:flex ${dir < 0 ? '-left-2' : '-right-2'}`}
          >
            {dir < 0 ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ))}
      </div>
    </GlassCard>
  )
}
