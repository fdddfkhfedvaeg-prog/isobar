/** Colorways and lighting studios for the customizer. Hex values are material base colors, tuned under the Studio rig. */
export interface Finish {
  id: string
  name: string
  /** Metal frame */
  frame: string
  /** Frosted back */
  back: string
  /** Swatch shown in the UI */
  swatch: string
}

export const FINISHES: Finish[] = [
  { id: 'ember', name: 'Ember Orange', frame: '#c4612f', back: '#d9774a', swatch: '#e07a45' },
  { id: 'abyss', name: 'Abyss Blue', frame: '#2b3a55', back: '#34476a', swatch: '#3a4f78' },
  { id: 'silver', name: 'Silver', frame: '#c9cacc', back: '#e4e4e2', swatch: '#e2e2e0' },
  { id: 'obsidian', name: 'Obsidian', frame: '#2a2a2c', back: '#1f1f21', swatch: '#2c2c2e' },
]

export type StudioId = 'studio' | 'golden' | 'noir'

export interface Studio {
  id: StudioId
  name: string
  background: string
  exposure: number
  /** Base color of the reflection environment: keeps bare metal from mirroring pure black. */
  envBase: string
  key: { color: string; intensity: number; position: [number, number, number] }
  rim: { color: string; intensity: number; position: [number, number, number] }
  /** Environment light-former panels: [color, intensity, position, scale] */
  panels: Array<{ color: string; intensity: number; position: [number, number, number]; scale: [number, number, number]; rotY?: number }>
}

export const STUDIOS: Studio[] = [
  {
    id: 'studio', name: 'Studio', background: '#000000', exposure: 1.0, envBase: '#151518',
    key: { color: '#ffffff', intensity: 2.2, position: [3, 4, 5] },
    rim: { color: '#9ec5ff', intensity: 1.4, position: [-4, 2, -4] },
    panels: [
      { color: '#ffffff', intensity: 3, position: [0, 4, 2], scale: [8, 1.5, 1] },
      { color: '#ffffff', intensity: 1.6, position: [-5, 1, 0], scale: [3, 6, 1], rotY: Math.PI / 2 },
      { color: '#ffffff', intensity: 1.6, position: [5, 1, 0], scale: [3, 6, 1], rotY: -Math.PI / 2 },
      { color: '#cfe2ff', intensity: 0.8, position: [0, -3, -4], scale: [8, 2, 1] },
      { color: '#ffffff', intensity: 0.4, position: [0, 1, 7], scale: [16, 9, 1], rotY: Math.PI },
      { color: '#ffffff', intensity: 0.4, position: [0, 1, -7], scale: [16, 9, 1] },
    ],
  },
  {
    id: 'golden', name: 'Golden hour', background: '#0a0603', exposure: 1.1, envBase: '#170e08',
    key: { color: '#ffbf80', intensity: 2.8, position: [5, 2, 3] },
    rim: { color: '#ff6a3d', intensity: 2.0, position: [-4, 1, -3] },
    panels: [
      { color: '#ffb36b', intensity: 4, position: [6, 1, 1], scale: [2, 6, 1], rotY: -Math.PI / 2 },
      { color: '#ff7a3d', intensity: 1.5, position: [-5, 0, -2], scale: [3, 5, 1], rotY: Math.PI / 2 },
      { color: '#3a2a20', intensity: 1, position: [0, 4, 0], scale: [8, 1, 1] },
      { color: '#ffd2a8', intensity: 0.35, position: [2, 1, 7], scale: [16, 9, 1], rotY: Math.PI },
      { color: '#ffd2a8', intensity: 0.35, position: [2, 1, -7], scale: [16, 9, 1] },
    ],
  },
  {
    id: 'noir', name: 'Noir', background: '#000000', exposure: 0.85, envBase: '#101216',
    key: { color: '#ffffff', intensity: 3.2, position: [-2, 5, 4] },
    rim: { color: '#2997ff', intensity: 3.0, position: [4, -1, -4] },
    panels: [
      { color: '#ffffff', intensity: 5, position: [-1, 5, 1], scale: [1, 8, 1] },
      { color: '#2997ff', intensity: 2.5, position: [5, 0, -3], scale: [1, 5, 1], rotY: -Math.PI / 2 },
      { color: '#ffffff', intensity: 0.8, position: [-2, 2, 7], scale: [1.2, 6, 1], rotY: Math.PI },
      { color: '#ffffff', intensity: 0.8, position: [-2, 2, -7], scale: [1.2, 6, 1] },
    ],
  },
]
