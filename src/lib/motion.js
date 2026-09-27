// Shared Apple-style spring presets.
export const SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }
export const SOFT_SPRING = { type: 'spring', stiffness: 170, damping: 26, mass: 1 }
export const SNAPPY = { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }

// Staggered cross-dissolve for city switches. Opacity is animated per card
// (never on a common ancestor) so each panel's backdrop blur stays intact.
export const pageVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
  exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
}

export const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 240, damping: 28, mass: 0.9 } },
  exit: { opacity: 0, y: -6, scale: 0.985, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
}
