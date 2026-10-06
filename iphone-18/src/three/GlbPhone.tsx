import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Finish } from './finishes'
import type { PhoneDrive } from './PhoneModel'

/**
 * Drop-in for a production GLB (Draco/Meshopt). Authoring contract, set in Blender:
 *  - materials named "Frame" / "Back" receive the colorway,
 *  - any node with a custom property `explode` (number) slides that far along Z when exploded.
 */
export function GlbPhone({ url, finish, drive }: { url: string; finish: Finish; drive: React.RefObject<PhoneDrive> }) {
  const { scene } = useGLTF(url, true, true)
  const root = useMemo(() => scene.clone(true), [scene])

  const { tinted, movers } = useMemo(() => {
    const tinted: Array<{ mat: THREE.MeshStandardMaterial; role: 'frame' | 'back' }> = []
    const movers: Array<{ node: THREE.Object3D; base: number; k: number }> = []
    root.traverse((o) => {
      if (typeof o.userData.explode === 'number') movers.push({ node: o, base: o.position.z, k: o.userData.explode })
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mat = mesh.material as THREE.MeshStandardMaterial
      const role = /frame/i.test(mat.name) ? 'frame' : /back/i.test(mat.name) ? 'back' : null
      if (role) {
        mesh.material = mat.clone()
        tinted.push({ mat: mesh.material as THREE.MeshStandardMaterial, role })
      }
    })
    return { tinted, movers }
  }, [root])

  useEffect(() => () => tinted.forEach(({ mat }) => mat.dispose()), [tinted])

  const target = useMemo(() => new THREE.Color(), [])
  useFrame((_, dt) => {
    const e = drive.current?.explode ?? 0
    for (const m of movers) m.node.position.z = m.base + m.k * e
    const k = 1 - Math.exp(-dt * 5)
    for (const { mat, role } of tinted) mat.color.lerp(target.set(role === 'frame' ? finish.frame : finish.back), k)
  })

  return <primitive object={root} />
}
