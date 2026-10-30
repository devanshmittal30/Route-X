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

- **P2 Design System & Layout Shell**:
  - Installed `@fontsource/inter` (400, 500, 600) and `@fontsource/jetbrains-mono` (400, 600).
  - Configured typography scale (`h1`, `h2`, `h3`, `body`, `small`) and border radius tokens (`rounded-card`, `rounded-btn`, `rounded-chip`).
  - Implemented core UI components in `src/components/ui/`: `Button` (primary/secondary/danger/ghost with loading), `Card`, `Badge`, `RiskBadge`, `RiskMeter`, `TestBadge`, `DemoBadge`, `SponsoredBadge`, `VerifiedBadge`, `Banner`, `Modal`, `Drawer`, `Tabs`, `Toast`, `Skeleton`, `EmptyState`, `Input`, `Select`, `Switch`.
  - Implemented layout components in `src/components/layout/`: `Header`, `Footer`, `MobileTabBar`, `AppShell`.
  - Configured all 14 routes in `src/app/App.tsx` and interactive `/design-system` page.

- **P3 Supabase Schema, RLS, Functions & Auth**:
  - Created `supabase/migrations/001_init.sql` containing:
    - PostGIS extension, custom types (`report_type`, `report_status`), and 11 core tables (`profiles`, `emergency_contacts`, `hazard_reports`, `report_votes`, `points_ledger`, `historical_landslides`, `partners`, `offers`, `redemptions`, `sos_events`, `saved_routes`, `weather_cache`).
    - Row Level Security (RLS) policies for all tables.
    - Triggers: `handle_new_user()` on `auth.users` creating a profile, and `set_report_defaults()` setting expiry intervals by type.
    - Security Definer functions: `reports_near()`, `reports_along_route()`, `cast_vote()`, `redeem_offer()`, and `expire_reports()`.
  - Created `supabase/seed.sql` with:
    - 8 realistic hill/Northeast test hazard reports (`is_test = true`, descriptions starting with `[TEST]`).
    - 4 fictional demo partners with redeemable offers (`is_demo = true`, neutral invented names).
    - Zero fake users, fake weather, or fake historic events.
  - Created `supabase/rls_proof.sql` demonstrating that RLS blocks reading other users' emergency contacts and private profiles.
  - Implemented `src/lib/supabase.ts` client.
  - Implemented `src/features/auth/AuthContext.tsx` session provider (email + password, Google OAuth, sign out, profile fetching).
  - Implemented `ProtectedRoute.tsx` route guard.
  - Implemented full `LoginPage.tsx` (Sign in / Sign up / Google OAuth toggle) and `ProfilePage.tsx` (Display name & phone editor, emergency contacts CRUD).

- **MCP & Repository Setup**:
  - Configured Supabase MCP server in `~/.gemini/antigravity/mcp_config.json` (`project_ref=uvtxpwnjvvxasjtopdby`).
  - Connected Git remote `origin` to `https://github.com/devanshmittal30/Route-X.git`.
  - Configured project environment with live Supabase credentials (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
  - Automatically provisioned the public storage bucket `report-photos` on Supabase with 3 MB size limit and image MIME restrictions.
  - Successfully applied and verified live database schema, PostGIS spatial extension, RPC functions (`reports_near`, `reports_along_route`), and seed data (8 test reports, 4 partners, 4 offers).

- **P4 Map Foundation with PMTiles & MapLibre GL**:
  - Implemented `RouteXMap` in `src/components/map/RouteXMap.tsx` with MapLibre GL JS and Protomaps vector style (`@protomaps/basemaps` light flavour).
  - Registered `pmtiles://` protocol singleton using `pmtiles.Protocol`.
  - Created custom PMTiles Source abstraction in `src/features/map/pmtilesSources.ts` with two implementations:
    - `HttpPmtilesSource`: Chunked range request fetcher with ETag and Cache-Control headers.
    - `BlobPmtilesSource`: In-memory and IndexedDB `Blob.slice()` byte reader ready for offline storage (P13).
  - Implemented viewport-based regional file selection in `pmtilesManager.ts`:
    - `himalaya.pmtiles` for bounding box `[74, 28.5, 81, 37]` (Shimla, Manali, UK, J&K).
    - `northeast.pmtiles` for bounding box `[87.5, 21.5, 97.5, 29.5]` (Guwahati, Shillong, Tawang).
    - `india-overview.pmtiles` for national zoom (`zoom < 7`) and fallback outside regional bboxes.
    - Graceful missing file detection with friendly user-facing alert without canvas crash.
  - Implemented `LayerManager` API in `src/features/map/LayerManager.ts`: `addGeoJSONLayer`, `removeLayer`, `toggleLayer`, `fitToBounds`, `flyTo`, `addMarker` (with custom Lucide SVG pins and risk tokens), and `clearMarkers`.
  - Built map controls: Zoom navigation, Geolocate, Metric scale bar, OpenStreetMap attribution, collapsible `LayerPanel`, and `MapLegend`.
  - Added click-to-pin coordinate selection with live HUD coordinates badge.
  - Built interactive test suite on `/map` page (`src/pages/MapPage.tsx`) with quick viewport jump buttons and sample risk marker toggling.
  - Added comprehensive unit tests in `src/features/map/pmtiles.test.ts` (7/7 tests passing).

- **P5 Weather Service, Home Page and Alerts**:
  - Implemented Open-Meteo client in `src/features/weather/openMeteoClient.ts` with Zod schema validation, 8 s timeout + 1 automatic retry, multi-location batching, and 30-minute dual caching (in-memory + Supabase `weather_cache` table).
  - Implemented USGS earthquakes client in `src/features/quakes/usgsClient.ts` querying M4.5+ events in the India bounding box within 72 hours, with Haversine distance calculations to the selected location.
  - Implemented interactive `LocationPicker` with live Open-Meteo geocoding search (India-priority) and browser GPS geolocation.
  - Built `WeatherBox` component in `src/components/weather/WeatherBox.tsx` supporting:
    - 3 visual states: loading skeleton, live value with unit/source/updated time, error state with retry button, and offline cached state with age badges (`10m ago`, `2h ago`).
  - Built `AlertsStrip` component in `src/components/weather/AlertsStrip.tsx` with IMD-style rain categories (Heavy, Very Heavy, Extremely Heavy), wind gusts (>= 50 km/h), snowfall, and seismic alerts within 300 km. Shows "No active alerts from forecast data" when clear.
  - Implemented complete Home page wireframe from Doc 02 section 6.1:
    - 8 WeatherBoxes (Temperature, Rain 24h, Rain 72h, Wind & Gusts, Humidity, Snow 24h, Soil Wetness, Quakes 72h).
    - AREA RISK box with clearly labeled "single-point estimate".
    - Route planning search card with Drive/Walk toggle and swap button navigating to `/route`.
    - Mini hazard map using `RouteXMap` synchronized with the active location.
    - Recent community reports feed placeholder (`EmptyState`).
    - Verified safe stays placeholder (`Sponsored (Demo)`).
    - Community karma & rewards teaser.
    - 4-step How It Works breakdown.
    - Real database statistics (verified reports, contributors, safe stays) excluding test data.
  - Added Vitest unit test suite in `src/features/weather/weatherHelpers.test.ts` (19/19 tests passing).

- **P6 Geocoding and Routing**:
  - Implemented geocoding client in `src/features/routing/geocoding.ts` with Open-Meteo as primary (India-prioritized) and Photon as fallback.
  - Implemented OSRM client in `src/features/routing/osrmClient.ts` using `routed-car` and `routed-foot` path prefixes with `alternatives=true`, `overview=full`, `geometries=geojson`, and `steps=true`.
  - Added 8-second timeout with AbortController and 1 automatic retry, plus clear, human-friendly error messages (NoRoute, ServiceBusy, timeout).
  - Built `RouteAutocomplete` component in `src/components/routing/RouteAutocomplete.tsx` with debounced search, clear button, and "Pick on map" capability.
  - Built `RouteCard` component in `src/components/routing/RouteCard.tsx` displaying mode icon, distance, duration, and neutral "Risk: pending" chip (**strictly no fake numbers**).
  - Implemented full Route Planning page in `src/pages/RoutePage.tsx`:
    - 380px left panel with From/To autocompletes, swap button, Drive/Walk mode toggle, and "Pick on map" interactive pin placer.
    - Selected route turn-by-turn steps summary accordion.
    - Action buttons: "Auto re-route (safer)" preview, "Save route", and "Share route" (copies link with URL query params).
    - MapLibre GL map integration: primary route line rendered in brand blue (`#0B3C5D`) with 2px white casing; alternative routes rendered in 50% dashed grey (`#94A3B8`).
    - Origin start pin and destination end marker with automatic `fitToBounds` padding.
    - Supports URL search parameters from Home page (`?from=...&to=...&mode=...`).
  - Added Vitest unit test suite in `src/features/routing/routing.test.ts` (24/24 tests passing).

## In progress
- Ready for P7 (Route risk scoring engine).

## Questions for the user
- None. Ready for next prompt.

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
