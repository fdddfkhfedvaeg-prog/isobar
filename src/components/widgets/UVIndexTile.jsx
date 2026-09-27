import { motion } from 'framer-motion'
import { Sun } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import { Caption } from '../ui/Stat'
import { uvAdvice, uvCategory } from '../../lib/insights'
import { clamp } from '../../lib/format'
import { SOFT_SPRING } from '../../lib/motion'
import { arcPath, polar } from './gauge'

const START = -135
const END = 135

export default function UVIndexTile({ data, now, className, pulseKey }) {
  const uv = data.current.uv
  const cat = uvCategory(uv)
  const angle = START + clamp(uv / 11, 0, 1) * (END - START)
  const [dx, dy] = polar(60, 60, 46, angle)

  return (
    <GlassCard className={className} pulseKey={pulseKey} title="UV Index" icon={Sun} bodyClassName="flex flex-col">
      <div className="relative mx-auto -mt-1 w-full max-w-[150px]">
        <svg viewBox="0 0 120 104" className="w-full" aria-hidden="true">
          <defs>
            <linearGradient id="uv-arc" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#34c759" />
              <stop offset="0.3" stopColor="#ffd60a" />
              <stop offset="0.55" stopColor="#ff9f0a" />
              <stop offset="0.8" stopColor="#ff453a" />
              <stop offset="1" stopColor="#bf5af2" />
            </linearGradient>
          </defs>
          <path d={arcPath(60, 60, 46, START, END)} stroke="rgba(0,0,0,0.22)" strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d={arcPath(60, 60, 46, START, END)} stroke="url(#uv-arc)" strokeWidth="7" fill="none" strokeLinecap="round" />
          <motion.circle
            r="6"
            fill="white"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth="2.5"
            initial={{ cx: polar(60, 60, 46, START)[0], cy: polar(60, 60, 46, START)[1] }}
            animate={{ cx: dx, cy: dy }}
            transition={{ ...SOFT_SPRING, delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-x-0 top-[34%] text-center">
          <p className="text-[34px] font-normal leading-none tabular-nums">{Math.round(uv)}</p>
          <p className={`mt-1 text-[13px] font-semibold ${cat.tone}`}>{cat.label}</p>
        </div>
      </div>
      <Caption className="mt-auto">{uvAdvice(data, now)}</Caption>
    </GlassCard>
  )
}
