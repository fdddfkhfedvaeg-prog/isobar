"use strict";

/* ==========================================================
   Isobar — modern interactive weather app
   Data: Open-Meteo (forecast + geocoding), no API key needed.
   ========================================================== */

const API = {
  forecast: "https://api.open-meteo.com/v1/forecast",
  geocode: "https://geocoding-api.open-meteo.com/v1/search",
  reverse: "https://api.bigdatacloud.net/data/reverse-geocode-client",
};

const STORAGE_KEY = "isobar:v1";
const DEFAULT_CITY = { name: "London", country: "United Kingdom", lat: 51.5085, lon: -0.1257 };

// WMO weather interpretation codes → label, day icon, night icon, theme
const WEATHER = {
  0:  ["Clear sky", "☀️", "🌙", "clear"],
  1:  ["Mainly clear", "🌤️", "🌙", "clear"],
  2:  ["Partly cloudy", "⛅", "☁️", "cloudy"],
  3:  ["Overcast", "☁️", "☁️", "cloudy"],
  45: ["Fog", "🌫️", "🌫️", "fog"],
  48: ["Rime fog", "🌫️", "🌫️", "fog"],
  51: ["Light drizzle", "🌦️", "🌧️", "rain"],
  53: ["Drizzle", "🌦️", "🌧️", "rain"],
  55: ["Dense drizzle", "🌧️", "🌧️", "rain"],
  56: ["Freezing drizzle", "🌧️", "🌧️", "rain"],
  57: ["Freezing drizzle", "🌧️", "🌧️", "rain"],
  61: ["Light rain", "🌦️", "🌧️", "rain"],
  63: ["Rain", "🌧️", "🌧️", "rain"],
  65: ["Heavy rain", "🌧️", "🌧️", "rain"],
  66: ["Freezing rain", "🌧️", "🌧️", "rain"],
  67: ["Freezing rain", "🌧️", "🌧️", "rain"],
  71: ["Light snow", "🌨️", "🌨️", "snow"],
  73: ["Snow", "🌨️", "🌨️", "snow"],
  75: ["Heavy snow", "❄️", "❄️", "snow"],
  77: ["Snow grains", "🌨️", "🌨️", "snow"],
  80: ["Rain showers", "🌦️", "🌧️", "rain"],
  81: ["Rain showers", "🌧️", "🌧️", "rain"],
  82: ["Violent showers", "⛈️", "⛈️", "storm"],
  85: ["Snow showers", "🌨️", "🌨️", "snow"],
  86: ["Heavy snow showers", "❄️", "❄️", "snow"],
  95: ["Thunderstorm", "⛈️", "⛈️", "storm"],
  96: ["Thunderstorm, hail", "⛈️", "⛈️", "storm"],
  99: ["Thunderstorm, hail", "⛈️", "⛈️", "storm"],
};

const weatherInfo = (code, isDay = true) => {
  const [label, dayIcon, nightIcon, kind] = WEATHER[code] || ["Unknown", "🌡️", "🌡️", "cloudy"];
  return { label, icon: isDay ? dayIcon : nightIcon, kind };
};

/* ---------- State ---------- */
const state = {
  unit: "celsius",
  place: null,
  data: null,
  chart: "temp",
  recent: [],
  favorites: [],
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (saved.unit) state.unit = saved.unit;
    if (Array.isArray(saved.recent)) state.recent = saved.recent;
    if (Array.isArray(saved.favorites)) state.favorites = saved.favorites;
    if (saved.place) state.place = saved.place;
  } catch { /* storage unavailable — use defaults */ }
}

function saveState() {
  try {
    const { unit, recent, favorites, place } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ unit, recent, favorites, place }));
  } catch { /* ignore */ }
}

/* ---------- DOM helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) node.append(child);
  return node;
};
const placeKey = (p) => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;
const placeLabel = (p) => [p.name, p.admin, p.country].filter(Boolean).join(", ");

function setStatus(message, loading = false) {
  const status = $("#status");
  status.innerHTML = "";
  if (loading) status.append(el("div", { className: "spinner" }));
  if (message) status.append(el("p", { textContent: message }));
}

/* ---------- API ---------- */
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function searchCities(query, signal) {
  const url = `${API.geocode}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
  const res = await fetch(url, { signal });
  const json = await res.json();
  return (json.results || []).map((r) => ({
    name: r.name,
    admin: r.admin1,
    country: r.country,
    lat: r.latitude,
    lon: r.longitude,
  }));
}

async function reverseGeocode(lat, lon) {
  try {
    const json = await fetchJSON(`${API.reverse}?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    return {
      name: json.city || json.locality || "My location",
      admin: json.principalSubdivision,
      country: json.countryName,
      lat, lon,
    };
  } catch {
    return { name: "My location", lat, lon };
  }
}

async function fetchForecast(place, unit) {
  const imperial = unit === "fahrenheit";
  const params = new URLSearchParams({
    latitude: place.lat,
    longitude: place.lon,
    timezone: "auto",
    forecast_days: 7,
    temperature_unit: unit,
    wind_speed_unit: imperial ? "mph" : "kmh",
    precipitation_unit: imperial ? "inch" : "mm",
    current: [
      "temperature_2m", "relative_humidity_2m", "apparent_temperature", "is_day",
      "precipitation", "weather_code", "pressure_msl", "wind_speed_10m", "wind_direction_10m",
    ].join(","),
    hourly: [
      "temperature_2m", "precipitation_probability", "precipitation", "weather_code",
      "wind_speed_10m", "uv_index", "is_day",
    ].join(","),
    daily: [
      "weather_code", "temperature_2m_max", "temperature_2m_min", "sunrise", "sunset",
      "precipitation_sum", "precipitation_probability_max", "uv_index_max", "wind_speed_10m_max",
    ].join(","),
  });
  return fetchJSON(`${API.forecast}?${params}`);
}

/* ---------- Formatting ---------- */
const round = (n) => Math.round(n);
const parseLocal = (iso) => new Date(`${iso}:00Z`); // API times are local; treat as UTC for display
const fmtTime = (iso) =>
  parseLocal(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
const fmtHour = (iso) =>
  parseLocal(iso).toLocaleTimeString([], { hour: "numeric", timeZone: "UTC" });
const fmtDay = (iso, i) =>
  i === 0 ? "Today" : parseLocal(`${iso}T00:00`).toLocaleDateString([], { weekday: "short", timeZone: "UTC" });
const compassPoint = (deg) =>
  ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"][
    Math.round(deg / 22.5) % 16
  ];
const uvLabel = (uv) => (uv < 3 ? "Low" : uv < 6 ? "Moderate" : uv < 8 ? "High" : uv < 11 ? "Very high" : "Extreme");

/* ---------- Loading weather ---------- */
let requestId = 0;

async function loadWeather(place, { remember = true } = {}) {
  const id = ++requestId;
  state.place = place;
  setStatus(`Loading weather for ${place.name}…`, true);
  try {
    const data = await fetchForecast(place, state.unit);
    if (id !== requestId) return; // a newer request superseded this one
    state.data = data;
    if (remember) addRecent(place);
    saveState();
    setStatus("");
    render();
  } catch (err) {
    if (id !== requestId) return;
    console.error(err);
    setStatus("Couldn't load the weather. Check your connection and try again.");
  }
}

/* ---------- Rendering ---------- */
function render() {
  const { data, place } = state;
  if (!data) return;
  const c = data.current;
  const units = data.current_units;
  const info = weatherInfo(c.weather_code, c.is_day);
  const nowIdx = Math.max(0, data.hourly.time.findIndex((t) => t.slice(0, 13) === c.time.slice(0, 13)));

  // Current
  $("#place").textContent = placeLabel(place);
  const localNow = new Date(Date.now() + data.utc_offset_seconds * 1000);
  $("#local-time").textContent = localNow.toLocaleString([], {
    weekday: "long", hour: "numeric", minute: "2-digit", timeZone: "UTC",
  }) + ` · ${data.timezone_abbreviation || data.timezone}`;
  $("#current-icon").textContent = info.icon;
  $("#temp").textContent = round(c.temperature_2m);
  $("#temp-unit").textContent = units.temperature_2m;
  $("#desc").textContent = info.label;
  $("#t-max").textContent = round(data.daily.temperature_2m_max[0]);
  $("#t-min").textContent = round(data.daily.temperature_2m_min[0]);
  $("#feels").textContent = round(c.apparent_temperature);
  document.title = `${round(c.temperature_2m)}${units.temperature_2m} ${place.name} · Isobar`;

  // Metrics
  $("#wind").textContent = `${round(c.wind_speed_10m)} ${units.wind_speed_10m} ${compassPoint(c.wind_direction_10m)}`;
  // Wind direction is where wind comes FROM; arrow points where it blows TO
  $("#wind-dir").style.transform = `translateX(-50%) rotate(${(c.wind_direction_10m + 180) % 360}deg)`;
  $("#humidity").textContent = `${c.relative_humidity_2m}%`;
  $("#humidity-bar").style.width = `${c.relative_humidity_2m}%`;
  const uv = data.hourly.uv_index[nowIdx] ?? 0;
  $("#uv").textContent = `${uv.toFixed(1)} · ${uvLabel(uv)}`;
  $("#uv-bar").style.width = `${Math.min(100, (uv / 11) * 100)}%`;
  $("#pressure").textContent = `${round(c.pressure_msl)} hPa`;
  $("#pressure-note").textContent = c.pressure_msl < 1009 ? "Low — unsettled" : c.pressure_msl > 1022 ? "High — settled" : "Normal";
  $("#precip").textContent = `${c.precipitation} ${units.precipitation}`;
  $("#precip-note").textContent = `${data.daily.precipitation_probability_max[0] ?? 0}% chance today`;
  $("#sunrise").textContent = `↑ ${fmtTime(data.daily.sunrise[0])}`;
  $("#sunset").textContent = `↓ ${fmtTime(data.daily.sunset[0])}`;

  renderFavButton();
  renderHourly(nowIdx);
  renderChart(nowIdx);
  renderDaily();
  applyTheme(info.kind, c.is_day);

  ["#current", "#metrics", "#hourly-section", "#daily-section"].forEach((s) => ($(s).hidden = false));
}

function renderHourly(start) {
  const h = state.data.hourly;
  const strip = $("#hourly");
  strip.innerHTML = "";
  for (let i = start; i < Math.min(start + 24, h.time.length); i++) {
    const info = weatherInfo(h.weather_code[i], h.is_day[i]);
    const pop = h.precipitation_probability[i];
    strip.append(
      el("div", { className: `hour${i === start ? " is-now" : ""}` }, [
        el("div", { className: "hour__time", textContent: i === start ? "Now" : fmtHour(h.time[i]) }),
        el("div", { className: "hour__icon", textContent: info.icon, title: info.label }),
        el("div", { className: "hour__temp", textContent: `${round(h.temperature_2m[i])}°` }),
        el("div", { className: "hour__pop", textContent: pop >= 10 ? `💧${pop}%` : "" }),
      ])
    );
  }
  strip.scrollLeft = 0;
}

function renderChart(start) {
  const h = state.data.hourly;
  const units = state.data.hourly_units;
  const end = Math.min(start + 24, h.time.length);
  const series = {
    temp: { values: h.temperature_2m, unit: units.temperature_2m, kind: "line" },
    precip: { values: h.precipitation_probability, unit: "%", kind: "bar", min: 0, max: 100 },
    wind: { values: h.wind_speed_10m, unit: ` ${units.wind_speed_10m}`, kind: "line", min: 0 },
  }[state.chart];

  const values = series.values.slice(start, end);
  const times = h.time.slice(start, end);
  const W = 720, H = 160, padX = 16, padTop = 24, padBottom = 20;
  const lo = series.min ?? Math.min(...values);
  const hi = series.max ?? Math.max(...values);
  const span = hi - lo || 1;
  const step = (W - padX * 2) / Math.max(1, values.length - 1);
  const x = (i) => padX + i * step;
  const y = (v) => padTop + (1 - (v - lo) / span) * (H - padTop - padBottom);

  const ns = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };

  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", role: "img",
    "aria-label": `Hourly ${state.chart} chart` });
  const defs = svgEl("defs", {});
  const grad = svgEl("linearGradient", { id: "area-grad", x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.append(svgEl("stop", { offset: "0%", "stop-color": "#fff", "stop-opacity": 0.45 }));
  grad.append(svgEl("stop", { offset: "100%", "stop-color": "#fff", "stop-opacity": 0 }));
  defs.append(grad);
  svg.append(defs);

  if (series.kind === "line") {
    // Smooth curve through points using Catmull-Rom → Bézier
    const pts = values.map((v, i) => [x(i), y(v)]);
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
    }
    svg.append(svgEl("path", { d: `${d} L ${x(values.length - 1)} ${H} L ${x(0)} ${H} Z`, class: "area", fill: "url(#area-grad)" }));
    const line = svgEl("path", { d, class: "line", "vector-effect": "non-scaling-stroke" });
    svg.append(line);
  } else {
    const bw = step * 0.6;
    values.forEach((v, i) => {
      const top = y(v);
      svg.append(svgEl("rect", { x: x(i) - bw / 2, y: top, width: bw, height: Math.max(0, H - padBottom - top), rx: 3, class: "bar-rect" }));
    });
  }

  const chart = $("#chart");
  chart.innerHTML = "";
  chart.append(svg);

  // Value labels every 3 hours, positioned in HTML so text isn't stretched
  const labelLayer = el("div", { style: "position:absolute;inset:0;pointer-events:none" });
  values.forEach((v, i) => {
    if (i % 3 !== 0) return;
    const left = (x(i) / W) * 100;
    labelLayer.append(el("span", {
      textContent: `${round(v)}${{ temp: "°", precip: "%", wind: "" }[state.chart]}`,
      style: `position:absolute;left:${left}%;top:${(y(v) / H) * 100}%;transform:translate(-50%,-140%);font-size:.75rem;font-weight:600`,
    }));
    labelLayer.append(el("span", {
      textContent: i === 0 ? "Now" : fmtHour(times[i]),
      style: `position:absolute;left:${left}%;bottom:-4px;transform:translateX(-50%);font-size:.7rem;opacity:.75`,
    }));
  });
  chart.append(labelLayer);

  // Interactive tooltip
  const tip = el("div", { className: "chart-tip" });
  chart.append(tip);
  const onMove = (e) => {
    const rect = chart.getBoundingClientRect();
    const px = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / rect.width * W;
    const i = Math.max(0, Math.min(values.length - 1, Math.round((px - padX) / step)));
    tip.textContent = `${i === 0 ? "Now" : fmtHour(times[i])} · ${values[i].toFixed(series.kind === "bar" ? 0 : 1)}${series.unit}`;
    tip.style.left = `${(x(i) / W) * 100}%`;
    tip.style.top = `${(y(values[i]) / H) * 100}%`;
    tip.style.opacity = 1;
  };
  chart.onmousemove = onMove;
  chart.ontouchmove = onMove;
  chart.onmouseleave = chart.ontouchend = () => (tip.style.opacity = 0);
}

function renderDaily() {
  const d = state.data.daily;
  const units = state.data.daily_units;
  const list = $("#daily");
  list.innerHTML = "";
  const weekMin = Math.min(...d.temperature_2m_min);
  const weekMax = Math.max(...d.temperature_2m_max);
  const span = weekMax - weekMin || 1;

  d.time.forEach((day, i) => {
    const info = weatherInfo(d.weather_code[i]);
    const left = ((d.temperature_2m_min[i] - weekMin) / span) * 100;
    const width = ((d.temperature_2m_max[i] - d.temperature_2m_min[i]) / span) * 100;

    const details = el("div", { className: "day__details" }, [
      detail("Conditions", info.label),
      detail("Rain chance", `${d.precipitation_probability_max[i] ?? 0}%`),
      detail("Precipitation", `${d.precipitation_sum[i]} ${units.precipitation_sum}`),
      detail("Max wind", `${round(d.wind_speed_10m_max[i])} ${units.wind_speed_10m_max}`),
      detail("UV max", `${(d.uv_index_max[i] ?? 0).toFixed(1)}`),
      detail("Sun", `${fmtTime(d.sunrise[i])} – ${fmtTime(d.sunset[i])}`),
    ]);
    details.id = `day-details-${i}`;

    const row = el("button", { className: "day__row", type: "button" }, [
      el("span", { className: "day__name", textContent: fmtDay(day, i) }),
      el("span", { className: "day__icon", textContent: info.icon, title: info.label }),
      el("span", { className: "day__range" }, [
        el("span", { className: "day__min", textContent: `${round(d.temperature_2m_min[i])}°` }),
        el("span", { className: "day__track" }, [
          el("span", { className: "day__fill", style: `left:${left}%;width:${Math.max(width, 4)}%` }),
        ]),
        el("span", { className: "day__max", textContent: `${round(d.temperature_2m_max[i])}°` }),
      ]),
    ]);
    row.setAttribute("aria-expanded", "false");
    row.setAttribute("aria-controls", details.id);

    const item = el("li", { className: "day" }, [row, details]);
    row.addEventListener("click", () => {
      const open = item.classList.toggle("is-open");
      row.setAttribute("aria-expanded", String(open));
    });
    list.append(item);
  });
}

function detail(label, value) {
  return el("div", {}, [el("span", { textContent: label }), el("strong", { textContent: value })]);
}

/* ---------- Theme + animated sky ---------- */
function applyTheme(kind, isDay) {
  const theme = kind === "clear" || kind === "cloudy" ? `${kind}-${isDay ? "day" : "night"}` : kind;
  if (document.body.dataset.theme === theme && $("#particles").childElementCount) return;
  document.body.dataset.theme = theme;

  const layer = $("#particles");
  layer.innerHTML = "";
  const rand = (a, b) => a + Math.random() * (b - a);

  if (kind === "rain" || kind === "storm") {
    for (let i = 0; i < 90; i++) {
      layer.append(el("span", { className: "drop",
        style: `left:${rand(0, 100)}%;animation-duration:${rand(0.5, 0.9)}s;animation-delay:${rand(-1, 0)}s;opacity:${rand(0.3, 0.8)}` }));
    }
    if (kind === "storm") layer.append(el("div", { className: "flash" }));
  } else if (kind === "snow") {
    for (let i = 0; i < 60; i++) {
      layer.append(el("span", { className: "flake", textContent: "❄",
        style: `left:${rand(0, 100)}%;font-size:${rand(8, 18)}px;animation-duration:${rand(6, 12)}s,${rand(2, 4)}s;animation-delay:${rand(-12, 0)}s` }));
    }
  } else if (!isDay) {
    for (let i = 0; i < 80; i++) {
      layer.append(el("span", { className: "star",
        style: `left:${rand(0, 100)}%;top:${rand(0, 70)}%;animation-duration:${rand(1.5, 4)}s;animation-delay:${rand(-4, 0)}s` }));
    }
  }
  if (kind === "cloudy" || kind === "fog" || (kind === "clear" && isDay)) {
    const count = kind === "clear" ? 2 : 5;
    for (let i = 0; i < count; i++) {
      layer.append(el("span", { className: "cloud",
        style: `top:${rand(5, 55)}%;transform:scale(${rand(0.6, 1.3)});animation-duration:${rand(50, 90)}s;animation-delay:${rand(-90, 0)}s` }));
    }
  }
}

/* ---------- Recent + favorites ---------- */
function addRecent(place) {
  const key = placeKey(place);
  state.recent = [place, ...state.recent.filter((p) => placeKey(p) !== key)].slice(0, 6);
  renderRecent();
}

const isFavorite = (place) => state.favorites.some((p) => placeKey(p) === placeKey(place));

function toggleFavorite() {
  if (!state.place) return;
  const key = placeKey(state.place);
  state.favorites = isFavorite(state.place)
    ? state.favorites.filter((p) => placeKey(p) !== key)
    : [state.place, ...state.favorites];
  saveState();
  renderFavButton();
  renderRecent();
}

function renderFavButton() {
  const fav = state.place && isFavorite(state.place);
  const btn = $("#fav-btn");
  btn.classList.toggle("is-fav", !!fav);
  btn.setAttribute("aria-pressed", String(!!fav));
  btn.title = fav ? "Remove from saved" : "Save city";
}

function renderRecent() {
  const nav = $("#recent");
  nav.innerHTML = "";
  const favKeys = new Set(state.favorites.map(placeKey));
  const items = [...state.favorites, ...state.recent.filter((p) => !favKeys.has(placeKey(p)))];

  for (const place of items) {
    const fav = favKeys.has(placeKey(place));
    const chip = el("span", { className: `chip${fav ? " chip--fav" : ""}` }, [
      el("button", { className: "chip__name", type: "button", textContent: place.name, title: placeLabel(place),
        onclick: () => loadWeather(place) }),
      el("button", { className: "chip__remove", type: "button", textContent: "×", title: "Remove",
        onclick: () => {
          const key = placeKey(place);
          state.recent = state.recent.filter((p) => placeKey(p) !== key);
          state.favorites = state.favorites.filter((p) => placeKey(p) !== key);
          saveState();
          renderRecent();
          renderFavButton();
        } }),
    ]);
    chip.lastChild.setAttribute("aria-label", `Remove ${place.name}`);
    nav.append(chip);
  }
}

/* ---------- Search with autocomplete ---------- */
function setupSearch() {
  const input = $("#search-input");
  const list = $("#suggestions");
  let results = [];
  let active = -1;
  let timer;
  let controller;

  const close = () => { list.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); };

  const show = () => {
    list.innerHTML = "";
    if (!results.length) {
      list.append(el("li", { textContent: "No matching cities" }));
    }
    results.forEach((r, i) => {
      const li = el("li", { role: "option", id: `opt-${i}` }, [
        el("span", { textContent: r.name }),
        el("small", { textContent: [r.admin, r.country].filter(Boolean).join(", ") }),
      ]);
      li.setAttribute("aria-selected", String(i === active));
      li.addEventListener("mousedown", (e) => { e.preventDefault(); choose(i); });
      list.append(li);
    });
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };

  const choose = (i) => {
    const place = results[i];
    if (!place) return;
    input.value = "";
    close();
    input.blur();
    loadWeather(place);
  };

  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { close(); return; }
    timer = setTimeout(async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        results = await searchCities(q, controller.signal);
        active = results.length ? 0 : -1;
        show();
      } catch (err) {
        if (err.name !== "AbortError") console.error(err);
      }
    }, 250);
  });

  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = results.length;
      if (!n) return;
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
      show();
      input.setAttribute("aria-activedescendant", `opt-${active}`);
    } else if (e.key === "Escape") {
      close();
    }
  });

  $("#search-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    if (!list.hidden && active >= 0) return choose(active);
    try {
      results = await searchCities(q);
      if (results.length) choose(0);
      else setStatus(`No results for “${q}”.`);
    } catch {
      setStatus("Search failed. Please try again.");
    }
  });

  input.addEventListener("blur", () => setTimeout(close, 100));
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== input) { e.preventDefault(); input.focus(); }
  });
}

/* ---------- Geolocation ---------- */
function locate({ silent = false } = {}) {
  if (!("geolocation" in navigator)) {
    if (!silent) setStatus("Geolocation isn't supported by your browser.");
    return Promise.resolve(false);
  }
  if (!silent) setStatus("Finding your location…", true);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const place = await reverseGeocode(+coords.latitude.toFixed(4), +coords.longitude.toFixed(4));
        await loadWeather(place);
        resolve(true);
      },
      () => {
        if (!silent) setStatus("Location access was denied. Search for a city instead.");
        resolve(false);
      },
      { timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

/* ---------- Units + tabs ---------- */
function setupControls() {
  const syncUnits = () => $$(".unit-toggle__btn").forEach((b) => {
    const on = b.dataset.unit === state.unit;
    b.classList.toggle("is-active", on);
    b.setAttribute("aria-pressed", String(on));
  });
  syncUnits();

  $$(".unit-toggle__btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (state.unit === btn.dataset.unit) return;
      state.unit = btn.dataset.unit;
      syncUnits();
      saveState();
      if (state.place) loadWeather(state.place, { remember: false });
    })
  );

  $$(".tabs__btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.chart = btn.dataset.chart;
      $$(".tabs__btn").forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", String(b === btn));
      });
      if (state.data) {
        const c = state.data.current;
        const idx = Math.max(0, state.data.hourly.time.findIndex((t) => t.slice(0, 13) === c.time.slice(0, 13)));
        renderChart(idx);
      }
    })
  );

  $("#locate-btn").addEventListener("click", () => locate());
  $("#fav-btn").addEventListener("click", toggleFavorite);

  // Refresh data every 10 minutes while the tab is visible
  setInterval(() => {
    if (!document.hidden && state.place) loadWeather(state.place, { remember: false });
  }, 10 * 60 * 1000);
}

/* ---------- Init ---------- */
async function init() {
  loadState();
  setupSearch();
  setupControls();
  renderRecent();

  const params = new URLSearchParams(location.search);
  const q = params.get("city");
  if (q) {
    try {
      const [place] = await searchCities(q);
      if (place) return loadWeather(place);
    } catch { /* fall through */ }
  }
  if (state.place) return loadWeather(state.place, { remember: false });
  // Show a default city immediately, then switch to the user's location if they allow it
  loadWeather(DEFAULT_CITY, { remember: false });
  locate({ silent: true });
}

init();
