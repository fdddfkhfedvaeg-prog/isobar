import { AdaptiveDpr, Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { captureMessage } from '../lib/observability'
import { GlbPhone } from './GlbPhone'
import { PhoneModel, type PhoneDrive } from './PhoneModel'
import type { Finish, Studio } from './finishes'
import { samplePose, scrollState } from './timeline'

const GLB_URL = import.meta.env.VITE_PHONE_GLB_URL

interface StageProps {
  finish: Finish
  studio: Studio
  /** Pauses the render loop (e.g. when the stage is scrolled off-screen). */
  active: boolean
  reducedMotion: boolean
  onContextLost: () => void
}

export default function Stage({ finish, studio, active, reducedMotion, onContextLost }: StageProps) {
  const [dpr, setDpr] = useState(() => Math.min(2, window.devicePixelRatio))
  const drive = useRef<PhoneDrive>({ explode: 0, chip: 0 })

  return (
    <Canvas
      className="!absolute inset-0"
      frameloop={active ? 'always' : 'never'}
      dpr={dpr}
      camera={{ fov: 30, near: 0.05, far: 50, position: [0, 0.3, 9] }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          captureMessage('webgl context lost', { area: 'stage' })
          onContextLost()
        })
      }}
    >
      {/* Drop DPR when the GPU can't hold frame rate, restore when it recovers. */}
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(1, d - 0.5))}
        onIncline={() => setDpr((d) => Math.min(Math.min(2, window.devicePixelRatio), d + 0.25))}
        flipflops={3}
        onFallback={() => setDpr(1)}
      />
      <AdaptiveDpr pixelated={false} />

      <color attach="background" args={[studio.background]} />
      <Exposure value={studio.exposure} />

      <LightRig studio={studio} />

      <Rig drive={drive} reducedMotion={reducedMotion}>
        {GLB_URL ? (
          <Suspense fallback={<PhoneModel finish={finish} drive={drive} />}>
            <GlbPhone url={GLB_URL} finish={finish} drive={drive} />
          </Suspense>
        ) : (
          <PhoneModel finish={finish} drive={drive} />
        )}
      </Rig>

    </Canvas>
  )
}

function Exposure({ value }: { value: number }) {
  const gl = useThree((s) => s.gl)
  useFrame((_, dt) => { gl.toneMappingExposure = THREE.MathUtils.damp(gl.toneMappingExposure, value, 4, dt) })
  return null
}

/**
 * Three-point rig plus an environment built from Lightformers: reflections
 * come from soft-box panels rendered once into a cube map, so there is no HDRI
 * download and the look switches instantly between studios.
 */
function LightRig({ studio }: { studio: Studio }) {
  const key = useRef<THREE.DirectionalLight>(null!)
  const rim = useRef<THREE.DirectionalLight>(null!)
  const keyColor = useMemo(() => new THREE.Color(), [])
  const rimColor = useMemo(() => new THREE.Color(), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 4)
    key.current.color.lerp(keyColor.set(studio.key.color), k)
    rim.current.color.lerp(rimColor.set(studio.rim.color), k)
    key.current.intensity = THREE.MathUtils.damp(key.current.intensity, studio.key.intensity, 4, dt)
    rim.current.intensity = THREE.MathUtils.damp(rim.current.intensity, studio.rim.intensity, 4, dt)
    key.current.position.lerp(tmp.set(...studio.key.position), k)
    rim.current.position.lerp(tmp.set(...studio.rim.position), k)
  })

  return (
    <>
      <ambientLight intensity={0.08} />
      <directionalLight ref={key} position={studio.key.position} intensity={studio.key.intensity} />
      <directionalLight ref={rim} position={studio.rim.position} intensity={studio.rim.intensity} />
      <Environment key={studio.id} resolution={256} frames={1}>
        <color attach="background" args={[studio.envBase]} />
        {studio.panels.map((p, i) => (
          <Lightformer key={i} form="rect" color={p.color} intensity={p.intensity} position={p.position} scale={p.scale} rotation-y={p.rotY ?? 0} />
        ))}
      </Environment>
    </>
  )
}

/** Drives camera + phone transform from scroll progress, with damping, pointer parallax and drag-to-spin. */
function Rig({ drive, reducedMotion, children }: { drive: React.RefObject<PhoneDrive>; reducedMotion: boolean; children: React.ReactNode }) {
  const phone = useRef<THREE.Group>(null!)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const lookAt = useMemo(() => new THREE.Vector3(), [])
  const drag = useRef({ active: false, lastX: 0, yaw: 0 })

  useEffect(() => {
    const el = gl.domElement
    const down = (e: PointerEvent) => { drag.current.active = true; drag.current.lastX = e.clientX }
    const move = (e: PointerEvent) => {
      if (!drag.current.active) return
      drag.current.yaw += (e.clientX - drag.current.lastX) * 0.01
      drag.current.lastX = e.clientX
    }
    const up = () => { drag.current.active = false }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [gl])

  useFrame((state, dt) => {
    const pose = samplePose(scrollState.progress)
    // Portrait viewports: pull the camera back so the phone's height still fits,
    // and aim slightly higher so the phone sits below the headline.
    const portrait = size.width < size.height ? 1 - size.width / size.height : 0
    const fit = 1 + 0.9 * portrait
    const lift = 0.4 * portrait
    const lambda = reducedMotion ? 1000 : 5
    const d = (a: number, b: number) => THREE.MathUtils.damp(a, b, lambda, dt)

    camera.position.set(d(camera.position.x, pose.cam[0] * fit), d(camera.position.y, pose.cam[1] * fit), d(camera.position.z, pose.cam[2] * fit))
    lookAt.set(d(lookAt.x, pose.target[0]), d(lookAt.y, pose.target[1] + lift), d(lookAt.z, pose.target[2]))
    camera.lookAt(lookAt)

    // Released drags spring back to the choreographed angle.
    if (!drag.current.active) drag.current.yaw = THREE.MathUtils.damp(drag.current.yaw, 0, 2.5, dt)
    const parallax = reducedMotion ? 0 : (1 - pose.explode) * 0.12
    phone.current.rotation.y = d(phone.current.rotation.y, pose.rotY + drag.current.yaw + state.pointer.x * parallax)
    phone.current.rotation.x = d(phone.current.rotation.x, pose.rotX - state.pointer.y * parallax * 0.5)
    // Idle float
    phone.current.position.y = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.8) * 0.015

    drive.current.explode = d(drive.current.explode, pose.explode)
    drive.current.chip = d(drive.current.chip, pose.chip)
  })

  return <group ref={phone}>{children}</group>
}
