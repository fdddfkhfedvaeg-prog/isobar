import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Gauge, Minus } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import { Caption } from '../ui/Stat'
import { useUnits } from '../../hooks/useUnits'
import { fmtPressure } from '../../lib/units'
import { pressureTrend } from '../../lib/insights'
import { clamp } from '../../lib/format'
import { SOFT_SPRING } from '../../lib/motion'
import { polar } from './gauge'

const MIN = 960
const MAX = 1060
const START = -135
const END = 135
const TICKS = Array.from({ length: 41 }, (_, i) => START + (i * (END - START)) / 40)

export default function PressureTile({ data, now, className, pulseKey }) {
  const { system, labels } = useUnits()
  const p = data.current.pressure
  const trend = pressureTrend(data, now)
  const angle = START + clamp((p - MIN) / (MAX - MIN), 0, 1) * (END - START)
  const TrendIcon = trend.dir > 0 ? ArrowUp : trend.dir < 0 ? ArrowDown : Minus

  return (
    <GlassCard className={className} pulseKey={pulseKey} title="Pressure" icon={Gauge} bodyClassName="flex flex-col">
      <div className="relative mx-auto aspect-square w-full max-w-[128px]">
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {TICKS.map((deg, i) => {
            const past = deg <= angle
            const [x1, y1] = polar(60, 60, 56, deg)
            const [x2, y2] = polar(60, 60, i % 5 === 0 ? 46 : 49, deg)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={past ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.25)'} strokeWidth={1.6} strokeLinecap="round" />
          })}
          <text x="28" y="108" textAnchor="middle" className="fill-white/55 text-[9px] font-semibold">
            Low
          </text>
          <text x="92" y="108" textAnchor="middle" className="fill-white/55 text-[9px] font-semibold">
            High
          </text>
        </svg>
        <motion.svg
          viewBox="0 0 120 120"
          className="absolute inset-0 h-full w-full"
          initial={{ rotate: START }}
          animate={{ rotate: angle }}
          transition={{ ...SOFT_SPRING, delay: 0.2 }}
          aria-hidden="true"
        >
          <rect x="58" y="1" width="4" height="20" rx="2" fill="white" stroke="rgba(0,0,0,.35)" strokeWidth="1" />
        </motion.svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <TrendIcon className="h-4 w-4 text-white/85" strokeWidth={2.6} aria-hidden="true" />
          <span className="mt-0.5 text-[20px] font-semibold leading-none tabular-nums">{fmtPressure(p, system)}</span>
          <span className="text-[10px] font-semibold text-white/65">{labels.pressure}</span>
        </div>
      </div>
      <Caption className="mt-auto">{trend.label} over the last 3 hours.</Caption>
    </GlassCard>
  )
}
