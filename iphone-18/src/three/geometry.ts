import * as THREE from 'three'

/** Phone dimensions in scene units (1 unit = 100 mm), from the 18 Pro Max spec row. */
export const PHONE = {
  w: 0.78,
  h: 1.634,
  d: 0.0875,
  r: 0.125,
} as const

export function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/** Flat rounded-rect plane with UVs normalised to 0–1 (ShapeGeometry's raw UVs are in shape units). */
export function roundedPlane(w: number, h: number, r: number, segments = 16): THREE.ShapeGeometry {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), segments)
  const pos = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5)
  uv.needsUpdate = true
  return g
}

/** Bevelled rounded slab centred on the origin, `depth` along Z. */
export function roundedSlab(w: number, h: number, r: number, depth: number, bevel = 0.006): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(roundedRect(w - bevel * 2, h - bevel * 2, Math.max(0.001, r - bevel)), {
    depth: Math.max(0.0005, depth - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 24,
  })
  g.center()
  return g
}

/** Unibody band: the outer rounded rect with the inner cavity cut out, so internals show when exploded. */
export function frameRing(w: number, h: number, r: number, depth: number, wall: number): THREE.ExtrudeGeometry {
  const bevel = 0.014
  const outer = roundedRect(w - bevel * 2, h - bevel * 2, r - bevel)
  outer.holes.push(roundedRect(w - wall * 2, h - wall * 2, r - wall))
  const g = new THREE.ExtrudeGeometry(outer, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 8,
    curveSegments: 32,
  })
  g.center()
  return g
}
