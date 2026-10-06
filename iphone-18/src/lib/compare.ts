import type { IPhoneModel, NumericKey } from '../data/types'

export type Better = 'higher' | 'lower' | 'neutral'

export interface SpecField {
  key: NumericKey
  label: string
  unit: string
  better: Better
  group: 'Silicon' | 'Display' | 'Camera' | 'Design' | 'Value'
  digits?: number
}

/** The benchmarkable columns, in display order. `better` drives the differential highlight. */
export const SPEC_FIELDS: SpecField[] = [
  { key: 'process_nm', label: 'Process node', unit: 'nm', better: 'lower', group: 'Silicon' },
  { key: 'display_in', label: 'Display', unit: '″', better: 'higher', group: 'Display', digits: 1 },
  { key: 'refresh_hz', label: 'Refresh rate', unit: 'Hz', better: 'higher', group: 'Display' },
  { key: 'rear_cameras', label: 'Rear cameras', unit: '', better: 'higher', group: 'Camera' },
  { key: 'main_camera_mp', label: 'Main camera', unit: 'MP', better: 'higher', group: 'Camera' },
  { key: 'max_optical_zoom', label: 'Optical zoom', unit: '×', better: 'higher', group: 'Camera', digits: 1 },
  { key: 'depth_mm', label: 'Thickness', unit: 'mm', better: 'lower', group: 'Design', digits: 2 },
  { key: 'weight_g', label: 'Weight', unit: 'g', better: 'lower', group: 'Design' },
  { key: 'height_mm', label: 'Height', unit: 'mm', better: 'neutral', group: 'Design', digits: 1 },
  { key: 'base_storage_gb', label: 'Base storage', unit: 'GB', better: 'higher', group: 'Value' },
  { key: 'launch_price_usd', label: 'Launch price', unit: 'USD', better: 'lower', group: 'Value' },
]

export interface CellDiff {
  value: number
  /** Best among the selection (ties all win). Always false for neutral fields or when every value is equal. */
  isBest: boolean
  isWorst: boolean
  /** Signed change vs the baseline (first) model, in percent. null for the baseline itself. */
  deltaPct: number | null
  /** true when the change vs baseline is an improvement under the field's `better` rule. */
  improves: boolean | null
}

export interface Comparable {
  /** Set when a value can't be fairly compared (e.g. contract vs full price). */
  caveat?: string
  cells: CellDiff[]
}

export function compareField(models: IPhoneModel[], field: SpecField): Comparable {
  const values = models.map((m) => m[field.key])
  let caveat: string | undefined
  let better = field.better

  if (field.key === 'launch_price_usd' && new Set(models.map((m) => m.price_basis)).size > 1) {
    caveat = 'Mixes 2-year-contract and full retail prices'
    better = 'neutral'
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const allEqual = max === min
  const best = better === 'higher' ? max : min
  const worst = better === 'higher' ? min : max
  const base = values[0]

  const cells = values.map((value, i): CellDiff => {
    const ranked = better !== 'neutral' && !allEqual
    const deltaPct = i === 0 || base === 0 ? null : ((value - base) / base) * 100
    const improves =
      deltaPct === null || deltaPct === 0 || better === 'neutral'
        ? null
        : better === 'higher' ? deltaPct > 0 : deltaPct < 0
    return {
      value,
      isBest: ranked && value === best,
      isWorst: ranked && models.length > 2 && value === worst,
      deltaPct,
      improves,
    }
  })

  return { caveat, cells }
}

export function formatValue(field: SpecField, value: number): string {
  if (field.key === 'launch_price_usd') return `$${value.toLocaleString('en-US')}`
  if (field.key === 'base_storage_gb' && value >= 1024) return `${value / 1024} TB`
  const n = field.digits ? value.toFixed(field.digits).replace(/\.0+$/, '') : String(value)
  if (!field.unit) return n
  return /^[″×]$/.test(field.unit) ? `${n}${field.unit}` : `${n} ${field.unit}`
}

export function formatDelta(pct: number): string {
  const rounded = Math.abs(pct) < 10 ? pct.toFixed(1) : Math.round(pct).toString()
  return `${pct > 0 ? '+' : ''}${rounded}%`
}

/** Keeps a 2–3 model selection: toggling adds (dropping the oldest past `max`) or removes (never below `min`). */
export function toggleSelection(current: string[], slug: string, min = 2, max = 3): string[] {
  if (current.includes(slug)) return current.length > min ? current.filter((s) => s !== slug) : current
  return [...current, slug].slice(-max)
}
