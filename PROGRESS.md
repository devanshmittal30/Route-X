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
  - Created and executed `scripts/verify-apis.ts` testing Open-Meteo forecast, multi-location, soil moisture, elevation, geocoding, OSRM driving/foot routes, USGS earthquakes, Overpass, NASA GLC, and Open-Meteo flood.

- **Environment & MCP**:
  - Configured Supabase MCP server in `~/.gemini/antigravity/mcp_config.json`.
  - Added Git remote `origin` pointing to `https://github.com/devanshmittal30/Route-X.git`.

## In progress
- P1: User review of API verification findings (specifically NASA GLC and ORS API key).

## Questions for the user
1. **NASA Global Landslide Catalog (GLC)**: Per Rule 8 and doc 03 ("report how many events inside India fall in the last 10 years. If few or none, STOP and tell me. Do not fabricate data"):
   - The NASA FeatureServer endpoint `https://maps.nccs.nasa.gov/server/rest/services/global_landslide_catalog/glc_viewer_service/FeatureServer` is unreachable (`CURLE_COULDNT_RESOLVE_HOST`).
   - The NASA open export on data.nasa.gov concluded in March 2016 (over 10 years ago).
   - **Question**: How would you like us to handle the historical landslide layer? Options:
     - (A) Use the 2007–2016 NASA open catalogue clearly labelled as "Historical catalogue (2007–2016)", or
     - (B) Rely primarily on real-time weather + soil moisture + terrain slope + verified crowdsourced hazard reports for scoring, with a note in the UI when no recent catalogue events exist.
2. **OpenRouteService API Key**:
   - `VITE_ORS_API_KEY` is needed for the live ORS avoid-polygons check. Please add your key to `.env.local` when you have it.
3. **Geocoding Country Filter**:
   - Searching "Manali" and "Tawang" without country constraints yielded global matches (Manali in Tamil Nadu, Tawang in Indonesia). We should add `&country_code=IN` to Open-Meteo Geocoding to ensure India-focused results. Confirm if approved.

## API verification notes

| API | Status | Latency | Result | Notes |
|---|---|---|---|---|
| Open-Meteo Forecast | 200 | 1225 ms | ✅ Success | `soil_moisture_0_to_1cm` is accepted (sample values: `[0.345, 0.345, 0.345, 0.345, 0.344]` m³/m³). Multi-location call with 3 points returned 3-item array in 505ms. |
| Open-Meteo Elevation | 200 | 255 ms | ✅ Success | 5 points succeeded. Max tested coordinates accepted per call: >= 100 coordinates. |
| Open-Meteo Geocoding (Manali) | 200 | 941 ms | ✅ Success | Top match was Manali, Tamil Nadu; adding `country_code=IN` or state name targets Himachal Manali. |
| Open-Meteo Geocoding (Tawang) | 200 | 195 ms | ✅ Success | Top match was Tawang, Indonesia; adding `country_code=IN` prioritizes Tawang, Arunachal Pradesh. |
| OSRM (routed-car) | 200 | 792 ms | ✅ Success | Returned 2 alternative routes. Distance: 244 km. Code: Ok. |
| OSRM (routed-foot) | 200 | 668 ms | ✅ Success | Returned 1 route. Distance: 440 km. Code: Ok. |
| OpenRouteService Directions | Skipped | 0 ms | ⚠️ Pending Key | `VITE_ORS_API_KEY` missing in `.env.local`. Ready to test once key is provided. |
| USGS Earthquakes (M4.5+, 7 days) | 200 | 1719 ms | ✅ Success | Found 15 earthquakes in India bounding box in the last 7 days. |
| Overpass OSM Stays | 200 | 1850 ms | ✅ Success | Sample tags: `tourism`, `name`, `addr:city`. Primary endpoint can experience traffic spikes; fallback mirror recommended. |
| NASA GLC FeatureServer | Unreachable | 0 ms | ⚠️ Critical Finding | `maps.nccs.nasa.gov` host unresolvable. Historical catalog ended in March 2016. Documented in questions for user. |
| Open-Meteo Flood (Shimla) | 200 | 1241 ms | ✅ Success | `river_discharge` present in m³/s. Sample values: `[0.59, 0.58, 0.57]`. |
| Open-Meteo Flood (Guwahati) | 200 | 256 ms | ✅ Success | `river_discharge` present in m³/s. Sample values: `[0.68, 0.73, 0.73]`. |

## Cut list
- (No items cut).
