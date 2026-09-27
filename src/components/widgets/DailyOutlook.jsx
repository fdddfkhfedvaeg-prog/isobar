import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, ChevronDown, Droplets, Sunrise, Sunset, Sun, Wind } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import WeatherIcon from '../ui/WeatherIcon'
import { describeCode } from '../../services/weather'
import { useUnits } from '../../hooks/useUnits'
import { convert, fmtPrecip } from '../../lib/units'
import { formatTime, formatWeekday } from '../../lib/format'
import { tempGradient } from '../../lib/color'
import { SPRING } from '../../lib/motion'
import { cn } from '../../lib/cn'

export default function DailyOutlook({ data, className, pulseKey }) {
  const { system } = useUnits()
  const [open, setOpen] = useState(null)
  const days = data.daily.slice(0, 10)
  const lo = Math.min(...days.map((d) => d.min), data.current.temp)
  const hi = Math.max(...days.map((d) => d.max), data.current.temp)
  const span = hi - lo || 1
  const t = (c) => Math.round(convert.temp(c, system))

  return (
    <GlassCard className={className} pulseKey={pulseKey} tilt={false} title={`${days.length}-Day Forecast`} icon={CalendarDays} bodyClassName="flex flex-col">
      <ul className="-mx-1 flex flex-1 flex-col justify-between">
        {days.map((d, i) => {
          const isOpen = open === i
          const left = ((d.min - lo) / span) * 100
          const width = Math.max(4, ((d.max - d.min) / span) * 100)
          const nowPos = i === 0 ? ((data.current.temp - d.min) / (d.max - d.min || 1)) * 100 : null
          return (
            <li key={d.time} className="border-t border-white/10 first:border-t-0">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="grid w-full grid-cols-[3.2rem_2.6rem_2.4rem_1fr_2.4rem_1rem] items-center gap-2 rounded-xl px-1 py-2.5 text-left transition-colors hover:bg-white/[0.06] sm:grid-cols-[3.6rem_3rem_2.6rem_1fr_2.6rem_1rem]"
              >
                <span className="text-[17px] font-medium">{i === 0 ? 'Today' : formatWeekday(d.time, data.utcOffset)}</span>
                <span className="flex flex-col items-center leading-none">
                  <WeatherIcon code={d.code} isDay className="h-6 w-6" />
                  {d.pop >= 20 && <span className="mt-0.5 text-[10px] font-semibold text-sky-300">{Math.round(d.pop / 10) * 10}%</span>}
                </span>
                <span className="text-right text-[17px] font-medium tabular-nums text-white/55">{t(d.min)}°</span>
                <span className="relative h-[5px] rounded-full bg-black/25 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.06)]">
                  <motion.span
                    className="absolute inset-y-0 origin-left rounded-full"
                    style={{ left: `${left}%`, width: `${width}%`, backgroundImage: tempGradient(d.min, d.max) }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ ...SPRING, delay: 0.1 + i * 0.035 }}
                  />
                  {nowPos != null && (
                    <span
                      className="absolute top-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_2.5px_rgba(0,0,0,0.3)]"
                      style={{ left: `calc(${left}% + ${(Math.min(100, Math.max(0, nowPos)) * width) / 100}%)` }}
                      title="Current temperature"
                    />
                  )}
                </span>
                <span className="text-right text-[17px] font-medium tabular-nums">{t(d.max)}°</span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={SPRING} className="text-white/40">
                  <ChevronDown className="h-4 w-4" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="details"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={SPRING}
                    className="overflow-hidden"
                  >
                    <div className="mb-2.5 grid grid-cols-2 gap-x-5 gap-y-2 rounded-2xl bg-black/15 p-3 text-[13px]">
                      <p className="col-span-2 font-medium text-white/90">
                        {formatWeekday(d.time, data.utcOffset, true)} · {describeCode(d.code).label}
                      </p>
                      <Detail icon={Sunrise} label="Sunrise" value={formatTime(d.sunrise, data.utcOffset)} />
                      <Detail icon={Sunset} label="Sunset" value={formatTime(d.sunset, data.utcOffset)} />
                      <Detail icon={Sun} label="UV max" value={Math.round(d.uvMax)} />
                      <Detail icon={Droplets} label="Precip." value={`${fmtPrecip(d.precipSum, system)} · ${Math.round(d.pop)}%`} />
                      <Detail
                        icon={Wind}
                        label="Wind max"
                        value={`${Math.round(convert.wind(d.windMax ?? 0, system))} ${system === 'imperial' ? 'mph' : 'km/h'}`}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
    </GlassCard>
  )
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className={cn('flex items-center gap-2 text-white/70')}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
      <span className="ml-auto font-medium tabular-nums text-white">{value}</span>
    </div>
  )
}
