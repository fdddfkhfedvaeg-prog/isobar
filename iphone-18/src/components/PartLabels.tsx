import { PART_LABELS, labelNodes } from '../three/labels'

export function PartLabels() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {PART_LABELS.map((l) => (
        <div
          key={l.id}
          ref={(el) => { labelNodes[l.id] = el }}
          className="glass absolute left-0 top-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-medium text-fg opacity-0 will-change-transform"
        >
          {l.title} <span className="text-fg-3">· {l.sub}</span>
        </div>
      ))}
    </div>
  )
}
