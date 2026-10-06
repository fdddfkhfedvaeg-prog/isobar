import { Aperture, BatteryFull, Cpu, Feather, Gauge, Satellite, Sparkles, type LucideIcon } from 'lucide-react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import type { IPhoneModel } from '../data/types'
import { Reveal } from './Reveal'

/** Glass card with a cursor-tracking spotlight (CSS vars, no re-render). */
function Card({ className = '', children, delay = 0, glow = 'rgb(41 151 255 / 0.16)' }: { className?: string; children: ReactNode; delay?: number; glow?: string }) {
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <Reveal delay={delay} className={className}>
      <article
        onPointerMove={onMove}
        style={{ '--glow': glow } as CSSProperties}
        className="group relative h-full overflow-hidden rounded-card border border-hairline bg-surface-1 p-6 transition-[border-color,transform] duration-500 ease-apple hover:-translate-y-0.5 hover:border-hairline-strong sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: 'radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), var(--glow), transparent 60%)' }}
        />
        <div className="relative flex h-full flex-col">{children}</div>
      </article>
    </Reveal>
  )
}

function Eyebrow({ icon: Icon, children, color = 'text-fg-3' }: { icon: LucideIcon; children: ReactNode; color?: string }) {
  return (
    <p className={`flex items-center gap-2 text-sm font-medium ${color}`}>
      <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
      {children}
    </p>
  )
}

export function Bento({ flagship, previous }: { flagship: IPhoneModel; previous?: IPhoneModel }) {
  const nodeShrink = previous ? Math.round((1 - flagship.process_nm / previous.process_nm) * 100) : null

  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-28 sm:py-40">
      <Reveal>
        <p className="text-sm font-semibold text-ember">Features</p>
        <h2 className="mt-2 max-w-3xl text-display">Pro in every layer you just took apart.</h2>
      </Reveal>

      <div className="mt-14 grid auto-rows-[minmax(220px,auto)] grid-cols-1 gap-4 sm:grid-cols-6">
        {/* Silicon */}
        <Card className="sm:col-span-4 sm:row-span-2" glow="rgb(41 151 255 / 0.22)">
          <Eyebrow icon={Cpu} color="text-accent">{flagship.chip}</Eyebrow>
          <div className="mt-auto grid items-end gap-8 pt-10 md:grid-cols-[auto_1fr]">
            <div>
              <p className="text-[clamp(5rem,12vw,9rem)] font-bold leading-none tracking-[-0.06em] text-gradient-titanium">{flagship.process_nm} nm</p>
              <p className="mt-3 max-w-sm text-lead text-fg-2">
                Apple's first chip on a {flagship.process_nm}-nanometer process
                {nodeShrink !== null && previous && <> — a {nodeShrink}% smaller node than {previous.name}'s {previous.chip}</>}.
              </p>
            </div>
            <ChipArt />
          </div>
        </Card>

        {/* Camera */}
        <Card className="sm:col-span-2 sm:row-span-2" glow="rgb(255 122 61 / 0.18)">
          <Eyebrow icon={Aperture} color="text-ember">Pro camera system</Eyebrow>
          <p className="mt-6 text-title">{flagship.rear_cameras} × {flagship.main_camera_mp}MP</p>
          <ul className="mt-auto space-y-3 pt-8 text-sm">
            {[['Ultra Wide', '0.5×'], ['Fusion Main', '1×'], ['Telephoto', `${flagship.max_optical_zoom}×`]].map(([n, f]) => (
              <li key={n} className="flex items-center justify-between border-t border-hairline pt-3">
                <span className="text-fg-2">{n}</span>
                <span className="font-mono text-fg">{f}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="sm:col-span-2">
          <Eyebrow icon={Gauge}>Display</Eyebrow>
          <p className="mt-auto text-title">{flagship.display_in}″ ProMotion</p>
          <p className="mt-1 text-sm text-fg-3">Up to {flagship.refresh_hz} Hz · {flagship.resolution}</p>
        </Card>

        <Card className="sm:col-span-2" glow="rgb(48 209 88 / 0.16)">
          <Eyebrow icon={BatteryFull} color="text-gain">Battery</Eyebrow>
          <div className="mt-auto h-2 overflow-hidden rounded-pill bg-surface-3">
            <div className="h-full w-[92%] origin-left rounded-pill bg-gain transition-transform duration-[1.6s] ease-apple [.reveal:not(.is-in)_&]:scale-x-0" />
          </div>
          <p className="mt-3 text-title">All-day, then some.</p>
        </Card>

        <Card className="sm:col-span-2">
          <Eyebrow icon={Feather}>Design</Eyebrow>
          <p className="mt-auto text-title">{flagship.frame}</p>
          <p className="mt-1 text-sm text-fg-3">{flagship.depth_mm} mm · {flagship.weight_g} g</p>
        </Card>

        <Card className="sm:col-span-3" glow="rgb(191 90 242 / 0.18)">
          <Eyebrow icon={Sparkles} color="text-[#bf5af2]">Apple Intelligence</Eyebrow>
          <p className="mt-auto text-title">Private by design. On-device first.</p>
          <p className="mt-2 max-w-md text-sm text-fg-3">The Neural Engine runs most requests locally. Heavier requests go to Private Cloud Compute, which doesn't keep your data.</p>
        </Card>

        <Card className="sm:col-span-3">
          <Eyebrow icon={Satellite}>Connectivity</Eyebrow>
          <p className="mt-auto text-title">Reach help with no signal.</p>
          <p className="mt-2 max-w-md text-sm text-fg-3">Emergency SOS, Find My and Messages via satellite, plus Wi-Fi 7.</p>
        </Card>
      </div>
      {!flagship.verified && (
        <p className="mt-6 text-xs text-fg-3">Specs shown for {flagship.name} are pre-release figures and may change.</p>
      )}
    </section>
  )
}

/** Stylised die: a grid of cores that light up in sequence. */
function ChipArt() {
  const cells = Array.from({ length: 36 })
  return (
    <div aria-hidden className="relative mx-auto aspect-square w-full max-w-[260px] rounded-[22px] border border-hairline-strong bg-gradient-to-br from-surface-3 to-surface-1 p-5 shadow-[0_0_80px_-20px_rgb(41_151_255/0.6)]">
      <div className="grid h-full grid-cols-6 gap-1.5">
        {cells.map((_, i) => (
          <span
            key={i}
            className="rounded-[4px] bg-accent/15 motion-safe:animate-pulse"
            style={{ animationDelay: `${(i % 6) * 120 + Math.floor(i / 6) * 90}ms`, animationDuration: '2.4s', background: i % 7 === 0 ? 'rgb(41 151 255 / 0.55)' : undefined }}
          />
        ))}
      </div>
      <span className="absolute inset-x-0 -bottom-7 text-center font-mono text-[10px] tracking-[0.3em] text-fg-3">NEURAL ENGINE</span>
    </div>
  )
}
