// Maps a weather group + day/night into shader parameters. Colours are linear
// 0..1 RGB; scalar channels are 0..1 intensities.
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)

const DAY_CLOUD = hex('#e9eef5')
const NIGHT_CLOUD = hex('#3a4252')

const SCENES = {
  'clear-day': { top: '#1c63c4', bottom: '#6fa9e0', sun: 1, stars: 0, cloud: 0.06, fog: 0, rain: 0, snow: 0 },
  'clear-night': { top: '#030814', bottom: '#172443', sun: 0, stars: 1, cloud: 0.05, fog: 0, rain: 0, snow: 0 },
  'partly-day': { top: '#2e6db6', bottom: '#7fa6cd', sun: 0.65, stars: 0, cloud: 0.5, fog: 0, rain: 0, snow: 0 },
  'partly-night': { top: '#070d1d', bottom: '#222d48', sun: 0, stars: 0.55, cloud: 0.45, fog: 0, rain: 0, snow: 0 },
  'cloudy-day': { top: '#4b5b6e', bottom: '#8492a1', sun: 0.1, stars: 0, cloud: 0.95, fog: 0.1, rain: 0, snow: 0 },
  'cloudy-night': { top: '#10151f', bottom: '#2c3441', sun: 0, stars: 0.05, cloud: 0.85, fog: 0.1, rain: 0, snow: 0 },
  'fog-day': { top: '#6b7580', bottom: '#98a2ab', sun: 0.15, stars: 0, cloud: 0.4, fog: 1, rain: 0, snow: 0 },
  'fog-night': { top: '#161b22', bottom: '#333a44', sun: 0, stars: 0, cloud: 0.4, fog: 1, rain: 0, snow: 0 },
  'drizzle-day': { top: '#3f4e61', bottom: '#6f7f91', sun: 0, stars: 0, cloud: 0.85, fog: 0.25, rain: 0.45, snow: 0 },
  'drizzle-night': { top: '#0c121b', bottom: '#252f3c', sun: 0, stars: 0, cloud: 0.8, fog: 0.25, rain: 0.45, snow: 0 },
  'rain-day': { top: '#344256', bottom: '#5f6f82', sun: 0, stars: 0, cloud: 0.95, fog: 0.3, rain: 1, snow: 0 },
  'rain-night': { top: '#0a0f18', bottom: '#212a37', sun: 0, stars: 0, cloud: 0.9, fog: 0.3, rain: 1, snow: 0 },
  'snow-day': { top: '#6b7d93', bottom: '#a3b1c0', sun: 0.05, stars: 0, cloud: 0.7, fog: 0.35, rain: 0, snow: 1 },
  'snow-night': { top: '#141b29', bottom: '#34405a', sun: 0, stars: 0, cloud: 0.6, fog: 0.3, rain: 0, snow: 1 },
  'storm-day': { top: '#1c2330', bottom: '#3f4957', sun: 0, stars: 0, cloud: 1, fog: 0.35, rain: 1, snow: 0, storm: 1 },
  'storm-night': { top: '#07090f', bottom: '#1b212c', sun: 0, stars: 0, cloud: 1, fog: 0.35, rain: 1, snow: 0, storm: 1 },
}

export function sceneFor(group, isDay) {
  const s = SCENES[`${group}-${isDay ? 'day' : 'night'}`] ?? SCENES['clear-day']
  return {
    top: hex(s.top),
    bottom: hex(s.bottom),
    cloudColor: isDay ? DAY_CLOUD : NIGHT_CLOUD,
    sun: s.sun,
    stars: s.stars,
    cloud: s.cloud,
    fog: s.fog,
    rain: s.rain,
    snow: s.snow,
    storm: s.storm ?? 0,
  }
}

/** CSS fallback gradient for devices without WebGL. */
export const sceneCss = (scene) => {
  const c = (rgb) => `rgb(${rgb.map((v) => Math.round(v * 255)).join(',')})`
  return `linear-gradient(180deg, ${c(scene.top)} 0%, ${c(scene.bottom)} 100%)`
}
