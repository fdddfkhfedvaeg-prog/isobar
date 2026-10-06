import * as THREE from 'three'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

/**
 * Brushed-metal roughness map: fine horizontal streaks. Combined with
 * MeshPhysicalMaterial.anisotropy it gives the stretched highlight of
 * bead-blasted / brushed aluminium without shipping a texture file.
 */
export function brushedRoughness(): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 512)
  ctx.fillStyle = '#7a7a7a'
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 2600; i++) {
    const y = Math.random() * 512
    const v = 90 + Math.random() * 80
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.12 + Math.random() * 0.25})`
    ctx.lineWidth = Math.random() * 1.2
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(512, y + (Math.random() - 0.5) * 2)
    ctx.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(4, 4)
  t.anisotropy = 8
  return t
}

/** Lock-screen wallpaper with time and Dynamic Island, used as the display's emissive map. */
export function screenTexture(accent: string): THREE.CanvasTexture {
  const W = 660
  const H = 1434
  const [c, ctx] = canvas(W, H)

  ctx.fillStyle = '#020204'
  ctx.fillRect(0, 0, W, H)
  const glow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  glow(W * 0.2, H * 0.78, W * 0.95, accent)
  glow(W * 0.95, H * 0.35, W * 0.7, 'rgba(41,151,255,0.55)')
  glow(W * 0.5, H * 1.05, W * 0.6, 'rgba(255,255,255,0.18)')

  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.textAlign = 'center'
  ctx.font = '600 34px Inter, system-ui, sans-serif'
  ctx.fillText('Tuesday, October 6', W / 2, 250)
  ctx.font = '700 190px Inter, system-ui, sans-serif'
  ctx.fillText('9:41', W / 2, 430)

  // Dynamic Island
  ctx.fillStyle = '#000'
  const iw = 190
  const ih = 56
  ctx.beginPath()
  ctx.roundRect(W / 2 - iw / 2, 38, iw, ih, ih / 2)
  ctx.fill()

  // Home indicator
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.beginPath()
  ctx.roundRect(W / 2 - 110, H - 32, 220, 10, 5)
  ctx.fill()

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}
