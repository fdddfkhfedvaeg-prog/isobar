import { motion } from 'framer-motion'
import { Leaf } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import { Caption } from '../ui/Stat'
import { aqiCategory } from '../../lib/insights'
import { clamp } from '../../lib/format'
import { SOFT_SPRING } from '../../lib/motion'

const SPECTRUM = 'linear-gradient(90deg,#34c759 0%,#ffd60a 18%,#ff9f0a 34%,#ff453a 52%,#bf5af2 72%,#8e2c48 100%)'

export default function AirQualityTile({ data, className, pulseKey }) {
  const aqi = data.aqi
  if (!aqi) {
    return (
      <GlassCard className={className} pulseKey={pulseKey} title="Air Quality" icon={Leaf}>
        <p className="text-[15px] text-white/80">Air quality data isn’t available for this location right now.</p>
      </GlassCard>
    )
  }
  const cat = aqiCategory(aqi.value)
  const pos = clamp(aqi.value / 300, 0, 1) * 100
  const pollutants = [
    ['PM2.5', aqi.pm25],
    ['PM10', aqi.pm10],
    ['O₃', aqi.o3],
    ['NO₂', aqi.no2],
  ].filter(([, v]) => typeof v === 'number')

  return (
    <GlassCard className={className} pulseKey={pulseKey} title="Air Quality" icon={Leaf} bodyClassName="flex flex-col">
      <div className="flex items-baseline gap-3">
        <p className="text-[32px] font-normal leading-none tabular-nums">{Math.round(aqi.value)}</p>
        <p className="text-[19px] font-semibold leading-tight" style={{ color: cat.color }}>
          {cat.label}
        </p>
      </div>
      <p className="mt-0.5 text-[12px] text-white/55">US AQI</p>
      <div className="relative my-3.5 h-[6px] rounded-full" style={{ backgroundImage: SPECTRUM }} role="meter" aria-valuemin={0} aria-valuemax={300} aria-valuenow={Math.round(aqi.value)} aria-label="Air quality index">
        <motion.span
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_2.5px_rgba(0,0,0,0.3)]"
          initial={{ left: '0%' }}
          animate={{ left: `${pos}%` }}
          transition={{ ...SOFT_SPRING, delay: 0.2 }}
        />
      </div>
      <Caption>{cat.advice}</Caption>
      {pollutants.length > 0 && (
        <ul className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {pollutants.map(([k, v]) => (
            <li key={k} className="rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-white/80">
              {k} <span className="tabular-nums text-white">{Math.round(v)}</span>
              <span className="text-white/50"> µg/m³</span>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  )
}
