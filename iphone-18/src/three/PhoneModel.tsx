import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Finish } from './finishes'
import { PHONE, frameRing, roundedPlane, roundedSlab } from './geometry'
import { labelNodes, type PartId } from './labels'
import { brushedRoughness, screenTexture } from './textures'

export interface PhoneDrive {
  /** 0 = assembled, 1 = exploded. Written by the camera rig every frame. */
  explode: number
  chip: number
}

const { w: W, h: H, d: D, r: R } = PHONE
const LENS_R = 0.074
/** Lens centres on the back, in phone-local XY (back view mirrors X). */
const LENSES: Array<[number, number]> = [[0.235, 0.63], [0.235, 0.43], [0.075, 0.53]]

/** Per-layer Z offset at full explode. Order front → back. */
const EXPLODE = { display: 0.62, board: 0.26, chip: 0.34, battery: -0.04, magsafe: -0.3, back: -0.48, plateau: -0.68 }

const damp = THREE.MathUtils.damp

export function PhoneModel({ finish, drive, showLabels = true }: { finish: Finish; drive: React.RefObject<PhoneDrive>; showLabels?: boolean }) {
  // ---- materials (created once, mutated for colorway changes) ----
  const mats = useMemo(() => {
    const brushed = brushedRoughness()
    const frame = new THREE.MeshPhysicalMaterial({
      color: finish.frame,
      metalness: 1,
      roughness: 0.34,
      roughnessMap: brushed,
      anisotropy: 0.75,
      anisotropyRotation: Math.PI / 2,
      clearcoat: 0.25,
      clearcoatRoughness: 0.3,
    })
    const back = new THREE.MeshPhysicalMaterial({
      color: finish.back,
      metalness: 0.15,
      roughness: 0.52,
      clearcoat: 1,
      clearcoatRoughness: 0.45,
      sheen: 0.3,
      sheenRoughness: 0.8,
    })
    const plateau = frame.clone()
    plateau.roughness = 0.22
    const lensGlass = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      metalness: 0,
      roughness: 0,
      transmission: 1,
      thickness: 0.02,
      ior: 1.52,
      clearcoat: 1,
      clearcoatRoughness: 0,
      specularIntensity: 1,
    })
    const lensCoating = new THREE.MeshPhysicalMaterial({
      color: '#05060c',
      metalness: 0.4,
      roughness: 0.06,
      iridescence: 1,
      iridescenceIOR: 1.85,
      iridescenceThicknessRange: [180, 620],
      clearcoat: 1,
    })
    const black = new THREE.MeshStandardMaterial({ color: '#050506', roughness: 0.35, metalness: 0.2 })
    const screen = new THREE.MeshStandardMaterial({
      color: '#000',
      emissive: '#ffffff',
      emissiveMap: screenTexture('rgba(255,122,61,0.85)'),
      emissiveIntensity: 1.15,
      roughness: 0.25,
      toneMapped: false,
    })
    const coverGlass = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.12,
      roughness: 0.02,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0,
      depthWrite: false,
    })
    const pcb = new THREE.MeshStandardMaterial({ color: '#0e1612', roughness: 0.55, metalness: 0.35 })
    const shield = new THREE.MeshStandardMaterial({ color: '#9a9ca0', roughness: 0.28, metalness: 1 })
    const die = new THREE.MeshStandardMaterial({ color: '#0b0b0c', emissive: '#2997ff', emissiveIntensity: 0.2, roughness: 0.2, metalness: 0.6, toneMapped: false })
    const battery = new THREE.MeshStandardMaterial({ color: '#1d1d20', roughness: 0.62, metalness: 0.35 })
    const magsafe = new THREE.MeshStandardMaterial({ color: '#d0d0d4', roughness: 0.3, metalness: 1, emissive: '#2997ff', emissiveIntensity: 0 })
    return { frame, back, plateau, lensGlass, lensCoating, black, screen, coverGlass, pcb, shield, die, battery, magsafe }
  }, []) // created once; colorway changes are eased in useFrame

  useEffect(() => () => {
    for (const m of Object.values(mats)) {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose()
      m.dispose()
    }
  }, [mats])

  // ---- geometry ----
  const geo = useMemo(() => {
    const plateauH = 0.42
    return {
      frame: frameRing(W, H, R, D, 0.022),
      displayModule: roundedSlab(W - 0.022, H - 0.022, R - 0.012, 0.012, 0.003),
      screen: roundedPlane(W - 0.05, H - 0.05, R - 0.03),
      cover: roundedPlane(W - 0.018, H - 0.018, R - 0.01),
      back: roundedSlab(W - 0.016, H - 0.016, R - 0.008, 0.012, 0.004),
      plateau: roundedSlab(W - 0.03, plateauH, 0.1, 0.03, 0.012),
      plateauH,
      lensRing: new THREE.CylinderGeometry(LENS_R, LENS_R * 1.02, 0.024, 48),
      lensBarrel: new THREE.CylinderGeometry(LENS_R * 0.82, LENS_R * 0.82, 0.026, 48),
      disc: new THREE.CircleGeometry(1, 48),
      board: roundedSlab(0.62, 0.56, 0.06, 0.012, 0.003),
      chip: roundedSlab(0.17, 0.17, 0.018, 0.014, 0.003),
      dieTop: new THREE.PlaneGeometry(0.11, 0.11),
      battery: roundedSlab(0.64, 0.86, 0.05, 0.045, 0.008),
      magsafe: new THREE.TorusGeometry(0.2, 0.007, 12, 96),
    }
  }, [])

  useEffect(() => () => {
    for (const g of Object.values(geo)) if (g instanceof THREE.BufferGeometry) g.dispose()
  }, [geo])

  // ---- refs for animated layers ----
  const display = useRef<THREE.Group>(null!)
  const board = useRef<THREE.Group>(null!)
  const chip = useRef<THREE.Group>(null!)
  const battery = useRef<THREE.Mesh>(null!)
  const magsafe = useRef<THREE.Mesh>(null!)
  const back = useRef<THREE.Mesh>(null!)
  const plateau = useRef<THREE.Group>(null!)
  const internals = useRef<THREE.Group>(null!)
  const chipLight = useRef<THREE.PointLight>(null!)
  const anchors = useRef<Partial<Record<PartId, THREE.Object3D | null>>>({})
  const camera = useThree((st) => st.camera)
  const size = useThree((st) => st.size)
  const tmp = useMemo(() => new THREE.Vector3(), [])

  const targetFrame = useMemo(() => new THREE.Color(), [])
  const targetBack = useMemo(() => new THREE.Color(), [])

  useFrame((state, dt) => {
    const e = drive.current?.explode ?? 0
    const glow = drive.current?.chip ?? 0
    const z = (base: number, k: number) => base + k * e

    display.current.position.z = z(D / 2 - 0.0045, EXPLODE.display)
    board.current.position.z = z(0.004, EXPLODE.board)
    chip.current.position.z = z(0.02, EXPLODE.chip - EXPLODE.board)
    battery.current.position.z = z(-0.004, EXPLODE.battery)
    magsafe.current.position.z = z(-D / 2 + 0.02, EXPLODE.magsafe)
    back.current.position.z = z(-D / 2 + 0.0045, EXPLODE.back)
    plateau.current.position.z = z(-D / 2 - 0.012, EXPLODE.plateau)
    // Internals are hidden inside the shell when assembled: skip drawing them.
    internals.current.visible = e > 0.01

    // Colorway transition: ease the base colors instead of snapping.
    targetFrame.set(finish.frame)
    targetBack.set(finish.back)
    const k = 1 - Math.exp(-dt * 5)
    mats.frame.color.lerp(targetFrame, k)
    mats.plateau.color.lerp(targetFrame, k)
    mats.back.color.lerp(targetBack, k)

    const t = state.clock.elapsedTime
    mats.die.emissiveIntensity = damp(mats.die.emissiveIntensity, 0.2 + glow * (3.2 + Math.sin(t * 3) * 0.6), 6, dt)
    mats.magsafe.emissiveIntensity = glow * 0.6
    chipLight.current.intensity = mats.die.emissiveIntensity * 0.12

    // Project callout anchors to screen space.
    const opacity = showLabels ? THREE.MathUtils.smoothstep(e, 0.55, 0.9) : 0
    for (const [id, anchor] of Object.entries(anchors.current) as Array<[PartId, THREE.Object3D | null]>) {
      const el = labelNodes[id]
      if (!el || !anchor) continue
      el.style.opacity = String(opacity)
      if (opacity === 0) continue
      anchor.getWorldPosition(tmp).project(camera)
      const x = (tmp.x * 0.5 + 0.5) * size.width
      const y = (-tmp.y * 0.5 + 0.5) * size.height
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`
    }
  })

  const anchor = (id: PartId) => (o: THREE.Object3D | null) => { anchors.current[id] = o }

  return (
    <group>
      {/* Chassis band */}
      <mesh geometry={geo.frame} material={mats.frame} castShadow />

      <group ref={internals}>
        {/* Logic board with A20 Pro */}
        <group ref={board} position-y={0.47}>
          <mesh geometry={geo.board} material={mats.pcb} />
          <mesh position={[-0.2, 0.12, 0.012]} material={mats.shield}><boxGeometry args={[0.14, 0.2, 0.012]} /></mesh>
          <mesh position={[0.2, -0.14, 0.012]} material={mats.shield}><boxGeometry args={[0.16, 0.14, 0.012]} /></mesh>
          <group ref={chip} position={[0.04, 0.02, 0]}>
            <mesh geometry={geo.chip} material={mats.shield} />
            <mesh geometry={geo.dieTop} material={mats.die} position-z={0.0075} />
            <pointLight ref={chipLight} color="#2997ff" intensity={0} distance={0.7} decay={2} position-z={0.05} />
            <object3D position={[0.36, 0.1, 0]} ref={anchor('chip')} />
          </group>
        </group>

        <mesh ref={battery} geometry={geo.battery} material={mats.battery} position-y={-0.3}>
          <object3D position={[-0.44, -0.2, 0]} ref={anchor('battery')} />
        </mesh>

        <mesh ref={magsafe} geometry={geo.magsafe} material={mats.magsafe} position-y={-0.16} />
      </group>

      {/* Frosted back */}
      <mesh ref={back} geometry={geo.back} material={mats.back} rotation-y={Math.PI} />

      {/* Camera plateau + lenses, facing −Z */}
      <group ref={plateau} position-y={H / 2 - 0.035 - geo.plateauH / 2}>
        <mesh geometry={geo.plateau} material={mats.plateau} />
        <group position-y={-(H / 2 - 0.035 - geo.plateauH / 2)}>
          {LENSES.map(([x, y], i) => (
            <group key={i} position={[x, y, -0.02]}>
              <mesh geometry={geo.lensRing} material={mats.frame} rotation-x={Math.PI / 2} position-z={-0.008} />
              <mesh geometry={geo.lensBarrel} material={mats.black} rotation-x={Math.PI / 2} position-z={-0.01} />
              <mesh geometry={geo.disc} material={mats.lensCoating} scale={LENS_R * 0.55} position-z={-0.0235} rotation-y={Math.PI} />
              <mesh geometry={geo.disc} material={mats.lensGlass} scale={LENS_R * 0.86} position-z={-0.0245} rotation-y={Math.PI} />
            </group>
          ))}
          {/* Flash + LiDAR */}
          <mesh geometry={geo.disc} material={mats.shield} scale={0.03} position={[-0.25, 0.62, -0.016]} rotation-y={Math.PI} />
          <mesh geometry={geo.disc} material={mats.black} scale={0.03} position={[-0.25, 0.44, -0.016]} rotation-y={Math.PI} />
          <object3D position={[0.1, 0.78, -0.03]} ref={anchor('camera')} />
        </group>
      </group>
      {/* Display stack: OLED module, emissive panel, cover glass (last: the cover is transparent) */}
      <group ref={display}>
        <mesh geometry={geo.displayModule} material={mats.black} />
        <mesh geometry={geo.screen} material={mats.screen} position-z={0.0065} />
        <mesh geometry={geo.cover} material={mats.coverGlass} position-z={0.0075} />
        <object3D position={[0.46, -0.55, 0]} ref={anchor('display')} />
      </group>

    </group>
  )
}
