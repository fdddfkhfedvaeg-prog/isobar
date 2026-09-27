import { cn } from '../../lib/cn'

/** Big tile value with an optional unit suffix. */
export function BigValue({ children, unit, className }) {
  return (
    <p className={cn('text-[32px] font-normal leading-none tracking-tight tabular-nums', className)}>
      {children}
      {unit && <span className="ml-1 text-lg font-medium text-white/70">{unit}</span>}
    </p>
  )
}

export function Caption({ children, className }) {
  return <p className={cn('text-[13px] leading-snug text-white/80', className)}>{children}</p>
}
