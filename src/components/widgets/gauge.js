// Polar helpers for SVG gauges. Angles are in degrees, 0° = 12 o'clock, clockwise.
export function polar(cx, cy, r, deg) {
  const a = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

export function arcPath(cx, cy, r, from, to) {
  const [x1, y1] = polar(cx, cy, r, from)
  const [x2, y2] = polar(cx, cy, r, to)
  const large = to - from > 180 ? 1 : 0
  return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`
}
