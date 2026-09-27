export const UNIT_SYSTEMS = {
  metric: { temp: '°C', wind: 'km/h', distance: 'km', pressure: 'hPa', precip: 'mm' },
  imperial: { temp: '°F', wind: 'mph', distance: 'mi', pressure: 'inHg', precip: 'in' },
}

// Data is always stored in metric; these convert for display only.
export const convert = {
  temp: (c, sys) => (sys === 'imperial' ? c * 1.8 + 32 : c),
  wind: (kmh, sys) => (sys === 'imperial' ? kmh * 0.621371 : kmh),
  distance: (km, sys) => (sys === 'imperial' ? km * 0.621371 : km),
  pressure: (hpa, sys) => (sys === 'imperial' ? hpa * 0.02953 : hpa),
  precip: (mm, sys) => (sys === 'imperial' ? mm / 25.4 : mm),
}

export function fmtTemp(c, sys) {
  if (c == null || Number.isNaN(c)) return '--'
  return `${Math.round(convert.temp(c, sys))}°`
}

export function fmtPrecip(mm, sys) {
  const v = convert.precip(mm, sys)
  return sys === 'imperial' ? `${v.toFixed(2)} in` : `${v < 10 ? v.toFixed(1) : Math.round(v)} mm`
}

export function fmtPressure(hpa, sys) {
  const v = convert.pressure(hpa, sys)
  return sys === 'imperial' ? v.toFixed(2) : Math.round(v).toString()
}
