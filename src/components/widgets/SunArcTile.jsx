import { motion } from 'framer-motion'
import { Sunrise, Sunset } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import { Caption } from '../ui/Stat'
import { formatDuration, formatTime } from '../../lib/format'
import { nextSunEvent } from '../../lib/insights'
import { SOFT_SPRING } from '../../lib/motion'

const W = 160
const H = 76
const MID = 44 // vertical centre of the wave
const AMP = 30

/**
 * Solar trajectory over the local day as a cosine wave; the horizon is placed
 * where the curve crosses sunrise/sunset so the arc above it is daylight.
 */
export default function SunArcTile({ data, now, className, pulseKey }) {
  const ev = nextSunEvent(data, now)
  const { today } = ev
  const dayStart = today.time
  const frac = (ts) => (ts - dayStart) / 86400
  const noon = (frac(today.sunrise) + frac(today.sunset)) / 2
  const waveY = (f) => MID - AMP * Math.cos(2 * Math.PI * (f - noon))
  const horizon = waveY(frac(today.sunrise))

  const samples = Array.from({ length: 97 }, (_, i) => i / 96)
  const d = samples.map((f, i) => `${i ? 'L' : 'M'}${(f * W).toFixed(1)},${waveY(f).toFixed(1)}`).join(' ')
  const f = Math.min(1, Math.max(0, frac(now)))
  const sx = f * W
  const sy = waveY(f)
  const up = sy < horizon
  const daylight = today.sunset - today.sunrise
  const Icon = ev.kind === 'Sunrise' ? Sunrise : Sunset

  return (
    <GlassCard className={className} pulseKey={pulseKey} title={ev.kind} icon={Icon} bodyClassName="flex flex-col">
      <p className="text-[26px] font-normal leading-none tabular-nums">{formatTime(ev.time, data.utcOffset)}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="my-2 w-full overflow-visible" aria-hidden="true">
        <defs>
          <clipPath id="sun-above">
            <rect x="0" y="0" width={W} height={horizon} />
          </clipPath>
          <clipPath id="sun-past">
            <rect x="0" y="0" width={sx} height={horizon} />
          </clipPath>
          <radialGradient id="sun-glow">
            <stop offset="0" stopColor="#fff6d5" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ffd60a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sun-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0.28" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
        <path d={`${d} L${W},${horizon} L0,${horizon} Z`} fill="url(#sun-fill)" clipPath="url(#sun-past)" />
        <path d={d} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" clipPath="url(#sun-above)" />
        <line x1="0" x2={W} y1={horizon} y2={horizon} stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
        {up && <motion.circle r="16" fill="url(#sun-glow)" initial={{ cx: 0, cy: horizon }} animate={{ cx: sx, cy: sy }} transition={SOFT_SPRING} />}
        <motion.circle
          r={up ? 5.5 : 4}
          fill={up ? '#fff' : 'rgba(255,255,255,0.5)'}
          stroke={up ? 'rgba(255,214,10,0.9)' : 'none'}
          strokeWidth="2"
          initial={{ cx: 0, cy: horizon }}
          animate={{ cx: sx, cy: sy }}
          transition={SOFT_SPRING}
        />
      </svg>
      <Caption className="mt-auto">
        {ev.other.kind}: {formatTime(ev.other.time, data.utcOffset)}
        <span className="block text-white/55">{formatDuration(daylight)} of daylight</span>
      </Caption>
    </GlassCard>
  )
}
