import { motion } from 'framer-motion'
import { Eye } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import { BigValue, Caption } from '../ui/Stat'
import { useUnits } from '../../hooks/useUnits'
import { convert } from '../../lib/units'
import { visibilityDescription } from '../../lib/insights'
import { SPRING } from '../../lib/motion'

const BANDS = [1, 4, 10, 20, 30] // km thresholds, near → far

export default function VisibilityTile({ data, className, pulseKey }) {
  const { system, labels } = useUnits()
  const km = data.current.visibility
  const shown = convert.distance(km, system)

  return (
    <GlassCard className={className} pulseKey={pulseKey} title="Visibility" icon={Eye} bodyClassName="flex flex-col">
      <BigValue unit={labels.distance}>{shown < 10 ? shown.toFixed(1) : Math.round(shown)}</BigValue>
      {/* Receding horizon bands: each lights up if you can see that far. */}
      <div className="my-3 flex flex-1 flex-col justify-end gap-[5px]" aria-hidden="true">
        {[...BANDS].reverse().map((b, i) => {
          const lit = km >= b
          return (
            <motion.span
              key={b}
              className="mx-auto h-[3px] rounded-full"
              style={{ width: `${45 + i * 13.75}%`, background: lit ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.16)' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ ...SPRING, delay: 0.1 + (BANDS.length - i) * 0.05 }}
            />
          )
        })}
      </div>
      <Caption>{visibilityDescription(km)}</Caption>
    </GlassCard>
  )
}
