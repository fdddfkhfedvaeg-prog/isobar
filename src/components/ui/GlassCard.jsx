import { useRef } from 'react'
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { useFinePointer } from '../../hooks/useMediaQuery'
import { cardVariants, SPRING } from '../../lib/motion'
import { cn } from '../../lib/cn'

const TILT = 6 // max degrees

/**
 * Optical glass panel: translucent fill, 40px backdrop blur with saturation
 * boost, hairline border, inner specular edge and a deep natural shadow.
 * On fine pointers it tilts in 3D toward the cursor and a soft glare follows.
 */
export default function GlassCard({ title, icon: Icon, pulseKey, tilt = true, className, bodyClassName, children, as = 'section', ...rest }) {
  const ref = useRef(null)
  const fine = useFinePointer()
  const reduce = useReducedMotion()
  const enabled = tilt && fine && !reduce

  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const hover = useMotionValue(0)
  const rotateX = useSpring(useTransform(py, [0, 1], [TILT, -TILT]), { stiffness: 200, damping: 20, mass: 0.6 })
  const rotateY = useSpring(useTransform(px, [0, 1], [-TILT, TILT]), { stiffness: 200, damping: 20, mass: 0.6 })
  const glareOpacity = useSpring(hover, { stiffness: 160, damping: 24 })
  const gx = useTransform(px, (v) => `${v * 100}%`)
  const gy = useTransform(py, (v) => `${v * 100}%`)
  const glare = useMotionTemplate`radial-gradient(520px circle at ${gx} ${gy}, rgba(255,255,255,0.13), transparent 42%)`

  const onPointerMove = (e) => {
    if (!enabled || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
    hover.set(1)
  }
  const onPointerLeave = () => {
    px.set(0.5)
    py.set(0.5)
    hover.set(0)
  }

  const Component = motion[as] ?? motion.section

  return (
    <Component
      ref={ref}
      variants={cardVariants}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      whileHover={enabled ? { scale: 1.012, transition: SPRING } : undefined}
      whileTap={enabled ? { scale: 0.995, transition: SPRING } : undefined}
      style={enabled ? { rotateX, rotateY, transformPerspective: 1100 } : undefined}
      className={cn(
        'group/card relative isolate flex flex-col overflow-hidden rounded-[26px] border border-white/15 bg-white/[0.08] p-4 backdrop-blur-2xl backdrop-saturate-150',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_24px_48px_-18px_rgba(0,0,0,0.5),0_2px_8px_-2px_rgba(0,0,0,0.18)]',
        className,
      )}
      {...rest}
    >
      {/* Layered optics: top sheen + cursor glare. */}
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-gradient-to-b from-white/[0.09] via-transparent to-black/[0.04]" />
      {enabled && (
        <motion.div className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]" style={{ background: glare, opacity: glareOpacity }} />
      )}
      <RefreshPulse pulseKey={pulseKey} />
      {title && (
        <header className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">
          {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />}
          <h2>{title}</h2>
        </header>
      )}
      <div className={cn('min-h-0 flex-1', bodyClassName)}>{children}</div>
    </Component>
  )
}

/** Organic "haptic" ripple played whenever the card's data refreshes. */
function RefreshPulse({ pulseKey }) {
  const first = useRef(pulseKey)
  if (pulseKey == null || pulseKey === first.current) return null
  return (
    <AnimatePresence>
      <motion.span
        key={pulseKey}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/50 shadow-[inset_0_0_28px_rgba(255,255,255,0.22)]"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.97, 1, 1.01] }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />
    </AnimatePresence>
  )
}
