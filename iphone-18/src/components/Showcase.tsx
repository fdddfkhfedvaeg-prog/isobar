import { ChevronRight, Lightbulb, Palette } from 'lucide-react'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { webglTier } from '../lib/observability'
import { useReducedMotion } from '../lib/useReducedMotion'
import { FINISHES, STUDIOS, type Finish, type Studio } from '../three/finishes'
import { BEATS, KEYFRAMES, scrollState } from '../three/timeline'
import { ErrorBoundary } from './ErrorBoundary'
import { PartLabels } from './PartLabels'
import { StaticPhone } from './StaticPhone'

// three.js + r3f are code-split: hero copy paints first, the stage streams in.
const Stage = lazy(() => import('../three/Stage'))

const RAIL = KEYFRAMES.filter((k) => !/hold|Arrival/.test(k.label))
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function Showcase({ finish, setFinish }: { finish: Finish; setFinish: (f: Finish) => void }) {
  const track = useRef<HTMLElement>(null)
  const hero = useRef<HTMLDivElement>(null)
  const beats = useRef<HTMLDivElement[]>([])
  const railFill = useRef<HTMLDivElement>(null)
  const [studio, setStudio] = useState<Studio>(STUDIOS[0])
  const [active, setActive] = useState(true)
  const [fallback, setFallback] = useState<string | null>(() =>
    webglTier() === 'webgl2' ? null : 'Showing a still image: this browser has no hardware-accelerated WebGL2.',
  )
  const reducedMotion = useReducedMotion()

  // Scroll → progress. Written to a mutable store the render loop reads; overlays are updated by direct DOM writes.
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const el = track.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const p = Math.min(1, Math.max(0, -rect.top / (rect.height - window.innerHeight)))
      scrollState.progress = p

      if (hero.current) {
        const o = 1 - smoothstep(0.015, 0.07, p)
        hero.current.style.opacity = String(o)
        hero.current.style.transform = `translate3d(0, ${-p * 600}px, 0) scale(${1 + p * 1.5})`
        hero.current.style.visibility = o === 0 ? 'hidden' : 'visible'
      }
      BEATS.forEach((b, i) => {
        const el = beats.current[i]
        if (!el) return
        const o = smoothstep(b.from, b.from + 0.025, p) * (1 - smoothstep(b.to - 0.025, b.to, p))
        el.style.opacity = String(o)
        el.style.transform = `translate3d(0, ${(1 - o) * 24}px, 0)`
      })
      if (railFill.current) railFill.current.style.transform = `scaleY(${p})`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // Stop rendering entirely while the stage is off-screen.
  useEffect(() => {
    const el = track.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const jumpTo = (t: number) => {
    const el = track.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: top + t * (el.offsetHeight - window.innerHeight), behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  const still = <StaticPhone finish={finish} reason={fallback ?? 'Showing a still image: the 3D view hit an error.'} />

  return (
    <section ref={track} id="design" aria-label="iPhone 18 Pro Max 3D showcase" className="relative h-[700vh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden" style={{ background: studio.background }}>
        {fallback ? still : (
          <ErrorBoundary area="stage" fallback={still}>
            <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-sm text-fg-3">Loading 3D…</div>}>
              <Stage
                finish={finish}
                studio={studio}
                active={active}
                reducedMotion={reducedMotion}
                onContextLost={() => setFallback('Showing a still image: the graphics context was lost.')}
              />
            </Suspense>
          </ErrorBoundary>
        )}
        {!fallback && <PartLabels />}

        {/* Cinematic title card */}
        <div ref={hero} className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center will-change-transform">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-ember">Introducing</p>
          <h1 className="text-hero text-gradient-titanium">iPhone 18<br />Pro Max</h1>
          <p className="mt-6 max-w-xl text-lead text-fg-2">The most powerful iPhone ever built, and the first on 2 nm silicon.</p>
          <p className="absolute bottom-28 animate-pulse text-xs uppercase tracking-[0.25em] text-fg-3">Scroll</p>
        </div>

        {/* Story beats */}
        {BEATS.map((b, i) => (
          <div
            key={b.title}
            ref={(el) => { if (el) beats.current[i] = el }}
            className="pointer-events-none absolute left-4 top-24 max-w-md opacity-0 sm:left-12 sm:top-1/3"
          >
            <p className="mb-2 text-sm font-semibold text-ember">{b.eyebrow}</p>
            <h2 className="text-display text-fg">{b.title}</h2>
          </div>
        ))}

        {/* Progress rail: jump to any shot */}
        <nav aria-label="Showcase chapters" className="absolute right-4 top-1/2 hidden -translate-y-1/2 sm:block">
          <div className="relative flex flex-col gap-5 pl-4">
            <div className="absolute bottom-1 left-0 top-1 w-px bg-hairline-strong">
              <div ref={railFill} className="h-full w-full origin-top bg-fg" style={{ transform: 'scaleY(0)' }} />
            </div>
            {RAIL.map((k) => (
              <button key={k.label} onClick={() => jumpTo(k.t)} className="group flex items-center gap-2 text-left text-xs text-fg-3 transition-colors hover:text-fg">
                <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                {k.label}
              </button>
            ))}
          </div>
        </nav>

        <StudioDock finish={finish} setFinish={setFinish} studio={studio} setStudio={setStudio} />
      </div>
    </section>
  )
}

function StudioDock({ finish, setFinish, studio, setStudio }: {
  finish: Finish; setFinish: (f: Finish) => void; studio: Studio; setStudio: (s: Studio) => void
}) {
  return (
    <div className="glass absolute bottom-5 left-1/2 flex max-w-[calc(100vw-32px)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-[22px] px-4 py-2.5 sm:rounded-pill">
      <div role="radiogroup" aria-label="Colorway" className="flex items-center gap-2">
        <Palette className="size-4 text-fg-3" aria-hidden />
        {FINISHES.map((f) => (
          <button
            key={f.id}
            role="radio"
            aria-checked={f.id === finish.id}
            aria-label={f.name}
            title={f.name}
            onClick={() => setFinish(f)}
            className="size-6 rounded-full ring-offset-2 ring-offset-surface-2 transition-transform duration-300 ease-spring hover:scale-110 aria-checked:ring-2 aria-checked:ring-fg"
            style={{ background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${f.swatch} 70%, white), ${f.swatch} 60%)` }}
          />
        ))}
        <span className="ml-1 hidden min-w-24 text-xs text-fg-2 sm:inline">{finish.name}</span>
      </div>
      <span className="hidden h-5 w-px bg-hairline-strong sm:block" />
      <div role="radiogroup" aria-label="Lighting" className="flex items-center gap-1">
        <Lightbulb className="mr-1 size-4 text-fg-3" aria-hidden />
        {STUDIOS.map((s) => (
          <button
            key={s.id}
            role="radio"
            aria-checked={s.id === studio.id}
            onClick={() => setStudio(s)}
            className="whitespace-nowrap rounded-pill px-3 py-1 text-xs text-fg-2 transition-colors hover:text-fg aria-checked:bg-fg aria-checked:text-ink"
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  )
}
