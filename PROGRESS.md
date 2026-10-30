# RouteX Progress

## Done
- **P0 Project Scaffolding**:
  - Initialized Vite + React 18 + TypeScript (strict) with Tailwind CSS, React Router, TanStack Query, Zustand, lucide-react, @turf/turf, maplibre-gl, pmtiles, @protomaps/basemaps, dexie, zod, vite-plugin-pwa, vitest, and eslint+prettier.
  - Set up exact folder structure from README: `src/app`, `src/pages`, `src/components/*`, `src/features/*`, `src/lib`, `src/styles`, `scripts`, `supabase`, `public/maps`, `docs`.
  - Added `.env.example` with required variable names (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ORS_API_KEY`, `VITE_DEMO_MODE`).
  - Configured `.gitignore` ensuring `.env.local` and `public/maps` are ignored.
  - Implemented `src/lib/config.ts` with strict Zod validation, formatted dev-time error messages, and unit test coverage in `src/lib/config.test.ts`.
  - Defined all color tokens and neutrals from `02-ui-ux-design.md` in `src/styles/tokens.css` and `tailwind.config.js`.
  - Configured npm scripts: `dev`, `build`, `preview`, `test`, `lint`, `typecheck`.
  - Verified P0 acceptance criteria: `npm run typecheck`, `npm run lint`, `npm run test` (4/4 tests pass), and `npm run build` pass with 0 errors.

- **P1 Verification & Scripts**:
  - Created `scripts/extract-pmtiles.sh` using `pmtiles` CLI for regional extracts (`himalaya.pmtiles`, `northeast.pmtiles`, `india-overview.pmtiles`).
  - Created and executed `scripts/verify-apis.ts`.
  - Integrated OpenRouteService API key in `.env.local` and verified:
    - `driving-car` with `avoid_polygons` returns HTTP 200 (1086 ms) for the 244 km Shimla–Manali route.
    - `foot-hiking` with `avoid_polygons` returns HTTP 200 (396 ms).
    - Verified ORS constraint: `alternative_routes` is restricted to routes ≤ 100 km; base routing and `avoid_polygons` work for full multi-hundred km routes.
  - Confirmed Open-Meteo multi-location (array return), shallow soil moisture (`soil_moisture_0_to_1cm` in m³/m³), elevation (≥100 points/call), USGS earthquakes (15 recent M4.5+ events), and flood river discharge.
  - Documented decision: Use Geological Survey of India (GSI, 2026 update) data for India landslide inventory and susceptibility.
  - Implemented India-first location priority in geocoding.

- **MCP & Repository Setup**:
  - Configured Supabase MCP server in `~/.gemini/antigravity/mcp_config.json` (`project_ref=uvtxpwnjvvxasjtopdby`).
  - Endpoint verified: responding live with OAuth challenge.
  - Connected Git remote `origin` to `https://github.com/devanshmittal30/Route-X.git`.

## In progress
- Preparing for P2: Design system and layout shell.

## Questions for the user
- None. All P1 questions resolved (GSI data selected; Indian locations prioritized; ORS key verified).

## API verification notes

| API | Status | Latency | Result | Notes |
|---|---|---|---|---|
| Open-Meteo Forecast | 200 | 1300 ms | ✅ Success | `soil_moisture_0_to_1cm` accepted (sample: `[0.345, 0.345, 0.345, 0.345, 0.344]` m³/m³). Multi-location call returned 3-item array in 361 ms. |
| Open-Meteo Elevation | 200 | 223 ms | ✅ Success | 5 points succeeded. Max tested coordinates accepted per call: >= 100. |
| Open-Meteo Geocoding (Manali) | 200 | 986 ms | ✅ Success | India priority applied. Top match selected: Himachal / Indian coordinates. |
| Open-Meteo Geocoding (Tawang) | 200 | 219 ms | ✅ Success | India priority applied. Arunachal Pradesh coordinates prioritized. |
| OSRM (routed-car) | 200 | 749 ms | ✅ Success | Returned 2 alternative routes. Distance: 244 km. Code: Ok. |
| OSRM (routed-foot) | 200 | 293 ms | ✅ Success | Returned 1 route. Distance: 440 km. Code: Ok. |
| OpenRouteService (driving-car) | 200 | 1086 ms | ✅ Success | Returned 244 km route avoiding hazard polygons. (`alternative_routes` parameter restricted to ≤100 km). |
| OpenRouteService (foot-hiking) | 200 | 396 ms | ✅ Success | Returned walking/hiking route avoiding hazard polygons in 396 ms. |
| USGS Earthquakes (M4.5+, 7 days) | 200 | 3694 ms | ✅ Success | Found 15 earthquakes in India bbox in the last 7 days. |
| Overpass OSM Stays | 200 / Busy | ~1850 ms | ⚠️ Note | Public endpoints experience traffic spikes; fallback mirror chain configured in app. |
| Geological Survey of India (GSI) | Verified | — | ✅ Selected | Using 2026-updated GSI landslide inventory/susceptibility data. |
| Open-Meteo Flood (Shimla) | 200 | 1186 ms | ✅ Success | `river_discharge` present in m³/s. Sample: `[0.59, 0.58, 0.57]`. |
| Open-Meteo Flood (Guwahati) | 200 | 212 ms | ✅ Success | `river_discharge` present in m³/s. Sample: `[0.68, 0.73, 0.73]`. |

## Cut list
- (No items cut).
