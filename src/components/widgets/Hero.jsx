import { motion, useScroll, useTransform } from 'framer-motion'
import { Navigation } from 'lucide-react'
import { describeCode } from '../../services/weather'
import { useUnits } from '../../hooks/useUnits'
import { convert } from '../../lib/units'
import { cardVariants } from '../../lib/motion'

/** Location + live temperature. Micro-collapses as the page scrolls. */
export default function Hero({ data }) {
  const { system } = useUnits()
  const { scrollY } = useScroll()
  const scale = useTransform(scrollY, [0, 200], [1, 0.78], { clamp: true })
  const lift = useTransform(scrollY, [0, 200], [0, 26], { clamp: true })
  const detailOpacity = useTransform(scrollY, [0, 120], [1, 0], { clamp: true })
  const detailY = useTransform(scrollY, [0, 120], [0, -10], { clamp: true })
  const heroOpacity = useTransform(scrollY, [120, 260], [1, 0], { clamp: true })

  const { current, daily, location } = data
  const { label } = describeCode(current.code, current.isDay)
  const t = (c) => Math.round(convert.temp(c, system))
  const today = daily[0]

  return (
    <motion.header
      variants={cardVariants}
      style={{ scale, y: lift, opacity: heroOpacity }}
      className="relative origin-top pb-8 pt-8 text-center [text-shadow:0_1px_18px_rgba(0,0,0,0.18)] sm:pb-12 sm:pt-14"
    >
      {location.isCurrent && (
        <p className="mb-1 flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
          <Navigation className="h-3 w-3 fill-current" aria-hidden="true" /> My Location
        </p>
      )}
      <h1 className="text-[30px] font-normal leading-tight tracking-tight sm:text-[38px]">{location.name}</h1>
      <p className="sr-only">
        {t(current.temp)} degrees, {label}
      </p>
      <div aria-hidden="true" className="relative mx-auto inline-block pl-[0.08em] text-[104px] font-thin leading-[0.95] tracking-[-0.04em] tabular-nums sm:text-[136px]">
        {t(current.temp)}
        <span className="absolute left-full top-0 font-thin">°</span>
      </div>
      <motion.div style={{ opacity: detailOpacity, y: detailY }}>
        <p className="mt-1 text-xl font-medium text-white/90 sm:text-2xl">{label}</p>
        <p className="mt-0.5 text-lg font-medium tabular-nums text-white/90 sm:text-xl">
          H:{t(today.max)}° <span className="ml-1.5">L:{t(today.min)}°</span>
        </p>
        <p className="mt-1 text-[13px] text-white/60">Feels like {t(current.feelsLike)}°</p>
      </motion.div>
    </motion.header>
  )
}
