// WMO weather interpretation codes → label + visual group.
const TABLE = {
  0: ['Clear', 'clear'],
  1: ['Mostly Clear', 'clear'],
  2: ['Partly Cloudy', 'partly'],
  3: ['Overcast', 'cloudy'],
  45: ['Fog', 'fog'],
  48: ['Freezing Fog', 'fog'],
  51: ['Light Drizzle', 'drizzle'],
  53: ['Drizzle', 'drizzle'],
  55: ['Heavy Drizzle', 'drizzle'],
  56: ['Freezing Drizzle', 'drizzle'],
  57: ['Freezing Drizzle', 'drizzle'],
  61: ['Light Rain', 'rain'],
  63: ['Rain', 'rain'],
  65: ['Heavy Rain', 'rain'],
  66: ['Freezing Rain', 'rain'],
  67: ['Freezing Rain', 'rain'],
  71: ['Light Snow', 'snow'],
  73: ['Snow', 'snow'],
  75: ['Heavy Snow', 'snow'],
  77: ['Snow Grains', 'snow'],
  80: ['Rain Showers', 'rain'],
  81: ['Rain Showers', 'rain'],
  82: ['Violent Showers', 'rain'],
  85: ['Snow Showers', 'snow'],
  86: ['Heavy Snow Showers', 'snow'],
  95: ['Thunderstorms', 'storm'],
  96: ['Thunderstorms & Hail', 'storm'],
  99: ['Severe Thunderstorms', 'storm'],
}

export function describeCode(code, isDay = true) {
  const [label, group] = TABLE[code] ?? ['Unknown', 'cloudy']
  const nightLabel = !isDay && code <= 1 ? (code === 0 ? 'Clear' : 'Mostly Clear') : label
  return { label: nightLabel, group }
}

export const PRECIP_GROUPS = new Set(['drizzle', 'rain', 'snow', 'storm'])
