import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, History, LoaderCircle, MapPin, Navigation, Search, X } from 'lucide-react'
import { CITIES, searchCities } from '../../services/weather'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { SNAPPY, SPRING } from '../../lib/motion'
import { cn } from '../../lib/cn'

const FEATURED = ['Tokyo', 'London', 'New York', 'Reykjavík', 'Sydney', 'Dubai'].map((n) => CITIES.find((c) => c.name === n))

export default function SearchOverlay({ open, onClose, onSelect, onLocate, recents }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const debounced = useDebouncedValue(query, 220)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([])
      setLoading(false)
      return
    }
    const ac = new AbortController()
    setLoading(true)
    searchCities(debounced, ac.signal)
      .then((r) => {
        setResults(r)
        setActive(0)
        setLoading(false)
      })
      .catch(() => {})
    return () => ac.abort()
  }, [debounced])

  const suggestions = query.trim()
    ? results
    : [...recents.map((r) => ({ ...r, recent: true })), ...FEATURED.filter((f) => !recents.some((r) => r.name === f.name))].slice(0, 8)

  const choose = (item) => {
    if (!item) return
    onSelect({ name: item.name, region: item.region, country: item.country, lat: item.lat, lon: item.lon, timezone: item.timezone })
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(suggestions.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(suggestions[active])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-3 pt-[12vh] backdrop-blur-md sm:px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search cities"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={SPRING}
            className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/15 bg-[rgba(30,40,60,0.55)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_40px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-3xl backdrop-saturate-150"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-5">
              {loading ? <LoaderCircle className="h-5 w-5 animate-spin text-white/60" /> : <Search className="h-5 w-5 text-white/60" />}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search for a city or airport"
                className="h-16 flex-1 bg-transparent text-[18px] text-white placeholder:text-white/40 focus:outline-none"
                aria-label="City name"
                aria-controls="search-results"
                aria-activedescendant={suggestions[active] ? `result-${active}` : undefined}
                role="combobox"
                aria-expanded="true"
                autoComplete="off"
                spellCheck="false"
              />
              <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close search">
                <X className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={onLocate}
              className="flex w-full items-center gap-3 border-b border-white/10 px-5 py-3.5 text-left text-[15px] text-sky-200 hover:bg-white/[0.06]"
            >
              <Navigation className="h-4 w-4 fill-current" /> Use current location
            </button>

            <p className="px-5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
              {query.trim() ? 'Results' : recents.length ? 'Recent & Featured' : 'Featured Cities'}
            </p>
            <ul id="search-results" role="listbox" className="max-h-[50vh] overflow-y-auto px-2 pb-2">
              {suggestions.length === 0 && query.trim() && !loading && <li className="px-3 py-6 text-center text-[14px] text-white/55">No places match “{query}”.</li>}
              {suggestions.map((item, i) => (
                <li key={`${item.lat},${item.lon},${i}`} id={`result-${i}`} role="option" aria-selected={active === i}>
                  <motion.button
                    type="button"
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...SNAPPY, delay: i * 0.02 }}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(item)}
                    className="relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left"
                  >
                    {active === i && <motion.span layoutId="search-active" transition={SNAPPY} className="absolute inset-0 -z-0 rounded-2xl bg-white/[0.12]" />}
                    <span className="relative grid h-8 w-8 place-items-center rounded-full bg-white/10">
                      {item.recent ? <History className="h-4 w-4 text-white/70" /> : <MapPin className="h-4 w-4 text-white/70" />}
                    </span>
                    <span className="relative min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{item.name}</span>
                      <span className="block truncate text-[12px] text-white/55">{[item.region, item.country].filter(Boolean).join(', ')}</span>
                    </span>
                    {item.offline && <span className="relative text-[10px] uppercase tracking-wide text-amber-200/80">offline</span>}
                    <CornerDownLeft className={cn('relative h-4 w-4 text-white/40 transition-opacity', active === i ? 'opacity-100' : 'opacity-0')} />
                  </motion.button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
