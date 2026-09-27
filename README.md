# Atmosphere OS

A luxury, iOS-inspired weather experience: a living WebGL sky, optical glass bento tiles, and spring physics throughout. It runs on free [Open-Meteo](https://open-meteo.com/) data with no API keys.

**Stack:** React 19 · Vite · Tailwind CSS v4 · Framer Motion · Lucide React

## Features

- **Atmospheric backdrop**: a full-screen fragment shader with sun rays, a twinkling starfield, fbm cloud decks, volumetric fog, parallax rain streaks, snowfall and storm lightning. It reacts to the live condition and time of day, and changes between scenes by easing each parameter, so city switches cross-dissolve the sky itself. It falls back to a CSS gradient when WebGL isn't available.
- **Optical glassmorphism**: `bg-white/[0.08]`, `backdrop-blur-2xl` with saturation boost, `border-white/15` hairlines, inner specular edge, and a deep natural shadow.
- **Hero**: city, thin 100px+ temperature, condition, H/L and feels-like. It micro-collapses on scroll, and a compact summary pill appears in the top bar.
- **Hourly forecast**: a Framer drag track with inertia and elastic bounds, trackpad/wheel and keyboard support, precipitation chances, and an interpolated (Catmull-Rom) temperature curve with a gradient stroke.
- **10-day outlook**: Apple-style range bars shaded by absolute temperature and scaled to the week's extremes, with a current-temperature dot. Each row expands with a spring into sunrise/sunset, UV, precipitation and wind details.
- **Bento tiles**: UV arc gauge, live wind compass with a gust-driven vector, parabolic sun arc, AQI spectrum with health advice, precipitation radar miniature with a 2-hour nowcast, humidity moisture meter with dew point, visibility bands, and a pressure barometer with 3-hour trend.
- **Tactile motion**: shared spring presets, 3D parallax tilt with a cursor glare on fine pointers, staggered cross-dissolve between cities, and an organic pulse on every data refresh. Honours `prefers-reduced-motion`.
- **Search and location**: geolocation on first visit, plus a ⌘K / `/` search overlay with keyboard navigation, recent cities, and an offline gazetteer.
- **°C / °F**: toggles wind, distance, pressure and precipitation units too.

## Data and resilience

`src/services/weather/index.js` resolves each request through a fallback chain:

1. **Live Open-Meteo** (forecast, hourly, daily, 15-minute precipitation, and air quality), with an 8-second timeout.
2. **Cached live payload** (under 3 hours old) if the network fails.
3. **Local mock engine** (`mockEngine.js`), which returns data instantly when offline, rate-limited (HTTP 429) or timed out. It's a seeded climate model: latitude and season baselines, a diurnal cycle, a Markov chain of daily weather regimes, real solar geometry, and consistent dew point, feels-like, UV, visibility and pressure.

A banner and a top-bar badge show when data is cached or simulated.

URL flags: `?mock` forces the simulator, and `?sky=rain-night` (or `clear`, `partly`, `cloudy`, `fog`, `drizzle`, `rain`, `snow`, `storm`, each with an optional `-night`) overrides the sky for design review.

## Layout

```
src/
  components/
    canvas/    AtmosphereCanvas, GLSL shader, scene palettes
    widgets/   Hero, HourlyForecast, DailyOutlook and metric tiles
    layout/    TopBar, SearchOverlay, StatusNotice, Skeleton
    ui/        GlassCard, WeatherIcon, Stat
  services/weather/  Open-Meteo adapter, geocoding, mock engine, solar math
  hooks/       useWeather, useGeolocation, useUnits, useNow, …
  lib/         formatting, units, colour scale, insights, motion presets
```

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static build in dist/ (relative base, deployable anywhere)
npm run shots     # Playwright screenshots → ./screenshots
```

`npm run shots` starts Vite and drives Chromium through desktop, tablet and phone viewports. It covers search, city switching, scroll collapse, card tilt, the sky scenes, and a rate-limited fallback. Open-Meteo is intercepted with payloads in the real API format, so the run is deterministic and needs no network. Set `CHROMIUM_PATH` to use a preinstalled Chromium.
