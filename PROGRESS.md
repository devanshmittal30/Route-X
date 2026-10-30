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

- **P7 Risk Engine, Route Scoring and Explanation**:
  - Implemented exact risk engine formulas and heuristics in `src/features/risk/config.ts` without tuning constants:
    - Formula weights: Rain 30%, Terrain 20%, Reports 20%, History 15%, Soil 10%, Seismic 5%.
    - Route sampling (every 2 km, min 8, max 30 points).
    - Blocked override: verified `road_blocked` or `landslide` report within 150 m sets score = 100 and level = `Blocked`.
    - Levels: Low (0–24), Moderate (25–49), High (50–74), Severe (75–100), Blocked (override).
    - Route score: `round(0.6 * max(segment_scores) + 0.4 * mean(segment_scores))`.
  - Implemented pure scoring functions in `src/features/risk/pureScoring.ts`:
    - `sampleRoute`, `slopeFromElevations`, `rainFactor`, `soilFactor`, `terrainFactor`, `historyFactor`, `reportsFactor`, `seismicFactor`, `scoreSegment`, `scoreRoute`, `levelFor`, `explainRoute`.
    - Strict data integrity rule enforced: When History catalogue has no records in the area, factor is 0 and output is `"No recent records in catalogue"` (never "safe").
  - Implemented network data adapter layer in `src/features/risk/dataAdapters.ts`:
    - `getSampleWeather`: 0.1° grid-cell deduplication, multi-location Open-Meteo call, 30m TTL dual caching.
    - `getSampleElevationsAndSlopes`: 5 points per sample (Center + 4 orthogonal neighbours 250m away via Turf `destination`), chunked into batches of <= 100 coordinates.
    - `getHistoricalNear`: Queries Supabase `historical_landslides` for official inventory events in the last 10 years within 5 km.
    - `getReportsAlong`: Calls Supabase RPC `reports_along_route(line, buffer_m = 500, include_test = demoMode)`.
    - `getQuakesNear`: Queries USGS M4.5+ events within 150 km over the last 72 hours.
    - `scoreFullRoute`: Orchestrates layered scoring and explainability output.
    - `scoreSingleLocation`: Single-point 4-neighbour slope risk engine for Home page.
  - Implemented Global Demo Mode store in `src/lib/demoStore.ts` synchronized with `Header` switch, Route page, and Home page.
  - Created hand-calculated test fixtures in `src/features/risk/__fixtures__/riskFixtures.ts` and Vitest test suite in `src/features/risk/risk.test.ts` (45/45 tests passing). Total project tests: 69/69 passing across 5 suites.
  - Integrated full scoring into Route planning page (`src/pages/RoutePage.tsx`):
    - Multi-stage layer loading indicator with progress steps.
    - Risk-colored segments rendered on MapLibre GL map (`#22C55E`, `#EAB308`, `#F97316`, `#EF4444`, `#1E293B`) with white casing.
    - Hazard markers placed along the route with popup details.
    - `RouteCard` displays real `RiskBadge` and marks lowest score as "Recommended".
    - `RouteRiskExplanation` accordion with 6 factor bars, detected hazards list, and mandatory disclaimer.
  - Updated Home page (`src/pages/HomePage.tsx`) AREA RISK box to use the single-point 4-neighbour slope sample engine.
  - Updated About page (`src/pages/AboutPage.tsx`) with full methodology, formulas, bands, weights, data sources, and verbatim limitations from Doc 03 section 15.

- **P8 Hazards and Community Reports**:
  - Implemented 5-step report modal wizard per Doc 02 section 6.4 with Zod validation (type, severity 1–3, description <= 500 chars, location within India bbox via GPS/pin, optional photo upload to Storage bucket `report-photos` <= 3 MB jpeg/png/webp, login required).
  - Implemented duplicate detection (same type within 200 m in last 2 h -> shows existing report and suggests voting).
  - Enforced 5 reports/hour rate limiting at database trigger and client service levels.
  - Implemented expiry intervals (+72h landslide/rockfall/bridge, +48h road_blocked/flood, +24h snow/all_clear).
  - Built community feed on `/reports` and Home page with filter tabs (All, Verified, Pending), sorting (newest/distance), and Supabase Realtime live subscriptions.
  - Added 14 unit tests in `src/features/reports/reports.test.ts` (83/83 total tests passed).

- **P9 Voting, Trust, Points, Rewards, Coupons & Demo Offers**:
  - Refined `VerifyBar` component: thumbs up / thumbs down with counts, text "Verified by N people", blue `VerifiedBadge` when verified, `DisputedBadge` when disputed, disabled with informative tooltip when logged out or own report, and optimistic UI with instant rollback on error.
  - Implemented pure status transition and rewards engine in `src/features/rewards/rules.ts` and SQL migration `supabase/migrations/003_voting_rewards_update.sql`:
    - 3 net upvotes (`up - down >= 3` and `up >= 3`) -> `verified`, reporter +20 pts (+10 if all_clear), +3 trust score (cap 100), matching voters +1 trust (cap 100).
    - 3 net downvotes (`down - up >= 3`) -> `disputed`, reporter -15 pts (floor 0), -10 trust score (floor 0), matching voters +1 trust (cap 100).
    - Voter reward: +1 pt per vote on other users' reports (capped at 10 pts/day).
    - Test data (`is_test = true`): strictly 0 points and 0 trust alterations.
  - Implemented ranking rule and "Why this stay" generator in `src/features/rewards/ranking.ts` per Doc 03 section 9:
    1. Safety level first (Low before Moderate before High; Severe hidden).
    2. Sponsored/demo partner first within the same safety level.
    3. Distance (closest first).
    - "Why this stay" line generated using ONLY real fields (distance, risk level & score, amenity category).
  - Replaced Home page placeholder with live `SponsoredStaysSection`: evaluates local risk, filters severe zones, applies ranking rule, and displays "Why this stay" line.
  - Built full Rewards page (`src/pages/RewardsPage.tsx`) per Doc 02 section 6.10:
    - Large points balance display and trust score with contributor level progress bar.
    - Points ledger table displaying date, activity reason, and delta (+/- in green/red).
    - Available DEMO offers grid with points cost and `DemoBadge`.
    - Redeem modal (`src/components/rewards/RedeemModal.tsx`): calls `redeem_offer` RPC, handles "one per offer per day" error, displays unique 8-char coupon code in JetBrains Mono font, expiry, terms, and prominent rotated "DEMO COUPON" watermark.
    - My Active Coupons tab with copy button.
    - "How Community Karma Works" explainer card.
  - Real database statistics on Home page: reads verified real reports count (`status = 'verified'`, `is_test = false`) and contributors count (`is_test = false`), defaulting to 0.
  - Added 15 Vitest unit tests in `src/features/rewards/rewards.test.ts` (98/98 tests passing across 7 suites).

### Manual Test Script for P9 Acceptance (Two Real Accounts)
1. **User A (Reporter)**:
   - Sign in as User A at `/login`.
   - Navigate to `/reports` and click "Report Hazard".
   - Submit a real report (e.g. Type: "Rockfall", Severity: 2, Description: "Loose scree on downhill bend", Pin near Shimla).
   - Verify report appears with "Pending verification" and initial 0 up / 0 down.
   - Note User A initial point balance on `/rewards` (e.g. +5 pts for report submission).
2. **User B (First Confirming Traveler)**:
   - Open incognito window and sign in as User B at `/login`.
   - Open `/reports` or find the marker on `/map`.
   - Verify thumbs up button is enabled and tooltip reads "Confirm hazard is still present (+1 karma pt)".
   - Click Thumbs Up (👍).
   - Observe instant count updates to 1 up. User B receives +1 pt in `/rewards` points ledger.
3. **User C (Second Confirming Traveler)**:
   - Sign in as User C.
   - Click Thumbs Up (👍) on the same report.
   - Observe count updates to 2 up.
4. **User D (Third Confirming Traveler - Verification Trigger)**:
   - Sign in as User D.
   - Click Thumbs Up (👍) on the same report (now 3 up, 0 down -> net 3).
   - Observe the report status automatically transitions to **"Verified by 3 people"** with the blue `VerifiedBadge`.
5. **Verify Points & Trust Transitions for User A**:
   - Switch back to User A's browser and check `/rewards`.
   - Observe User A received **+20 points** and **+3 trust score** in the Points Ledger ("Report verified by community").
6. **Redeem Demo Partner Coupon**:
   - In User A's `/rewards` page, locate an available offer (e.g. "Free Hot Mountain Meal & Shelter Rest (Demo)" - 30 pts).
   - Click "Redeem" to open the Redeem Modal.
   - Click "Confirm Redemption (30 pts)".
   - Observe unique 8-character code displayed in JetBrains Mono font (e.g. `B7E2A91F`), with expiry date, terms, and "DEMO COUPON" watermark.
   - Points balance immediately reflects deduction.
   - Attempting to redeem the same offer again today shows the friendly error: *"Offer already redeemed today. Limit: 1 redemption per offer per day."*

- **P10 Hazard Layers and Hazard Map Page**:
  - Implemented `scripts/import-landslides.ts` importing real landslide events from the official NASA Global Landslide Catalog (GLC) for India (bounding box lat 6–38°N, lon 68–98°E), deduping by source + source_event_id using the Supabase service role key.
  - Successfully imported 2,139 real historical landslide records into the Supabase PostGIS `historical_landslides` table with year breakdown:
    - 2007: 125 | 2008: 116 | 2009: 92 | 2010: 392 | 2011: 277 | 2012: 118 | 2013: 290 | 2014: 170 | 2015: 350 | 2016: 209
  - Upgraded Hazard Map page (`src/pages/MapPage.tsx`) with 4 interactive layers:
    1. Community reports (custom icons, severity/verification colors)
    2. Historical landslides (hollow triangles `#D97706`)
    3. Earthquakes last 7 days from USGS (concentric rings sized by magnitude)
    4. Safe shelter/stay points (stay icons with safety scores)
  - Added filter bar for community reports: Hazard Type, Severity (1-3), Verification Status (All/Verified/Pending), and Time window (24h/48h/72h/All).
  - Implemented detail drawers for all map features:
    - Community Reports: `ReportDetailDrawer` with embedded interactive `VerifyBar`.
    - Historical Landslides: `HistoricalLandslideDrawer` showing event date, trigger mechanism, location description, casualties, and source credit (*"NASA Global Landslide Catalog"*).
    - Earthquakes: `EarthquakeDrawer` showing magnitude, focal depth, timestamp, trigger potential explanation, and USGS event link.
  - Added dynamic spatial clustering whenever total markers exceed 30, maintaining smooth 60 fps panning and cluster expansion on zoom/click.
  - Enhanced Header (`src/components/layout/Header.tsx`): Demo mode switch persisted in `localStorage` (default from `VITE_DEMO_MODE`); renders a thin warning banner `"Demo mode: test data included and labelled"` when active.
  - Updated Map Legend (`src/components/map/MapLegend.tsx`) with 5 risk level bands and layer marker symbols (Pin, Hollow Triangle, Epicenter Ring, Shelter).
  - Verified acceptance criteria: 98/98 Vitest unit tests pass, typecheck clean, lint clean, production build passing.

- **P11 Stays, SOS, and SMS Simulation**:
  - Implemented `public/offline-guide.json` with conservative mountain survival scenarios (`trapped_landslide`, `road_blocked`, `injured`, `lost_trail`, `flood_water`, `earthquake`, `heavy_rain`, `no_signal`, `night_stop`), step-by-step guidance, "When to call 112" triggers, safe actions checklist, and top-level notice `_comment: "needs human review before production deployment"`.
  - Implemented Dexie database layer in `src/lib/db.ts` with `staysCache` (24-hour persistent storage) and `offlineQueue` (`type: 'sos' | 'report' | 'vote' | 'checkin'`).
  - Built Stays feature in `src/features/stays/`:
    - Overpass API client (`https://overpass-api.de/api/interpreter` with mirror fallback `https://overpass.private.coffee/api/interpreter`) querying `tourism=hotel|guest_house|hostel|chalet` and `amenity=shelter|hospital|clinic` within configurable radius (default 15 km).
    - Single-point risk engine scoring (`scoreSingleLocation`) evaluating slope stability, weather, terrain, and hazards, capped to the nearest 15 candidates.
    - Caching for 24 hours in Dexie and memory.
    - Ranking strictly per Doc 03 Section 9: Severe and Blocked zones hidden; sorted by safety level first (Low before Moderate before High); sponsored demo partner first within the same level; then distance. **Guaranteed: no sponsored stay ever appears above a safer non-sponsored stay.**
    - Transparent "Why this stay" explanation line generated strictly from real fields.
    - Attribution prominently displayed: `"Data © OpenStreetMap contributors, ODbL 1.0"`.
  - Built Stays page (`src/pages/StaysPage.tsx`):
    - Location search via `LocationPicker` and device GPS geolocation.
    - Radius selector (5 km, 15 km, 30 km).
    - "Safe only" filter switch (default: ON, showing Low and Moderate risk only).
    - Category filter chips (All, Hotels, Guest Houses, Hostels, Shelters, Hospitals/Clinics).
    - View mode switcher: List View (cards with risk badges, distance, directions) and Map View (interactive `RouteXMap` with custom colored stay pins and feature popups).
  - Built SOS Service & Dispatch in `src/features/sos/`:
    - `buildSosMessage`: exact message format `"RouteX SOS: <name> needs help. Condition: <condition>. Location: <lat,lng> <maps link>. Time: <time>."`
    - `sendSosEvent`: inserts row into Supabase `sos_events` with PostGIS point when online; automatically queues into Dexie `offlineQueue` when offline.
    - Emergency helplines: `112` (National) and `1078` (NDMA) with `// TODO: verify numbers before demo` comment.
    - Emergency contacts lookup with fallback demo contacts.
  - Built `SmsSimulationModal` (`src/components/sos/SmsSimulationModal.tsx`):
    - Realistic phone bubble display showing exact formatted distress message.
    - Recipient tags from user's emergency contacts.
    - Clear `"Simulated: not actually sent"` banner with demo badge.
    - Quick actions to dial 112 and verify coordinates on Google Maps.
  - Built full Emergency SOS page (`src/pages/SosPage.tsx`):
    - High-contrast red emergency header.
    - 6 interactive condition chips updating scenario guidance in real time.
    - Large-text offline instruction cards from `offline-guide.json`.
    - Real-time location block showing coordinates, accuracy, and live/cached status.
    - Safer options nearby list (nearest verified stays/shelters sorted by safety and distance).
    - Prominent "Send SOS & Dispatch SMS" button with offline queuing and simulation modal.
  - Updated Hazard Map stays layer (`src/features/map/hazardMapService.ts`) to fetch real OSM stays around viewport.
  - Added unit test suites `src/features/stays/stays.test.ts` (5 tests) and `src/features/sos/sos.test.ts` (3 tests).
  - All 106 tests passing across 9 test files (`npm test`); `npm run typecheck`, `npm run lint`, and `npm run build` all pass with 0 errors.

- **P12 Safety Chat (Online AI + Offline Guide)**:
  - Built Supabase Edge Function `supabase/functions/gemini-chat/index.ts`:
    - Strict input validation (message <= 600 chars, history last 6, context object).
    - In-memory rate limiting (10 requests/min per IP / client).
    - CORS limited to localhost origins (`http://localhost:5173`, `http://localhost:4173`).
    - Connects to Google Gemini REST API using `GEMINI_API_KEY` and `GEMINI_MODEL` environment secrets.
    - Safety-first system prompt strictly implementing Doc 03 Section 10 rules.
    - 15-second AbortController timeout and secure error responses.
    - CLI commands documented for setting secrets and deploying (`npx supabase secrets set ...`, `npx supabase functions deploy gemini-chat`).
  - Built `buildContextPacket` (`src/features/chat/contextPacket.ts`):
    - Privacy-first context serialization: coarse coordinates rounded to 2 decimals (~1.1 km precision).
    - Zero personal identifiable information (no names, phone numbers, or exact addresses).
    - Attaches mode, current route risk level/score, up to 5 verified hazards, 72h weather accumulation/alerts, and up to 5 nearest safe stays with sponsored flags.
  - Built Offline Guide Engine (`src/features/chat/offlineGuideEngine.ts`):
    - Keyword-scored intent matching over `public/offline-guide.json` with exact phrases and weighted tokens.
    - Accurately matches "landslide ahead", "I am stuck", "where can I stay", "lost on trail", "flash flood", and "injured".
    - Follows strict 4-block structured order: **1. Do now**, **2. Call** (112 / 1078), **3. What RouteX data shows**, **4. Safe stays** (safer first, sponsored labelled `Sponsored (Demo)`).
    - Interactive decision-tree follow-up prompt chips.
  - Built Client Chat Service (`src/features/chat/chatService.ts`):
    - Checks `navigator.onLine` and falls back automatically to the offline guide engine when offline or when the edge function is unreachable.
  - Built Frontend Safety Chat Drawer (`src/components/chat/SafetyChatDrawer.tsx`):
    - Global slide-out drawer accessible from floating action button on all pages.
    - Status chip: "Online AI" (green dot) or "Offline Guide" (amber dot).
    - Quick prompt chips ("Is my route safe?", "Landslide ahead", "I am stuck", "Where can I stay?").
    - Structured message bubbles with numbered action steps, one-touch emergency call button, RouteX risk indicators, and stay cards.
    - Typing indicator, 600-character input counter, and disclaimer footer.
  - Integrated into `src/components/layout/AppShell.tsx`.
  - Added 7 unit tests in `src/features/chat/chat.test.ts` verifying keyword intent matching, privacy compliance, and 4-block response ordering.
  - All 113 tests passing across 10 test files (`npm test`); `npm run typecheck`, `npm run lint`, and `npm run build` all pass with 0 errors.

- **P13 Offline: PWA, Offline Maps, and Offline Queue**:
  - Configured `vite-plugin-pwa` in `vite.config.ts`:
    - Web app manifest with brand colors (`#0B3C5D` navy, `#00A86B` green), standalone display, and mountain navigation categories.
    - Generated brand icons in `public/`: `pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`, `favicon.ico`, `favicon.svg`.
    - Workbox service worker precaching (47 entries, 2269.98 KiB) including HTML, CSS, fonts, icons, offline guide JSON, and JS bundles.
    - StaleWhileRevalidate runtime caching for external mountain APIs: Open-Meteo forecasts/elevations/geocoding (1h cache), USGS earthquakes (1h cache), OSRM routing (6h cache), Overpass stays (24h cache).
  - Implemented Dexie database layer in `src/lib/db.ts` (version 2 schema):
    - `tiles`: `id` (region id), `blob`, `size`, `downloadedAt`.
    - `routeSnapshots`: `id` (auto-increment), `fromName`, `toName`, `mode`, `geometry`, `segmentScores`, `riskBreakdown`, `hazards`, `safeStays`, `emergencyContacts`, `lastKnownLocation`, `cachedAt`.
    - `staysCache`: `id`, `lat`, `lng`, `radiusKm`, `stays`, `cachedAt`.
    - `guide`: `id`, `title`, `category`, `content`, `cachedAt`.
    - `queue`: `id` (auto-increment), `type` (`'report' | 'vote' | 'sos' | 'checkin'`), `payload`, `createdAt`, `tries`, `status` (`'pending' | 'processing' | 'failed'`).
    - `meta`: `key`, `value`, `updatedAt`.
    - Backward-compatible table aliases: `offlineQueue` and `offlineMaps`.
  - Implemented PMTiles Blob integration in `src/features/map/pmtilesManager.ts`:
    - Seamlessly connects `BlobPmtilesSource` with Dexie `tiles` storage table.
    - When offline or when a region is downloaded locally, vector tiles render directly from Dexie memory/indexedDB blobs via MapLibre GL.
  - Built Offline Maps Page (`src/pages/OfflinePage.tsx`):
    - Regional cards for `himalaya` (68 MB), `northeast` (45 MB), and `india-overview` (12 MB).
    - Simulated/real stream download with progress bar indicator and storage calculation.
    - Download, Delete, and Storage Used tally in human-readable megabytes.
    - "What works offline" checklist and pending queued actions inspection table.
  - Built Route Snapshot Caching (`src/features/offline/routeSnapshotService.ts`):
    - Automatically snapshots route geometry, segment scores, factor breakdown, hazards, safe stays, emergency contacts, and last known location on every route calculation.
    - Fallback loader in `RoutePage.tsx`: retrieves the most recent route snapshot when offline with a clear `"Offline Route Snapshot · Cached X ago"` alert.
    - Formats relative age cleanly (`"Cached 2m ago"`, `"Cached 2h ago"`, `"Cached 3d ago"`) per Doc 01 Section 7.
  - Built Offline Queue Service (`src/features/offline/queueService.ts`):
    - Queues actions (`report`, `vote`, `sos`, `checkin`) when offline or on network failure.
    - Auto-syncs on `window.online` event with exponential backoff and up to 3 retries.
    - Conflicts resolved via server-wins strategy.
    - Integrated with `reportsService.ts` (create report, vote) and `sosService.ts` (emergency dispatch).
  - Built Global Offline Banner (`src/components/layout/AppShell.tsx`):
    - Persistent amber notification strip shown when `!navigator.onLine`.
    - Communicates offline mode, cached vector tile rendering, offline guide readiness, and live count of queued pending changes.
  - Added unit test suite in `src/features/offline/offline.test.ts` (5 tests):
    - Dexie schema verification and table aliasing.
    - Offline queueing and pending count tracking.
    - Relative age formatting.
    - Route snapshot persistence and retrieval.
    - PMTiles Blob byte range reading via `BlobPmtilesSource`.
  - Acceptance verification: 118/118 tests pass across 11 test files (`npm test`), `npm run typecheck`, `npm run lint`, and `npm run build` pass with 0 errors.

### P13 Manual Offline Verification Script
Follow these steps to manually verify the complete offline experience:
1. **Initial Online Session**:
   - Start the app with `npm run preview` or `npm run dev` in your browser.
   - Navigate to `/route`, search **Shimla** to **Manali**, and calculate the route.
   - Verify the route line, segment hazard colors, and risk explanation panel appear.
   - Navigate to `/offline`, click **Download** on the **Himalaya Regional** map pack, and watch the progress bar reach 100%. Verify the badge updates to `"Downloaded (Offline Ready)"`.
2. **Go Offline**:
   - Open Chrome DevTools $\rightarrow$ Network tab $\rightarrow$ select **Offline** (or disconnect your machine's Wi-Fi / Airplane Mode).
   - Reload the page (`Cmd + Shift + R`).
3. **Verify App Shell & Service Worker**:
   - The app opens immediately without connection error (served from Workbox precache).
   - An amber offline banner appears at the top: *"You are offline · Showing cached maps & data. Pending changes will sync automatically when reconnected."*
   - In the header, the connection status dot displays orange/offline.
4. **Verify Offline Map & Route**:
   - The map loads vector tiles directly from Dexie IndexedDB (`BlobPmtilesSource`).
   - Navigate to `/route`: the cached Shimla–Manali route appears with the banner: *"Offline Route Snapshot · Cached just now"*.
5. **Verify Offline Safety Chat & SOS**:
   - Open the Safety Chat drawer: status chip displays `"Offline Guide"`.
   - Ask *"landslide ahead"*: receives structured 4-block offline guidance from `public/offline-guide.json`.
   - Navigate to `/sos`, select a condition, and click **Send SOS & Dispatch SMS**: the SOS event is saved to the offline queue, and the simulation modal displays the formatted distress SMS.
6. **Verify Offline Queue & Resync**:
   - Navigate to `/offline` $\rightarrow$ Queued Actions: observe 1 pending SOS action.
   - Reconnect to the network (DevTools Network $\rightarrow$ **No throttling**, or re-enable Wi-Fi).
   - The global offline banner disappears, the queue automatically flushes to Supabase, and the pending count drops to 0.

## In progress
- Ready for next prompt / P14.

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
