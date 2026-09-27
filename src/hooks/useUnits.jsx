import { createContext, useContext, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { UNIT_SYSTEMS } from '../lib/units'

const UnitsContext = createContext({ system: 'metric', labels: UNIT_SYSTEMS.metric, setSystem: () => {} })

function defaultSystem() {
  try {
    return /^en-(US|LR|MM)$/.test(navigator.language) ? 'imperial' : 'metric'
  } catch {
    return 'metric'
  }
}

export function UnitsProvider({ children }) {
  const [system, setSystem] = useLocalStorage('atmos:units', defaultSystem())
  const value = useMemo(() => ({ system, labels: UNIT_SYSTEMS[system], setSystem }), [system, setSystem])
  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>
}

export const useUnits = () => useContext(UnitsContext)
