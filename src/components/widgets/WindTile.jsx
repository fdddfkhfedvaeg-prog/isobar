import { useEffect } from 'react'
import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { Wind } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import { useUnits } from '../../hooks/useUnits'
import { convert } from '../../lib/units'
import { beaufort, compassPoint } from '../../lib/insights'
import { polar } from './gauge'

const TICKS = Array.from({ length: 72 }, (_, i) => i * 5)

export default function WindTile({ data, className, pulseKey }) {
  const { system, labels } = useUnits()
  const reduce = useReducedMotion()
  const { windSpeed, windGust, windDir } = data.current
  const speed = Math.round(convert.wind(windSpeed, system))
  const gust = Math.round(convert.wind(windGust, system))

  // Arrow points downwind. A spring carries direction changes; a small
  // gust-scaled wobble keeps the vector feeling live.
  const base = useSpring(windDir + 180, { stiffness: 60, damping: 14 })
  const wobble = useMotionValue(0)
  useEffect(() => base.set(windDir + 180), [windDir, base])
  const gustiness = Math.min(1, Math.max(0.2, (windGust - windSpeed) / 20))
  useAnimationFrame((t) => {
    if (reduce) return
    const s = t / 1000
    wobble.set((Math.sin(s * 0.9) * 2.6 + Math.sin(s * 2.7 + 1) * 1.2) * gustiness)
  })
  const rotate = useTransform([base, wobble], ([b, w]) => b + w)

  return (
    <GlassCard className={className} pulseKey={pulseKey} title="Wind" icon={Wind} bodyClassName="flex flex-col">
      <div className="relative mx-auto aspect-square w-full max-w-[132px]">
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {TICKS.map((deg) => {
            const major = deg % 90 === 0
            const mid = deg % 30 === 0
            const [x1, y1] = polar(60, 60, 57, deg)
            const [x2, y2] = polar(60, 60, major ? 49 : mid ? 51 : 54, deg)
            return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.35)'} strokeWidth={major ? 1.6 : 1} />
          })}
          {[
            ['N', 0],
            ['E', 90],
            ['S', 180],
            ['W', 270],
          ].map(([l, d]) => {
            const [x, y] = polar(60, 60, 41, d)
            return (
              <text key={l} x={x} y={y} textAnchor="middle" dominantBaseline="central" className="fill-white/70 text-[9px] font-semibold">
                {l}
              </text>
            )
          })}
        </svg>
        <motion.svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" style={{ rotate }} aria-hidden="true">
          <line x1="60" y1="104" x2="60" y2="22" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M60 10 L67 24 L53 24 Z" fill="white" />
          <circle cx="60" cy="106" r="4" fill="none" stroke="white" strokeWidth="2.2" />
        </motion.svg>
        <div className="absolute inset-[30%] flex flex-col items-center justify-center rounded-full bg-[rgba(20,28,44,0.72)] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.12)] backdrop-blur-md">
          <span className="text-[20px] font-semibold leading-none tabular-nums">{speed}</span>
          <span className="text-[9px] font-semibold text-white/70">{labels.wind}</span>
        </div>
      </div>
      <dl className="mt-auto grid grid-cols-2 gap-x-2 pt-2 text-[12px]">
        <dt className="text-white/60">Gusts</dt>
        <dd className="text-right font-medium tabular-nums">
          {gust} {labels.wind}
        </dd>
        <dt className="text-white/60">From</dt>
        <dd className="text-right font-medium">
          <span title={`${Math.round(windDir)}°`}>{compassPoint(windDir)}</span>
        </dd>
      </dl>
      <p className="sr-only">{beaufort(windSpeed)}</p>
    </GlassCard>
  )
}
