// Apple-style temperature palette (°C stops): cold indigo → blue → cyan →
// green → yellow → orange → red.
const STOPS = [
  [-15, [94, 92, 230]],
  [-3, [10, 132, 255]],
  [6, [100, 210, 255]],
  [13, [102, 212, 160]],
  [19, [212, 225, 87]],
  [24, [255, 214, 10]],
  [30, [255, 159, 10]],
  [37, [255, 69, 58]],
]

export function tempRGB(c) {
  if (c <= STOPS[0][0]) return STOPS[0][1]
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i]
    if (c <= t1) {
      const [t0, c0] = STOPS[i - 1]
      const k = (c - t0) / (t1 - t0)
      return c0.map((v, j) => Math.round(v + (c1[j] - v) * k))
    }
  }
  return STOPS[STOPS.length - 1][1]
}

export const tempColor = (c) => `rgb(${tempRGB(c).join(',')})`

/** Gradient stops for a bar spanning [min, max] °C. */
export function tempGradient(min, max) {
  const steps = 5
  const parts = []
  for (let i = 0; i <= steps; i++) {
    const t = min + ((max - min) * i) / steps
    parts.push(`${tempColor(t)} ${(i / steps) * 100}%`)
  }
  return `linear-gradient(90deg, ${parts.join(', ')})`
}
