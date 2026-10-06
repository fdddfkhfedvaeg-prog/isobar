import { ArrowUpRight, Check, Database, Plus, RotateCcw, Trophy, X } from 'lucide-react'
import { Fragment, useMemo, useRef, useState } from 'react'
import type { IPhoneModel } from '../data/types'
import { SPEC_FIELDS, compareField, formatDelta, formatValue, toggleSelection } from '../lib/compare'
import type { LineageSource } from '../lib/useLineage'
import { Reveal } from './Reveal'

const SLOT_COLORS = ['#2997ff', '#ff7a3d', '#bf5af2'] as const

const PRESETS: Array<{ label: string; slugs: string[] }> = [
  { label: 'Last three Pro Max', slugs: ['iphone-18-pro-max', 'iphone-17-pro-max', 'iphone-16-pro-max'] },
  { label: '2007 vs today', slugs: ['iphone', 'iphone-18-pro-max'] },
  { label: 'Air vs Pro Max', slugs: ['iphone-air', 'iphone-18-pro-max'] },
  { label: 'X → 18', slugs: ['iphone-x', 'iphone-14-pro-max', 'iphone-18-pro-max'] },
]

const TEXT_ROWS: Array<{ key: keyof IPhoneModel; label: string }> = [
  { key: 'chip', label: 'Chip' },
  { key: 'display_tech', label: 'Display type' },
  { key: 'resolution', label: 'Resolution' },
  { key: 'frame', label: 'Frame' },
]

export function Compare({ models, source }: { models: IPhoneModel[]; source: LineageSource }) {
  const bySlug = useMemo(() => new Map(models.map((m) => [m.slug, m])), [models])
  const [selected, setSelected] = useState<string[]>(PRESETS[0].slugs)
  const [onlyDiffs, setOnlyDiffs] = useState(false)
  const [drawer, setDrawer] = useState<IPhoneModel | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  const picked = selected.map((s) => bySlug.get(s)).filter((m): m is IPhoneModel => !!m)
  const years = useMemo(() => {
    const g = new Map<number, IPhoneModel[]>()
    for (const m of models) g.set(m.release_year, [...(g.get(m.release_year) ?? []), m])
    return [...g].sort(([a], [b]) => b - a)
  }, [models])

  const rows = useMemo(() => SPEC_FIELDS.map((f) => ({ field: f, result: compareField(picked, f) })), [picked])
  const groups = [...new Set(SPEC_FIELDS.map((f) => f.group))]
  const wins = picked.map((_, i) => rows.filter((r) => r.result.cells[i].isBest).length)

  const openDrawer = (m: IPhoneModel) => { setDrawer(m); dialog.current?.showModal() }

  return (
    <section id="compare" className="mx-auto max-w-6xl px-4 py-28 sm:py-40">
      <Reveal>
        <p className="text-sm font-semibold text-accent">Compare</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-2xl text-display">Every iPhone since 2007, side by side.</h2>
          <span className="flex items-center gap-1.5 rounded-pill border border-hairline px-3 py-1 text-xs text-fg-3">
            <Database className="size-3.5" aria-hidden />
            {source === 'supabase' ? 'Live from Supabase' : 'Bundled dataset'} · {models.length} models
          </span>
        </div>
        <p className="mt-4 max-w-xl text-lead text-fg-2">Pick two or three. The best value in each row is highlighted, and every column shows its change against the first.</p>
      </Reveal>

      {/* Presets */}
      <div className="mt-10 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setSelected(p.slugs.filter((s) => bySlug.has(s)))}
            className="rounded-pill border border-hairline px-3.5 py-1.5 text-xs text-fg-2 transition-colors hover:border-hairline-strong hover:text-fg"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Picker */}
      <div className="mt-4 -mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]" role="group" aria-label="Models to compare">
        <div className="flex w-max gap-6">
          {years.map(([year, ms]) => (
            <div key={year}>
              <p className="mb-2 font-mono text-[11px] text-fg-3">{year}</p>
              <div className="flex gap-1.5">
                {ms.map((m) => {
                  const slot = selected.indexOf(m.slug)
                  const on = slot >= 0
                  return (
                    <button
                      key={m.slug}
                      aria-pressed={on}
                      onClick={() => setSelected((cur) => toggleSelection(cur, m.slug))}
                      className="flex items-center gap-1.5 whitespace-nowrap rounded-pill border px-3 py-1.5 text-xs transition-all duration-300 ease-apple"
                      style={on
                        ? { borderColor: SLOT_COLORS[slot], background: `${SLOT_COLORS[slot]}22`, color: '#f5f5f7' }
                        : { borderColor: 'var(--color-hairline)', color: 'var(--color-fg-2)' }}
                    >
                      {on ? <Check className="size-3" aria-hidden /> : <Plus className="size-3 opacity-50" aria-hidden />}
                      {m.name.replace(/^iPhone ?/, '') || 'Original'}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Matrix */}
      <div className="mt-8 overflow-x-auto rounded-card border border-hairline bg-surface-1">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">Specification comparison</caption>
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="sticky left-0 z-10 w-44 bg-surface-1 p-4 text-left align-bottom">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-normal text-fg-3">
                  <input type="checkbox" checked={onlyDiffs} onChange={(e) => setOnlyDiffs(e.target.checked)} className="accent-[#2997ff]" />
                  Only differences
                </label>
              </th>
              {picked.map((m, i) => (
                <th key={m.slug} scope="col" className="p-4 text-left align-bottom font-normal">
                  <span className="mb-2 block h-0.5 w-8 rounded-full" style={{ background: SLOT_COLORS[i] }} />
                  <button onClick={() => openDrawer(m)} className="group flex items-center gap-1 text-left text-base font-semibold text-fg">
                    {m.name}{!m.verified && <sup className="text-ember">†</sup>}
                    <ArrowUpRight className="size-3.5 text-fg-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                  </button>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-fg-3">
                    {m.release_year}{i === 0 && <span className="rounded-pill bg-surface-3 px-1.5 py-px text-[10px]">baseline</span>}
                    {wins[i] > 0 && <span className="flex items-center gap-0.5 text-gain"><Trophy className="size-3" aria-hidden />{wins[i]}</span>}
                  </span>
                  {picked.length > 2 && (
                    <button aria-label={`Remove ${m.name}`} onClick={() => setSelected((c) => toggleSelection(c, m.slug))} className="mt-1 text-fg-3 hover:text-fg">
                      <X className="size-3.5" />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TEXT_ROWS.map(({ key, label }) => {
              const vals = picked.map((m) => String(m[key]))
              const differs = new Set(vals).size > 1
              if (onlyDiffs && !differs) return null
              return (
                <tr key={key} className="border-b border-hairline/60">
                  <th scope="row" className="sticky left-0 bg-surface-1 px-4 py-3 text-left font-normal text-fg-3">{label}</th>
                  {vals.map((v, i) => <td key={i} className={`px-4 py-3 ${differs ? 'text-fg' : 'text-fg-2'}`}>{v}</td>)}
                </tr>
              )
            })}
            {groups.map((group) => {
              const groupRows = rows.filter((r) => r.field.group === group && (!onlyDiffs || new Set(r.result.cells.map((c) => c.value)).size > 1))
              if (!groupRows.length) return null
              return (
                <Fragment key={group}>
                  <tr><th colSpan={picked.length + 1} scope="rowgroup" className="sticky left-0 bg-surface-1 px-4 pb-1 pt-6 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-3">{group}</th></tr>
                  {groupRows.map(({ field, result }) => (
                    <tr key={field.key} className="border-b border-hairline/60">
                      <th scope="row" className="sticky left-0 bg-surface-1 px-4 py-3 text-left font-normal text-fg-3">
                        {field.label}
                        {result.caveat && <span className="block text-[11px] text-ember">{result.caveat}</span>}
                      </th>
                      {result.cells.map((c, i) => (
                        <td key={i} className="px-4 py-3">
                          <span className={`-mx-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 tabular-nums transition-colors duration-300 ${c.isBest ? 'bg-gain/12 font-semibold text-gain' : c.isWorst ? 'text-fg-3' : 'text-fg'}`}>
                            {formatValue(field, c.value)}
                            {c.isBest && <Check className="size-3" aria-label="best" />}
                          </span>
                          {c.deltaPct !== null && c.deltaPct !== 0 && (
                            <span className={`ml-1 text-[11px] tabular-nums ${c.improves === null ? 'text-fg-3' : c.improves ? 'text-gain' : 'text-loss'}`}>
                              {formatDelta(c.deltaPct)}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-3">
        <p>† Pre-release figures. 2008–2014 US prices were 2-year-contract prices.</p>
        <button onClick={() => { setSelected(PRESETS[0].slugs); setOnlyDiffs(false) }} className="flex items-center gap-1 hover:text-fg">
          <RotateCcw className="size-3" aria-hidden /> Reset
        </button>
      </div>

      {/* Spec drawer */}
      <dialog
        ref={dialog}
        onClose={() => setDrawer(null)}
        onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close() }}
        className="glass fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-md rounded-l-card p-0 text-fg backdrop:bg-black/60 backdrop:backdrop-blur-sm open:animate-[drawer_.45s_var(--ease-apple)]"
      >
        {drawer && (
          <div className="flex h-full flex-col p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-fg-3">{drawer.release_year}</p>
                <h3 className="text-title">{drawer.name}</h3>
              </div>
              <button aria-label="Close" onClick={() => dialog.current?.close()} className="rounded-full bg-surface-3 p-1.5 text-fg-2 hover:text-fg"><X className="size-4" /></button>
            </div>
            <dl className="mt-6 divide-y divide-hairline overflow-y-auto text-sm">
              {[
                ['Chip', `${drawer.chip} · ${drawer.process_nm} nm`],
                ['Display', `${drawer.display_in}″ ${drawer.display_tech}`],
                ['Resolution', `${drawer.resolution} @ ${drawer.refresh_hz} Hz`],
                ['Rear cameras', `${drawer.rear_cameras} · ${drawer.main_camera_mp}MP main · ${drawer.max_optical_zoom}× optical`],
                ['Frame', drawer.frame],
                ['Dimensions', `${drawer.height_mm} × ${drawer.width_mm} × ${drawer.depth_mm} mm`],
                ['Weight', `${drawer.weight_g} g`],
                ['Base storage', `${drawer.base_storage_gb} GB`],
                ['Launch price', `$${drawer.launch_price_usd.toLocaleString('en-US')}${drawer.price_basis === 'contract' ? ' on contract' : ''}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-3">
                  <dt className="text-fg-3">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            {!drawer.verified && <p className="mt-4 text-xs text-ember">Pre-release figures; subject to change.</p>}
          </div>
        )}
      </dialog>
    </section>
  )
}
