import type { Finish } from '../three/finishes'

/**
 * No-WebGL fallback: a CSS rendering of the back of the phone in the active
 * colorway. Same footprint as the canvas so the page layout doesn't shift.
 */
export function StaticPhone({ finish, reason }: { finish: Finish; reason: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center" role="img" aria-label={`iPhone 18 Pro Max in ${finish.name}`}>
      <div
        className="relative aspect-[78/163] h-[62vh] max-h-[640px] rounded-[14%/6.7%] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] transition-colors duration-700"
        style={{
          background: `linear-gradient(140deg, ${finish.back} 0%, color-mix(in oklab, ${finish.back} 70%, black) 100%)`,
          boxShadow: `inset 0 0 0 3px ${finish.frame}, inset 0 0 0 4px rgba(255,255,255,0.25)`,
        }}
      >
        <div
          className="absolute inset-x-[4%] top-[2.2%] h-[26%] rounded-[18%/30%]"
          style={{ background: `linear-gradient(180deg, color-mix(in oklab, ${finish.frame} 85%, white), ${finish.frame})` }}
        >
          {[[14, 22], [14, 62], [40, 42]].map(([l, t], i) => (
            <span
              key={i}
              className="absolute aspect-square w-[26%] rounded-full bg-[radial-gradient(circle_at_40%_35%,#3a3a55,#050508_55%,#000)] ring-[3px] ring-black/60"
              style={{ left: `${l - 6}%`, top: `${t - 18}%` }}
            />
          ))}
        </div>
      </div>
      <p className="absolute bottom-28 text-xs text-fg-3">{reason}</p>
    </div>
  )
}
