import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Umbrella } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import { Caption } from '../ui/Stat'
import { useUnits } from '../../hooks/useUnits'
import { fmtPrecip } from '../../lib/units'
import { nextTwoHours, precipNarrative } from '../../lib/insights'
import { SPRING } from '../../lib/motion'

const LABELS = ['Now', '30m', '1h', '1.5h', '2h']

/** Deterministic pseudo-random for stable radar echoes. */
const rand = (n) => {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

export default function PrecipitationTile({ data, now, className, pulseKey }) {
  const { system } = useUnits()
  const reduce = useReducedMotion()
  const slots = nextTwoHours(data, now)
  const peak = Math.max(0.25, ...slots.map((s) => s.precip))
  const total = slots.reduce((s, x) => s + x.precip, 0)
  const today = data.daily[0]

  // Radar echoes: more, larger and closer blobs as expected precipitation rises.
  const echoes = useMemo(() => {
    const intensity = Math.min(1, total / 3)
    const count = total > 0.01 ? 3 + Math.round(intensity * 7) : 2
    return Array.from({ length: count }, (_, i) => {
      const seed = i + Math.round(data.location.lat * 10)
      const r = 12 + rand(seed) * (total > 0.01 ? 34 : 40)
      const a = rand(seed + 5) * Math.PI * 2
      return {
        x: 50 + Math.cos(a) * r,
        y: 50 + Math.sin(a) * r,
        size: total > 0.01 ? 10 + rand(seed + 9) * 22 * (0.5 + intensity) : 6 + rand(seed + 9) * 6,
        heavy: rand(seed + 13) < intensity * 0.5,
        faint: total <= 0.01,
      }
    })
  }, [total, data.location.lat])

  return (
    <GlassCard className={className} pulseKey={pulseKey} title="Precipitation" icon={Umbrella}>
      <div className="flex gap-4">
        <div className="relative aspect-square w-[104px] shrink-0 overflow-hidden rounded-full bg-[radial-gradient(circle,rgba(40,64,90,0.55),rgba(10,18,30,0.7))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] sm:w-[118px]" aria-hidden="true">
          {echoes.map((e, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-[5px]"
              style={{
                left: `${e.x}%`,
                top: `${e.y}%`,
                width: e.size,
                height: e.size * 0.8,
                background: e.faint ? 'rgba(120,170,220,0.18)' : e.heavy ? 'rgba(255,214,10,0.7)' : 'rgba(52,199,89,0.65)',
              }}
            />
          ))}
          {[33, 66].map((s) => (
            <span key={s} className="absolute rounded-full border border-white/10" style={{ inset: `${(100 - s) / 2}%` }} />
          ))}
          <span className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
          <span className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
          <motion.span
            className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(125,211,252,0)_0deg,rgba(125,211,252,0)_300deg,rgba(125,211,252,0.45)_360deg)]"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 4, ease: 'linear', repeat: Infinity }}
          />
          <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_3px_rgba(10,132,255,0.6)]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[15px] font-medium leading-snug">{precipNarrative(slots, data)}</p>
          <div className="mt-auto flex h-14 items-end gap-[3px] pt-2" role="img" aria-label="Precipitation intensity for the next two hours">
            {slots.map((s, i) => (
              <motion.span
                key={s.time}
                className="flex-1 origin-bottom rounded-t-[3px] bg-gradient-to-t from-sky-500/80 to-sky-300"
                style={{ height: `${Math.max(4, (s.precip / peak) * 100)}%`, opacity: s.precip > 0.01 ? 1 : 0.28 }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ ...SPRING, delay: 0.1 + i * 0.04 }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-medium text-white/55">
            {LABELS.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>
      </div>
      <Caption className="mt-3 border-t border-white/10 pt-2.5">
        {fmtPrecip(today.precipSum, system)} expected today · {Math.round(today.pop)}% chance
      </Caption>
    </GlassCard>
  )
}
