import { describe, expect, it } from 'vitest'
import { LINEAGE } from '../data/lineage'
import { SPEC_FIELDS, compareField, formatDelta, formatValue, toggleSelection } from './compare'

const bySlug = (s: string) => LINEAGE.find((m) => m.slug === s)!
const field = (k: string) => SPEC_FIELDS.find((f) => f.key === k)!

describe('compareField', () => {
  it('marks the higher value best for higher-is-better fields', () => {
    const r = compareField([bySlug('iphone-x'), bySlug('iphone-15-pro-max')], field('main_camera_mp'))
    expect(r.cells.map((c) => c.isBest)).toEqual([false, true])
    expect(r.cells[1].deltaPct).toBe(300)
    expect(r.cells[1].improves).toBe(true)
  })

  it('marks the lower value best for lower-is-better fields', () => {
    const r = compareField([bySlug('iphone-15-pro-max'), bySlug('iphone-air')], field('depth_mm'))
    expect(r.cells[1].isBest).toBe(true)
    expect(r.cells[1].improves).toBe(true)
  })

  it('does not rank when all values are equal', () => {
    const r = compareField([bySlug('iphone-16-pro-max'), bySlug('iphone-17-pro-max')], field('display_in'))
    expect(r.cells.some((c) => c.isBest)).toBe(false)
  })

  it('refuses to rank contract against full retail prices', () => {
    const r = compareField([bySlug('iphone-6'), bySlug('iphone-x')], field('launch_price_usd'))
    expect(r.caveat).toBeDefined()
    expect(r.cells.some((c) => c.isBest)).toBe(false)
  })

  it('flags the worst only with three or more models', () => {
    const r = compareField([bySlug('iphone'), bySlug('iphone-x'), bySlug('iphone-15-pro-max')], field('weight_g'))
    expect(r.cells.map((c) => c.isWorst)).toEqual([false, false, true])
  })
})

describe('toggleSelection', () => {
  it('adds up to three, then drops the oldest', () => {
    expect(toggleSelection(['a', 'b', 'c'], 'd')).toEqual(['b', 'c', 'd'])
  })
  it('never drops below two', () => {
    expect(toggleSelection(['a', 'b'], 'a')).toEqual(['a', 'b'])
    expect(toggleSelection(['a', 'b', 'c'], 'a')).toEqual(['b', 'c'])
  })
})

describe('format', () => {
  it('formats values and deltas', () => {
    expect(formatValue(field('launch_price_usd'), 1199)).toBe('$1,199')
    expect(formatValue(field('display_in'), 6.9)).toBe('6.9″')
    expect(formatValue(field('weight_g'), 231)).toBe('231 g')
    expect(formatDelta(4.25)).toBe('+4.3%')
    expect(formatDelta(-300)).toBe('-300%')
  })
})
