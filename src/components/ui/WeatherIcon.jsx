import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Cloudy, Moon, Sun } from 'lucide-react'
import { describeCode } from '../../services/weather'
import { cn } from '../../lib/cn'

const ICONS = {
  clear: [Sun, Moon],
  partly: [CloudSun, CloudMoon],
  cloudy: [Cloudy, Cloud],
  fog: [CloudFog, CloudFog],
  drizzle: [CloudDrizzle, CloudDrizzle],
  rain: [CloudRain, CloudRain],
  snow: [CloudSnow, CloudSnow],
  storm: [CloudLightning, CloudLightning],
}

const TINT = {
  clear: ['text-amber-300', 'text-slate-100'],
  partly: ['text-amber-200', 'text-slate-100'],
  cloudy: ['text-white', 'text-slate-200'],
  fog: ['text-slate-200', 'text-slate-300'],
  drizzle: ['text-sky-200', 'text-sky-200'],
  rain: ['text-sky-300', 'text-sky-300'],
  snow: ['text-cyan-50', 'text-cyan-50'],
  storm: ['text-amber-200', 'text-amber-200'],
}

export default function WeatherIcon({ code, isDay = 1, className, strokeWidth = 1.8 }) {
  const { group, label } = describeCode(code, isDay)
  const variant = isDay ? 0 : 1
  const Icon = (ICONS[group] ?? ICONS.cloudy)[variant]
  return (
    <Icon
      role="img"
      aria-label={label}
      strokeWidth={strokeWidth}
      fill="currentColor"
      fillOpacity={0.14}
      className={cn('drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]', (TINT[group] ?? TINT.cloudy)[variant], className)}
    />
  )
}
