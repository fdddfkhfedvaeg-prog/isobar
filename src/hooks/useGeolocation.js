import { useCallback, useState } from 'react'
import { reverseGeocode } from '../services/weather'

export function useGeolocation() {
  const [state, setState] = useState('idle') // idle | locating | denied | unavailable

  const locate = useCallback(
    () =>
      new Promise((done) => {
        // An ignored permission prompt never calls back, so cap the wait.
        let settled = false
        const resolve = (v) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          done(v)
        }
        const timer = setTimeout(() => {
          setState('unavailable')
          resolve(null)
        }, 10000)
        if (!('geolocation' in navigator)) {
          setState('unavailable')
          return resolve(null)
        }
        setState('locating')
        navigator.geolocation.getCurrentPosition(
          async ({ coords }) => {
            const place = await reverseGeocode(coords.latitude, coords.longitude)
            setState('idle')
            resolve({
              ...place,
              lat: coords.latitude,
              lon: coords.longitude,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              isCurrent: true,
            })
          },
          (err) => {
            setState(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable')
            resolve(null)
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
        )
      }),
    [],
  )

  return { locate, state }
}
