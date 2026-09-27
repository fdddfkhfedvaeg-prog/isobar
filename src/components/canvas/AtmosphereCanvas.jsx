import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { FRAGMENT, VERTEX } from './shader'
import { sceneCss, sceneFor } from './scenes'

const SCALARS = ['sun', 'stars', 'cloud', 'fog', 'rain', 'snow', 'storm']
const UNIFORMS = ['uRes', 'uTime', 'uPointer', 'uTop', 'uBottom', 'uCloudCol', 'uSun', 'uStars', 'uCloud', 'uFog', 'uRain', 'uSnow', 'uFlash']

function compile(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader error')
  return s
}

function createProgram(gl) {
  const prog = gl.createProgram()
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERTEX))
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link error')
  return prog
}

/**
 * Full-screen living sky. Weather changes never cut: every parameter eases
 * toward its new target each frame, so switching cities cross-dissolves the
 * atmosphere itself.
 */
export default function AtmosphereCanvas({ group = 'clear', isDay = true, ready = true }) {
  const canvasRef = useRef(null)
  const target = useRef(sceneFor(group, isDay))
  const snap = useRef(false) // jump (not ease) to the first real scene
  const snapped = useRef(false)
  const [fallback, setFallback] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    target.current = sceneFor(group, isDay)
    if (ready && !snapped.current) {
      snapped.current = true
      snap.current = true
    }
  }, [group, isDay, ready])

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
    if (!gl) {
      setFallback(true)
      return
    }
    let prog
    try {
      prog = createProgram(gl)
    } catch (e) {
      console.warn('[atmosphere] WebGL unavailable, using CSS sky', e)
      setFallback(true)
      return
    }
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u = Object.fromEntries(UNIFORMS.map((n) => [n, gl.getUniformLocation(prog, n)]))

    const cur = structuredClone(target.current)
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    let flash = 0
    let nextFlash = 3 + Math.random() * 6
    let raf = 0
    let last = performance.now()
    let elapsed = Math.random() * 100

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    const onPointer = (e) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2
      pointer.ty = -(e.clientY / window.innerHeight - 0.5) * 2
    }
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointer, { passive: true })

    const frame = (t) => {
      const dt = Math.min(0.1, (t - last) / 1000)
      last = t
      elapsed += reduceMotion ? dt * 0.15 : dt
      const tg = target.current
      const k = snap.current ? 1 : 1 - Math.exp(-dt * 1.6) // exponential easing toward target
      snap.current = false
      for (const key of ['top', 'bottom', 'cloudColor']) for (let i = 0; i < 3; i++) cur[key][i] += (tg[key][i] - cur[key][i]) * k
      for (const key of SCALARS) cur[key] += (tg[key] - cur[key]) * k
      pointer.x += (pointer.tx - pointer.x) * k * 1.5
      pointer.y += (pointer.ty - pointer.y) * k * 1.5

      if (cur.storm > 0.5 && !reduceMotion) {
        nextFlash -= dt
        if (nextFlash <= 0) {
          flash = 0.55 + Math.random() * 0.35
          nextFlash = 4 + Math.random() * 9
        }
      }
      flash *= Math.exp(-dt * 7)

      gl.uniform2f(u.uRes, canvas.width, canvas.height)
      gl.uniform1f(u.uTime, elapsed)
      gl.uniform2f(u.uPointer, pointer.x, pointer.y)
      gl.uniform3fv(u.uTop, cur.top)
      gl.uniform3fv(u.uBottom, cur.bottom)
      gl.uniform3fv(u.uCloudCol, cur.cloudColor)
      gl.uniform1f(u.uSun, cur.sun)
      gl.uniform1f(u.uStars, cur.stars)
      gl.uniform1f(u.uCloud, cur.cloud)
      gl.uniform1f(u.uFog, cur.fog)
      gl.uniform1f(u.uRain, cur.rain)
      gl.uniform1f(u.uSnow, cur.snow)
      gl.uniform1f(u.uFlash, flash)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (document.visibilityState === 'visible') {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', onVisibility)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
    }
  }, [reduceMotion])

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden">
      {fallback ? (
        <div className="absolute inset-0 transition-[background] duration-1000" style={{ background: sceneCss(sceneFor(group, isDay)) }} />
      ) : (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      )}
      {/* Legibility scrim: keeps white type readable over bright skies. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/35" />
    </div>
  )
}
