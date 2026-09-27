import { AnimatePresence, motion } from 'framer-motion'
import { CloudOff } from 'lucide-react'
import { SPRING } from '../../lib/motion'

const REASONS = {
  offline: 'You’re offline',
  'rate-limited': 'Open-Meteo is rate limiting requests',
  timeout: 'Open-Meteo took too long to respond',
  unavailable: 'Open-Meteo is unreachable',
  simulated: 'Simulation mode is on',
}

export default function StatusNotice({ data, onRetry }) {
  const show = data && data.source !== 'live'
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={SPRING}
          className="mb-4"
          role="status"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200/20 bg-amber-300/[0.1] px-4 py-3 text-[13px] text-amber-50 backdrop-blur-2xl">
            <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="flex-1">
              {REASONS[data.reason] ?? 'Live data unavailable'}.{' '}
              {data.source === 'cache' ? 'Showing the most recent live forecast.' : 'Showing a realistic simulated forecast.'}
            </p>
            {data.reason !== 'simulated' && (
              <button type="button" onClick={onRetry} className="rounded-full bg-white/15 px-3 py-1 font-medium hover:bg-white/25">
                Retry
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
