/**
 * Exploded-view callouts. The DOM nodes live in the page overlay (<PartLabels>);
 * PhoneModel projects its 3D anchors to screen space each frame and writes the
 * transforms directly, so labels cost no React renders and no extra roots.
 */
export const PART_LABELS = [
  { id: 'display', title: 'ProMotion XDR', sub: '6.9″ · 120 Hz' },
  { id: 'chip', title: 'A20 Pro', sub: '2 nm · Neural Engine' },
  { id: 'battery', title: 'Battery', sub: 'stacked cell' },
  { id: 'camera', title: 'Pro Fusion camera', sub: '48MP × 3' },
] as const

export type PartId = (typeof PART_LABELS)[number]['id']

export const labelNodes: Partial<Record<PartId, HTMLElement | null>> = {}
