# 03. Tech Stack, APIs and Technical Design: RouteX

Checked against public sources on 30 Oct 2026. Free-tier limits change; items marked **VERIFY** must be re-checked by calling the API once in Phase 0 and noting the result in `PROGRESS.md`. If something differs, stop and ask the user.

## 1. Architecture
```
Browser (React PWA, laptop)
 ├─ MapLibre GL + PMTiles (basemap from local/IndexedDB file)
 ├─ Risk engine (TypeScript, pure functions, unit-tested)
 ├─ IndexedDB (Dexie): cached routes, risk, stays, guide, offline queue, PMTiles blobs
 ├─ Service worker (app shell cache)
 │
 ├──► Open-Meteo (weather, soil moisture, elevation, geocoding)        no key
 ├──► OSRM FOSSGIS (routes + alternatives, car/foot)                   no key
 ├──► OpenRouteService (avoid areas re-route, foot-hiking)             free key
 ├──► USGS earthquake GeoJSON                                          no key
 ├──► Overpass API / Photon (hotels, shelters, hospitals, geocoding)   no key
 └──► Supabase (Auth, Postgres+PostGIS, Storage, Realtime, Edge Function)
          └─ Edge Function "gemini-chat" ──► Gemini API (free tier)    key stays server-side
```

## 2. Stack
| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + Vite + TypeScript (strict) | fast, well supported by AI coding tools |
| Styling | Tailwind CSS + CSS variables (tokens from doc 02) | consistent design system |
| Icons | lucide-react | matches icon names in doc 02 |
| Routing (pages) | React Router | simple |
| State/data | Zustand (UI state), TanStack Query (API caching) | caching and retries |
| Map | MapLibre GL JS + `pmtiles` + `@protomaps/basemaps` (light flavour) | free, offline-capable vector maps (**VERIFY** package API) |
| Geo maths | `@turf/turf` | buffers, distances, line sampling, nearest point |
| Offline storage | Dexie (IndexedDB) | PMTiles blobs, cache, queue |
| PWA | `vite-plugin-pwa` (Workbox) | service worker |
| Backend | Supabase (free plan) | Auth, Postgres + PostGIS, Storage, Realtime, Edge Functions |
| AI chat | Gemini API via Supabase Edge Function | free tier key from Google AI Studio |
| Tests | Vitest (risk engine, points rules), Playwright optional | correctness of formulas |
| Charts | Recharts (risk breakdown, optional) | |
| Hosting | Run locally for the demo (`npm run dev` or `npm run build && npm run preview`); Supabase hosted | laptop-only demo |

## 3. Accounts and keys to create now (all free)
1. **Supabase** project (free plan): URL + anon key. Free plan notes (checked): 500 MB database, 1 GB file storage, 50,000 monthly active users, 2 active projects, **project pauses after 1 week of inactivity** (open the project before the demo).
2. **Google AI Studio** API key for Gemini (Google account needed, no card). Free tier exists for Flash/Flash-Lite class models; exact limits are shown in AI Studio. Free-tier content may be used by Google to improve products, so never send personal data.
3. **OpenRouteService** account and free API key (about 2000 directions/day, 40/min as of the sources found; **VERIFY** in dashboard).
4. **Google OAuth client** (Google Cloud Console, free) for Supabase "Sign in with Google": add the Supabase callback URL. If this takes too long, ship email/password first and add Google after.
5. (Stretch X2) **NASA Earthdata** free account for satellite rainfall/soil moisture.
No other accounts. No paid keys.

## 4. External data and APIs
| Need | Service | Endpoint (base) | Key? | Limits / terms | Status |
|---|---|---|---|---|---|
| Weather forecast + past days | Open-Meteo Forecast | `https://api.open-meteo.com/v1/forecast` | No | Free for **non-commercial** use; under 10,000 calls/day, 5,000/hour, 600/min; CC BY 4.0 attribution required; forecast up to 16 days; recent past up to about 92 days via `past_days` | Verified in sources |
| Multi-point weather | same | pass comma-separated `latitude=a,b,c&longitude=x,y,z` | No | each location counts toward limits | **VERIFY** |
| Soil moisture (surface) | Open-Meteo hourly variables such as `soil_moisture_0_to_1cm` | same forecast endpoint | No | | **VERIFY** variable names |
| Historical weather (for ML stretch) | Open-Meteo Archive (ERA5, from 1940) | `https://archive-api.open-meteo.com/v1/archive` | No | same terms | Verified in sources |
| Elevation / slope | Open-Meteo Elevation | `https://api.open-meteo.com/v1/elevation` | No | many coordinates per call (check max) | **VERIFY** |
| Geocoding | Open-Meteo Geocoding | `https://geocoding-api.open-meteo.com/v1/search?name=` | No | | **VERIFY**; alternative Photon `https://photon.komoot.io` (fair use) |
| Routes + alternatives | OSRM (FOSSGIS) | `https://routing.openstreetmap.de/routed-car/route/v1/driving/{lon,lat;lon,lat}?alternatives=true&overview=full&geometries=geojson&steps=true` and `routed-foot/route/v1/foot/...` | No | shared community server, fair use, keep light | Verified in sources (note: use the `routed-foot`/`routed-car` path prefixes, otherwise profile is ignored) |
| Avoid-area re-route, hiking profile | OpenRouteService Directions | `https://api.openrouteservice.org/v2/directions/{profile}/geojson` with profiles `driving-car`, `foot-walking`, `foot-hiking` and body option `options.avoid_polygons` | Yes (free) | about 2000/day, 40/min | **VERIFY** (alternative_routes limits and avoid_polygons size limits) |
| Earthquakes | USGS FDSN Event + summary feeds | `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4.5&starttime=...&minlatitude=..&maxlatitude=..&minlongitude=..&maxlongitude=..` and `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson` | No | public domain; credit USGS; coordinates are [lon, lat, depth_km] | Verified in sources |
| Historical landslides | NASA Global Landslide Catalog (GLC) | export on data.nasa.gov (one-time export **current to March 2016**) and the maintained catalogue at `https://maps.nccs.nasa.gov/server/rest/services/global_landslide_catalog/glc_viewer_service/FeatureServer` | No | credit Kirschbaum et al. 2010 (doi:10.1007/s11069-009-9401-4) and 2015 (doi:10.1016/j.geomorph.2015.03.016) | **VERIFY**: the 2016 export is too old for the "recent only" rule. In Phase 0 query the FeatureServer for events from the last 10 years inside India. If it has too few, report to the user; do not substitute invented data |
| Landslide hazard (context/validation) | NASA LHASA (satellite rainfall + susceptibility) | `https://landslides.nasa.gov` and ArcGIS service `https://gis.earthdata.nasa.gov/gis05/rest/services/Landslides/LHASA_Exposure/MapServer` (exposure maps, 2001 to mid-2026 range) | No | US gov public use; cite NASA | **VERIFY** whether a live nowcast layer is queryable. Treat as optional overlay/validation only |
| Hotels, shelters, hospitals | OpenStreetMap via Overpass | `https://overpass-api.de/api/interpreter` (or mirror `https://overpass.private.coffee/api/interpreter`) with tags `tourism=hotel|guest_house|hostel|chalet`, `amenity=shelter|hospital|clinic` | No | fair use, cache 24 h, ODbL attribution | Verified in sources (services exist) |
| Basemap tiles | Protomaps PMTiles extracts | build file from `https://build.protomaps.com/` using the `pmtiles extract ... --bbox=... --maxzoom=12` CLI | No | OSM data ODbL; self-hosted, no bulk-downloading OSM tile servers | Verified in sources |
| Satellite rainfall/soil moisture (stretch) | NASA GPM IMERG, SMAP via Earthdata | requires free Earthdata login | Account | heavy to integrate | Stretch only |

India bounding box used for earthquake/historic filters (start values, refine if the user agrees): lat 6 to 38, lon 68 to 98.
Region extracts to prepare: **Himachal + Uttarakhand + J&K/Ladakh south** (approx lat 28.5 to 37, lon 74 to 81), **Northeast India** (approx lat 21.5 to 29.5, lon 87.5 to 97.5), **India overview** at low zoom (max zoom 7-8). Confirm file sizes; keep each under about 500 MB.

## 5. Data model (Supabase SQL; save as `supabase/migrations/001_init.sql`)
```sql
create extension if not exists postgis;

create type report_type as enum ('landslide','road_blocked','flood','snow','rockfall','bridge_damage','all_clear');
create type report_status as enum ('pending','verified','disputed','resolved','expired');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  phone text,
  points int not null default 0 check (points >= 0),
  trust_score int not null default 50 check (trust_score between 0 and 100),
  created_at timestamptz not null default now()
);

create table emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null, phone text not null, relation text
);

create table hazard_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  type report_type not null,
  severity smallint not null check (severity between 1 and 3),
  description text check (char_length(description) <= 500),
  geom geography(Point,4326) not null,
  photo_path text,
  status report_status not null default 'pending',
  is_test boolean not null default false,
  up_count int not null default 0,
  down_count int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  resolved_at timestamptz,
  resolves_report_id uuid references hazard_reports(id)
);
create index hazard_reports_geom_idx on hazard_reports using gist (geom);
create index hazard_reports_status_idx on hazard_reports (status, expires_at);

create table report_votes (
  report_id uuid not null references hazard_reports(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  delta int not null, reason text not null, ref_id uuid,
  created_at timestamptz not null default now()
);

create table historical_landslides (
  id bigint generated always as identity primary key,
  source text not null, source_event_id text,
  event_date date not null,
  geom geography(Point,4326) not null,
  trigger text, fatalities int, location_text text,
  unique (source, source_event_id)
);
create index hist_geom_idx on historical_landslides using gist (geom);

create table partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('stay','food','gear','transport')),
  description text, city text,
  geom geography(Point,4326),
  is_demo boolean not null default true
);

create table offers (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  title text not null, description text,
  points_cost int not null check (points_cost > 0),
  valid_until date, is_demo boolean not null default true
);

create table redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  offer_id uuid not null references offers(id),
  code text not null unique,
  status text not null default 'issued',
  created_at timestamptz not null default now()
);

create table sos_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  condition text, message text,
  geom geography(Point,4326),
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

create table saved_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  from_label text, to_label text, mode text check (mode in ('drive','walk')),
  geometry jsonb not null, risk_score int, created_at timestamptz not null default now()
);

create table weather_cache (
  cache_key text primary key, payload jsonb not null, fetched_at timestamptz not null default now()
);
```
**Functions / triggers to write (security definer where noted):**
- `handle_new_user()` trigger on `auth.users` inserts a `profiles` row.
- `reports_near(lat double precision, lng double precision, radius_m int)` returns non-expired, non-disputed reports (respecting Demo mode flag passed as a parameter).
- `reports_along_route(line geojson, buffer_m int, include_test boolean)` returns reports within the buffer of the route line.
- `cast_vote(report_id uuid, vote smallint)` (security definer): blocks own-report votes, upserts vote, recounts `up_count`/`down_count`, updates `status` (rules below), awards points via ledger, caps voter points at 10/day.
- `redeem_offer(offer_id uuid)` (security definer): checks balance and "one per offer per day", deducts points, inserts ledger and redemption with a random 8-character code, returns the code; all in one transaction.
- `expire_reports()` scheduled (pg_cron if available, else called from the app on load) sets `expired` where `expires_at < now()`.

**Row Level Security (enable on all tables):** profiles (read own, update own); emergency_contacts (own only); hazard_reports (read all non-test and test; insert as self; update/delete none from client except via functions); report_votes (read own; insert via function); points_ledger (read own); partners/offers (read all); redemptions (read own; insert via function); sos_events (insert as self, read own); saved_routes (own only); historical_landslides and weather_cache (read all; write by service role/import script only).

## 6. Route risk engine (TypeScript, `src/features/risk/`)
All numbers below are **starting heuristics, not validated science**. Put them in `src/features/risk/config.ts` so they can be tuned. The About page and judges' answers must describe this as an **explainable risk estimate**.

### 6.1 Sampling
1. Decode route geometry. Sample a point every 2 km (min 8, max 30 samples per route). Each sample has a segment (the stretch to the next sample).
2. Group samples into 0.1 degree grid cells; fetch weather once per cell (multi-location call). Cache 30 minutes (memory + `weather_cache`).
3. Terrain: for each sample get elevation at the point and at four neighbours about 250 m away (N, S, E, W) from the Open-Meteo elevation API; slope degrees = max(abs(dz)) / 250 m converted with atan. Cache by rounded coordinates.

### 6.2 Factors (each normalised to 0..1)
- **Rain** = 0.7 x min(1, accum / 120) + 0.3 x min(1, maxHourly / 30), where accum = rain past 72 h + 0.5 x rain next 48 h (mm), maxHourly = max hourly precipitation in the next 24 h (mm/h).
- **Soil** = clamp((soilMoisture - 0.15) / (0.40 - 0.15), 0, 1) using the latest hourly shallow soil moisture (m3/m3). Thresholds are starting values, **VERIFY** with typical ranges from the API and adjust.
- **Terrain** = clamp((slopeDeg - 10) / (35 - 10), 0, 1).
- **History** = min(1, N / 5), N = historical landslides within 5 km of the sample in the last 10 years (from `historical_landslides`). If the catalogue has no records in the area, the factor is 0 and the UI says "No recent records in catalogue" (never "safe").
- **Reports** = max over reports within 500 m of the sample (non-expired, not disputed, test only if Demo mode): typeFactor x confidence. typeFactor: landslide 1.0, road_blocked 1.0, rockfall 0.8, flood 0.8, bridge_damage 0.9, snow 0.5, all_clear 0 (and an all_clear with votes reduces the weight of reports it resolves). confidence: verified = 1.0; pending = min(1, 0.4 + 0.2 x up_count). Severity multiplier 0.6 / 0.8 / 1.0.
- **Seismic** = max over USGS events M4.5+ in the last 72 h within 150 km: clamp((mag - 4.5) / 1.5, 0, 1) x (1 - distanceKm / 150).

### 6.3 Segment score
`score = 100 x (0.30 Rain + 0.20 Terrain + 0.20 Reports + 0.15 History + 0.10 Soil + 0.05 Seismic)`
Override: a **verified** road_blocked or landslide report within 150 m of the segment sets score = 100 and status = Blocked.
Levels: Low 0-24 · Moderate 25-49 · High 50-74 · Severe 75-100 · Blocked (override).
Route score = round(0.6 x max(segment scores) + 0.4 x mean(segment scores)). Output also top contributing factors with values and sources for the "Why this score" panel.

### 6.4 Alerts derived from forecast (for the Home alerts strip)
IMD-style rain categories on 24 h forecast accumulation: Heavy 64.5-115.5 mm, Very heavy 115.6-204.4 mm, Extremely heavy above 204.4 mm (**VERIFY** categories before using the names). Wind alert if gusts >= 50 km/h (heuristic). Snow alert if forecast snowfall >= 5 cm / 24 h (heuristic). Earthquake alert for M4.5+ within 300 km in 72 h. Each alert stores source and time.

### 6.5 Stretch: ML model (X1)
Build a labelled dataset: positives = recent historical landslide events in India (from the verified catalogue); negatives = random mountain points/dates without events. Features: rainfall 3-day and 7-day totals (Open-Meteo archive), slope, elevation. Train logistic regression in a Python script (`scripts/train_model.py`), report ROC-AUC honestly, export coefficients to `src/features/risk/model.json`, and blend with the rule score (e.g. 50/50) only if it improves validation. Document that media-reported catalogues are biased.

## 7. Routing and auto re-route
1. Base: OSRM (`routed-car` or `routed-foot`) with `alternatives=true`; take up to 3 routes.
2. Score each route (section 6). Mark best (lowest score) as "Recommended".
3. Auto re-route (when recommended route is High/Severe/Blocked): for each hazard (verified blocked/landslide report, or segment with score >= 75), make a circle polygon of 400 m radius (Turf `circle`, 16 steps) and send to ORS Directions with `options.avoid_polygons` (MultiPolygon) and profile `driving-car` (Drive) or `foot-hiking` (Walk). Score the returned route and show side by side.
4. If ORS fails or returns no route: say "No route found that avoids the hazard; showing the lowest-risk option" and keep OSRM alternatives.
5. All three timeouts 8 s, one retry.

## 8. Reports, votes, trust, points
- **Status rules**: `pending` -> `verified` when up_count - down_count >= 3 and up_count >= 3; -> `disputed` when down_count - up_count >= 3; -> `expired` at `expires_at`; -> `resolved` when an `all_clear` report linked via `resolves_report_id` becomes verified.
- **Expiry defaults**: landslide/rockfall/bridge 72 h; road_blocked/flood 48 h; snow 24 h; all_clear 24 h.
- **Points** (ledger, balance never below 0): submit report +5 (max 5 rewarded reports/day); report becomes verified +20 to reporter; vote on someone else's report +1 (max 10 points/day from voting); all_clear verified +10 to its author; report becomes disputed: -15 points (floor 0) and -10 trust; verified report +3 trust to reporter; user whose votes match the final outcome +1 trust (cap 100).
- **Rate limits**: max 5 reports/hour/user; duplicate check: same type within 200 m within 2 h -> suggest voting.
- Test data (`is_test`) never awards points or changes trust or stats.
- Realtime: subscribe to `hazard_reports` and `report_votes` changes so counts update live for the demo (use Supabase Realtime).

## 9. Offers and sponsored stays (demo)
`partners`/`offers` rows are **fictional, flagged `is_demo`**, with invented neutral names (for example "Demo Pine Valley Homestay"). Real nearby hotels come from OpenStreetMap and are never presented as partners. Ranking rule everywhere: (1) location safety level (Low before Moderate before High; hide Severe), (2) sponsored/demo partner first within the same level, (3) distance. Every card says why it was suggested using real numbers (risk level at the stay's location, distance, OSM amenity tags).

## 10. AI chat design
- **Edge Function `gemini-chat`** (`supabase/functions/gemini-chat/index.ts`): receives `{message, history (last 6), context}`; validates size (message <= 600 chars); adds the system prompt; calls the Gemini API with `GEMINI_API_KEY` and `GEMINI_MODEL` (choose a Flash/Flash-Lite model that Google AI Studio lists as free at build time; **do not hard-code**); returns text. Rate limit 10 requests/min per user (in memory or table). CORS limited to localhost.
- **Context packet** (built in the browser, no personal data): rounded location (2 decimals), mode, current route risk breakdown, up to 5 nearest verified reports (type, distance, verified count, age), 72 h forecast summary, up to 5 nearest safe stays (name, type, distance, safety level, sponsored flag).
- **System prompt rules**: you are RouteX Safety Assistant for hill and Northeast India; give short numbered actions; first immediate safety steps, then emergency numbers (112) if life is at risk, then what the data shows, then stay options (safer first; sponsored labelled "Sponsored (Demo)" and only if safe); never invent facts, distances or hazards not in the context; admit uncertainty; no medical diagnosis beyond basic first aid; do not claim to be an official authority; keep answers under 180 words unless asked.
- **Offline guide** (`public/offline-guide.json`): scenarios (landslide ahead, trapped in vehicle, trek injury, lost on trail, flood or rising water, earthquake, heavy rain on road, no signal, night stop), each with 4-6 short steps, "when to call 112", and a link to the cached safe stays list. Intent matching by keyword score; fallback menu of scenarios. Content must be conservative general guidance (move away from the slide path to higher stable ground, do not cross debris or fast water, avoid river channels and steep cuttings during heavy rain, protect head, stay visible, share location, conserve phone battery). A human must review the text before the demo.
- Online/offline decision: `navigator.onLine` plus a failed request fallback -> offline guide with a "Offline guide" chip.

## 11. Offline architecture
- App shell cached by Workbox (precache). API responses use stale-while-revalidate for weather/risk, with timestamps stored.
- **PMTiles in IndexedDB**: Offline page downloads the region `.pmtiles` file as a Blob (with progress) into Dexie; a custom PMTiles `Source` (`getBytes(offset, length)` from the stored Blob) feeds MapLibre. Online and offline map use the same Source type so behaviour is identical.
- Cached per checked route: geometry, segment scores, risk breakdown, hazards, safe stays, timestamp; plus emergency contacts, offline guide, last known location.
- Offline queue (Dexie table): reports, votes, SOS events, check-ins; flush on `online` event with retry; show queue count.

## 12. Notifications
- MVP: in-app alert + `Notification` browser API when permission is granted, triggered on risk level increase for saved routes and on new verified hazard within 5 km of the route (Supabase Realtime).
- **SMS**: simulated pop-up only (decision confirmed). Stretch X3: real Web Push via service worker.

## 13. Security and privacy
RLS everywhere; validate all inputs (zod); sanitise descriptions (no HTML); limit upload size (photos <= 3 MB, jpeg/png/webp); strip EXIF client-side if time allows; Gemini key only in Edge Function secrets; ORS key is visible in the browser for this laptop demo (acceptable; rotate afterwards); no personal data to AI; privacy note on Profile page.

## 14. Attribution (show in footer and About)
© OpenStreetMap contributors (ODbL) · Weather data by Open-Meteo.com (CC BY 4.0) · USGS Earthquake Hazards Program · NASA Global Landslide Catalog (Kirschbaum et al.) · Protomaps basemap data · OpenRouteService / OSRM (FOSSGIS).

## 15. Known limits (state honestly to judges)
No free live landslide-event API exists; the score is a layered estimate. Historical catalogues are media-reported and biased toward accessible, populated areas. Open-Meteo free tier is non-commercial; the ads/coupons business model would need their paid plan or self-hosting. OSRM public server is shared fair-use. Slope from 250 m neighbour sampling is coarse. Weights are untuned heuristics unless the ML stretch is completed.

## 16. Testing
Vitest for: each factor function (boundary values), segment score, route score, status transitions, points rules, ranking rule for stays. A fixed fixture file (`src/features/risk/__fixtures__/`) with hand-calculated expected scores. Manual QA list in doc 04.
