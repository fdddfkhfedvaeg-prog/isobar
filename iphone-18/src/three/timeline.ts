/**
 * Scroll choreography for the showcase. `p` is scroll progress through the
 * sticky stage (0 → 1). Keyframes are sampled piecewise with smoothstep easing,
 * then the scene damps toward the sample each frame, so fast flicks stay fluid.
 *
 * Phone space: screen faces +Z, rotY = π shows the back (camera plateau).
 */
export type Vec3 = [number, number, number]

export interface Pose {
  cam: Vec3
  target: Vec3
  rotY: number
  rotX: number
  /** 0 = assembled, 1 = fully exploded */
  explode: number
  /** Neural-engine glow, 0–1 */
  chip: number
}

export interface Keyframe extends Pose { t: number; label: string }

const PI = Math.PI

export const KEYFRAMES: Keyframe[] = [
  { t: 0.0, label: 'Arrival', cam: [0, 0.3, 9], target: [0, 0, 0], rotY: PI - 0.55, rotX: 0.18, explode: 0, chip: 0 },
  { t: 0.12, label: 'Hero', cam: [0, 0, 3.7], target: [0, 0, 0], rotY: PI - 0.35, rotX: 0.06, explode: 0, chip: 0 },
  { t: 0.4, label: '360°', cam: [0, 0, 3.7], target: [0, 0, 0], rotY: 3 * PI - 0.35, rotX: 0.06, explode: 0, chip: 0 },
  { t: 0.5, label: 'Three-quarter', cam: [2.6, 0.95, 3.2], target: [-0.25, 0.05, 0.22], rotY: 3 * PI - 0.7, rotX: 0, explode: 0.15, chip: 0.2 },
  { t: 0.64, label: 'Exploded', cam: [3.4, 1.25, 3.7], target: [-0.4, 0, 0.36], rotY: 3 * PI - 0.95, rotX: 0, explode: 1, chip: 1 },
  { t: 0.72, label: 'Exploded hold', cam: [3.4, 1.25, 3.7], target: [-0.4, 0, 0.36], rotY: 3 * PI - 0.95, rotX: 0, explode: 1, chip: 1 },
  { t: 0.84, label: 'Camera close-up', cam: [0.35, 0.85, 1.55], target: [-0.12, 0.55, 0], rotY: 3 * PI - 0.18, rotX: 0.05, explode: 0, chip: 0.1 },
  { t: 1.0, label: 'Display', cam: [0, 0, 3.9], target: [0, 0, 0], rotY: 4 * PI - 0.22, rotX: 0.04, explode: 0, chip: 0 },
]

/** Copy-overlay beats, shown while p is inside [from, to). */
export const BEATS = [
  { from: 0.08, to: 0.17, eyebrow: 'Pro, reforged', title: 'Forged in light.' },
  { from: 0.18, to: 0.38, eyebrow: 'Aluminum unibody', title: 'One piece. Every angle.' },
  { from: 0.5, to: 0.74, eyebrow: 'Inside', title: 'A20 Pro on a 2 nm process.' },
  { from: 0.78, to: 0.92, eyebrow: 'Pro camera system', title: 'Three 48MP eyes.' },
] as const

const smooth = (x: number) => x * x * (3 - 2 * x)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

export function samplePose(p: number, frames: Keyframe[] = KEYFRAMES): Pose {
  const x = Math.min(1, Math.max(0, p))
  let i = 0
  while (i < frames.length - 2 && x > frames[i + 1].t) i++
  const a = frames[i]
  const b = frames[i + 1]
  const t = smooth(b.t === a.t ? 1 : (x - a.t) / (b.t - a.t))
  return {
    cam: lerp3(a.cam, b.cam, t),
    target: lerp3(a.target, b.target, t),
    rotY: lerp(a.rotY, b.rotY, t),
    rotX: lerp(a.rotX, b.rotX, t),
    explode: lerp(a.explode, b.explode, t),
    chip: lerp(a.chip, b.chip, t),
  }
}

/** Mutable progress shared between the DOM scroll listener and the render loop (no React re-renders). */
export const scrollState = { progress: 0 }
