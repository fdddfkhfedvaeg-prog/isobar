# iPhone 18 Pro Max: interactive 3D experience

A cinematic, scroll-driven Three.js showcase of the iPhone 18 Pro Max, a bento feature section, and a 2–3-way spec comparison across the iPhone lineage since 2007.

React 19 · TypeScript · Tailwind v4 · three.js / react-three-fiber / drei · Supabase · Sentry · Vite

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # comparison engine + scroll timeline
npm run build        # typecheck + production build
```

It runs with no configuration: data comes from the bundled seed and Sentry stays off. Optional settings are in `.env.example`.

## What's inside

| | |
| --- | --- |
| **3D stage** (`src/three`) | A procedural PBR phone. The brushed, anisotropic aluminium frame, frosted clear-coat back, transmissive lens covers and iridescent lens coatings are all generated in code, so there are no texture downloads. Internals (A20 board with a glowing die, battery, MagSafe ring) appear in the exploded view. Scroll choreography covers the arrival, a 360° turn, the exploded view, a camera close-up and the display. You can drag to spin, and the pointer adds parallax. A colorway and lighting-studio switcher changes the materials in real time. |
| **Comparison** (`src/components/Compare.tsx`, `src/lib/compare.ts`) | Pick 2–3 models or use a preset. The best value per row is highlighted, each column shows its % change vs the baseline (green or red by whether that's better), an "only differences" filter hides matching rows, and a spec drawer shows one model's full sheet. Contract and full retail prices are never ranked against each other. |
| **Database** (`supabase/migrations`) | A normalised schema with enums, RLS (public read-only) and a flat `iphone_lineage` view. The seed is generated from `src/data/lineage.ts` with `npm run seed:sql`. |
| **Resilience** | WebGL2 probe, error boundary, context-loss handler and a CSS still-image fallback; Sentry reporting is enabled when `VITE_SENTRY_DSN` is set. |
| **Edge** | `public/_headers` (shared by Netlify and Cloudflare Pages) holds immutable caching for hashed assets and models, plus CSP. `netlify.toml` and `wrangler.jsonc` are included. |

Architecture, design tokens, wireframe, choreography table and performance budget: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Supabase

```bash
supabase db push                         # applies 0001 schema + 0002 seed
# then set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
```

## Deploy

- **Netlify**: base directory `iphone-18`; `netlify.toml` covers the rest.
- **Cloudflare**: `npm run build:deploy && npx wrangler deploy`, or Pages with output directory `dist`.

`build:deploy` uploads source maps to Sentry when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` are set, then deletes them from `dist`.

## Data notes

Historical rows come from Apple's published tech specs. The **iPhone 18 Pro Max row is `verified: false`**: its figures are placeholders and must be checked against Apple's spec sheet before launch. The UI marks those values with †.

Concept project; not affiliated with Apple Inc.
