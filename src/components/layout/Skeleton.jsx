import { cn } from '../../lib/cn'

function Block({ className }) {
  return (
    <div className={cn('relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.07] backdrop-blur-2xl', className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  )
}

export default function Skeleton({ label = 'Loading forecast…' }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6" aria-busy="true">
      <div className="flex flex-col items-center gap-3 pb-10 pt-12">
        <div className="h-8 w-40 rounded-full bg-white/10" />
        <div className="h-24 w-36 rounded-3xl bg-white/10" />
        <p className="text-[13px] text-white/70">{label}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Block className="col-span-2 h-44 lg:col-span-4" />
        <Block className="col-span-2 h-[30rem] lg:row-span-3 lg:h-auto" />
        <Block className="col-span-2 h-44" />
        <Block className="h-44" />
        <Block className="h-44" />
        <Block className="h-44" />
        <Block className="h-44" />
      </div>
    </div>
  )
}
