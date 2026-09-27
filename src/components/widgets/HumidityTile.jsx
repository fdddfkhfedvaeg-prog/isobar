import { motion, useReducedMotion } from 'framer-motion'
import { Droplets } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import { BigValue, Caption } from '../ui/Stat'
import { useUnits } from '../../hooks/useUnits'
import { fmtTemp } from '../../lib/units'
import { SOFT_SPRING } from '../../lib/motion'

/** Humidity with a liquid moisture meter and dew point. */
export default function HumidityTile({ data, className, pulseKey }) {
  const { system } = useUnits()
  const reduce = useReducedMotion()
  const { humidity, dewPoint } = data.current
  const comfort = dewPoint < 10 ? 'Dry and comfortable.' : dewPoint < 16 ? 'Comfortable.' : dewPoint < 21 ? 'A little muggy.' : 'Oppressively humid.'

  return (
    <GlassCard className={className} pulseKey={pulseKey} title="Humidity" icon={Droplets} bodyClassName="flex flex-col">
      <div className="flex flex-1 items-start justify-between gap-3">
        <BigValue>{Math.round(humidity)}%</BigValue>
        <div
          className="relative h-[84px] w-7 shrink-0 overflow-hidden rounded-full bg-black/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(humidity)}
          aria-label="Relative humidity"
        >
          <motion.div
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sky-600/90 to-sky-300/90"
            initial={{ height: '0%' }}
            animate={{ height: `${humidity}%` }}
            transition={{ ...SOFT_SPRING, delay: 0.15 }}
          >
            <motion.svg
              viewBox="0 0 56 8"
              preserveAspectRatio="none"
              className="absolute -top-[5px] left-0 h-[6px] w-[200%] fill-sky-300/90"
              animate={reduce ? undefined : { x: ['0%', '-50%'] }}
              transition={{ duration: 2.4, ease: 'linear', repeat: Infinity }}
              aria-hidden="true"
            >
              <path d="M0 4 Q7 0 14 4 T28 4 T42 4 T56 4 V8 H0 Z" />
            </motion.svg>
          </motion.div>
          {[25, 50, 75].map((m) => (
            <span key={m} className="absolute left-1/2 h-px w-2.5 -translate-x-1/2 bg-white/35" style={{ bottom: `${m}%` }} />
          ))}
        </div>
      </div>
      <Caption className="mt-auto">
        The dew point is {fmtTemp(dewPoint, system)} right now. <span className="text-white/55">{comfort}</span>
      </Caption>
    </GlassCard>
  )
}
