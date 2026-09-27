import { useCallback, useEffect, useRef, useState } from 'react'
import { getWeather } from '../services/weather'

const REFRESH_MS = 10 * 60 * 1000

/**
 * Loads weather for `location`, keeping the previous city's data on screen
 * until the next one resolves (so the UI can cross-dissolve rather than blank).
 */
export function useWeather(location, { forceMock = false } = {}) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | refreshing | ready
  const controller = useRef(null)
  const lastLoad = useRef(0)

  const load = useCallback(
    async (mode) => {
      if (!location) return
      controller.current?.abort()
      const ac = new AbortController()
      controller.current = ac
      setStatus(mode)
      try {
        const next = await getWeather(location, { signal: ac.signal, forceMock })
        if (ac.signal.aborted) return
        lastLoad.current = Date.now()
        setData(next)
        setStatus('ready')
      } catch (err) {
        if (err?.name !== 'AbortError') setStatus('ready')
      }
    },
    [location, forceMock],
  )

  useEffect(() => {
    load('loading')
    return () => controller.current?.abort()
  }, [load])

  // Periodic refresh + refresh when the tab comes back after being stale.
  useEffect(() => {
    const id = setInterval(() => load('refreshing'), REFRESH_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoad.current > REFRESH_MS) load('refreshing')
    }
    const onOnline = () => load('refreshing')
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [load])

  const refresh = useCallback(() => load('refreshing'), [load])
  return { data, status, refresh }
}
