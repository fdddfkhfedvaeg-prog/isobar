# ⛅ Isobar

A modern, interactive weather web app built with plain HTML, CSS and JavaScript, with no build step and no API key.

## Features

- **City search with autocomplete**: keyboard navigation (↑ ↓ Enter Esc), press `/` to focus
- **Geolocation**: one-click weather for where you are
- **Current conditions**: temperature, feels-like, high/low, wind with a compass, humidity, UV, pressure, precipitation, sunrise/sunset
- **24-hour forecast**: interactive SVG chart (temperature / rain chance / wind) with hover tooltips, plus a scrollable hourly strip
- **7-day forecast**: temperature range bars; tap a day for details
- **°C / °F toggle**: switches wind and precipitation units too
- **Saved and recent cities**: stored in your browser
- **Dynamic themes**: the background changes with the weather and time of day, with animated rain, snow, stars, clouds and lightning
- Responsive, accessible, and honours `prefers-reduced-motion`
- Deep links: `?city=Tokyo`

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Data

Forecasts and geocoding come from [Open-Meteo](https://open-meteo.com/). Reverse geocoding for "my location" comes from BigDataCloud's free client endpoint.

## Also in this repo: iPhone 18 concept launch page

`iphone-18/index.html` is a self-contained concept landing page for an iPhone 18 lineup launch, built with Tailwind (CDN), Inter and Font Awesome. It has a CSS-only 3D device with a live color switcher, interactive feature demos (aperture and zoom), lineup cards, a specs table and a pre-order modal with live pricing. It's unofficial and not affiliated with Apple.
