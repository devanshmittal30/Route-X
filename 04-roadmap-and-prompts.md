# 04. Development Roadmap and Antigravity Prompts: RouteX

Chandigarh University hackathon project. The schedule and who builds what are decided by the team, so this file has no timeline. It lists the build phases in order of dependency.

## 1. Build phases (in order)
| Phase | What | Prompts | Output |
|---|---|---|---|
| 0 | Accounts, scaffold, API checks | P0, P1 | Running app shell, API verification report |
| 1 | Design system, shell, database, login | P2, P3 | Light UI shell, Supabase schema, auth |
| 2 | Map and Home | P4, P5 | PMTiles map, weather boxes, alerts, Home |
| 3 | Routing and risk engine | P6, P7 | Routes with scores and explanations |
| 4 | Reports, votes, points, rewards | P8, P9 | Crowdsourcing loop and coupons |
| 5 | Hazard layers, stays, SOS | P10, P11 | Hazard map, SOS, SMS pop-up |
| 6 | Safety chat | P12 | Online AI + offline guide |
| 7 | Offline | P13 | PWA, offline maps, queue |
| 8 | Auto re-route, alerts (Should) | P14 | Safer route, notifications |
| 9 | QA and polish, then feature freeze | P15 | Clean, tested build |
| Final | Rehearse the demo, record a backup video, seed test data | | Demo-ready |

Phases 0 to 3 are the foundation and must go first. Phases 4 to 8 depend on them but can be reordered or shared between people. Leave time at the end for QA, rehearsal and a backup video.

**If time runs short, cut in this order:** Stretch items (X1-X5), then P14 auto re-route (keep alternatives), then Trek Mode extras, then Saved routes, then the Alerts page. Never cut: route risk score, report + vote, SOS, chat, offline basics.

## 2. Things only you can do (do them in Phase 0)
1. Create Supabase project (free). Copy URL and anon key. Open the dashboard on demo day so the free project is not paused.
2. Create Google AI Studio API key (Gemini). Note the free Flash/Flash-Lite model name shown there.
3. Create OpenRouteService account and API key.
4. Set up Google OAuth for Supabase (can be done later; email/password works first).
5. Install: Node 20+, Git, the `pmtiles` CLI (go-pmtiles release for Mac ARM), Supabase CLI.
6. Download region PMTiles with the extract script from P1 (needs good Wi-Fi; do it while coding).
7. Install Antigravity workspace, copy the five `.md` files into the project as shown in the README layout, and start every session with: *"Read docs/00-README-for-antigravity.md and then the docs it lists. Confirm you understood the golden rules before coding."*

## 3. How to use the prompts
Paste one prompt at a time, in order. Let Antigravity plan, review the plan quickly, accept, then test the result yourself in the browser. Commit to Git after each prompt (`git commit -am "P6 done"`). If Antigravity asks a question, answer it (the docs forbid guessing). Paste its "questions for the user" into this chat if you want help.

---

## 4. Prompts

### P0. Scaffold the project
```
Read docs/00-README-for-antigravity.md, docs/01-project-requirements.md and docs/03-tech-stack-and-apis.md (sections 1, 2, 3). Follow the golden rules.

Task: scaffold the RouteX web app.
- Create a Vite + React 18 + TypeScript (strict) project in the repo root with Tailwind CSS, React Router, TanStack Query, Zustand, lucide-react, @turf/turf, maplibre-gl, pmtiles, @protomaps/basemaps, dexie, zod, vite-plugin-pwa, vitest and eslint+prettier.
- Create the folder layout from the README (src/app, pages, components, features/*, lib, styles; scripts; supabase; public).
- Create .env.example with names only (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ORS_API_KEY, VITE_DEMO_MODE) and make sure .env.local and public/maps are git-ignored.
- Create src/lib/config.ts that reads env vars with zod validation and shows a clear dev-time error if one is missing.
- Create an empty PROGRESS.md with sections: Done, In progress, Questions for the user, API verification notes, Cut list.
- Add npm scripts: dev, build, preview, test, lint, typecheck.
Acceptance: `npm run dev` shows a blank page titled "RouteX" with no console errors; `npm run typecheck`, `lint` and `test` pass. Do not build any features yet. If any package name or version is unavailable, tell me instead of substituting.
```

### P1. Verify every external API and prepare map files
```
Read docs/03-tech-stack-and-apis.md sections 3, 4 and 15. Rule: do not assume; verify.

Task A: create scripts/verify-apis.ts (run with `npx tsx`). Using sample coordinates for Shimla (lat 31.1048, lon 77.1734) and a Northeast point near Guwahati (lat 26.1445, lon 91.7362), call and report status, latency, and the exact response field names for:
1. Open-Meteo forecast with hourly precipitation, soil_moisture_0_to_1cm, snowfall, wind_gusts_10m, temperature_2m, relative_humidity_2m, past_days=3, forecast_days=3, and a multi-location call with 3 comma-separated points. Report whether the soil moisture variable name is accepted and what values look like.
2. Open-Meteo elevation API with 5 points: report the maximum number of coordinates accepted per call.
3. Open-Meteo geocoding for "Manali" and "Tawang".
4. OSRM FOSSGIS routed-car and routed-foot from Shimla to Manali with alternatives=true: report how many alternatives each returns.
5. OpenRouteService directions with driving-car and foot-hiking and an options.avoid_polygons example (needs VITE_ORS_API_KEY from .env.local): report success, alternative_routes behaviour and any limit errors.
6. USGS earthquakes last 7 days, M4.5+, India bounding box (lat 6-38, lon 68-98): report count.
7. Overpass query for tourism=hotel|guest_house|hostel within 10 km of Shimla: report count and tags present.
8. NASA Global Landslide Catalog FeatureServer (URL in doc 03 section 4): fetch the field list and count events by year; report how many events inside India fall in the last 10 years. If few or none, STOP and tell me. Do not fabricate data.
9. Open-Meteo flood API: report whether river_discharge is returned for these points (optional layer).
Write all results into PROGRESS.md under "API verification notes" and update doc-assumption mismatches there. Do not change docs without asking me.

Task B: create scripts/extract-pmtiles.sh that, using the pmtiles CLI, extracts three files into public/maps/: himalaya.pmtiles (bbox 74,28.5,81,37), northeast.pmtiles (87.5,21.5,97.5,29.5) and india-overview.pmtiles (68,6,98,38 with --maxzoom=8). Use a --maxzoom=12 for the two regional files. The script takes the latest build URL as an argument (I will give it from https://maps.protomaps.com/builds/). Print file sizes at the end. Do not run it; I will run it.
Acceptance: verify-apis.ts runs and PROGRESS.md contains a table of API, status, notes. Questions for me are listed explicitly.
```

### P2. Design system and layout shell
```
Read docs/02-ui-ux-design.md fully. Follow tokens and component specs exactly; light theme, white background, English only.

Task:
1. Create src/styles/tokens.css with every colour token from section 2 and map them in tailwind.config (names like bg-surface, text-risk-high, bg-risk-high-soft). No other hex values anywhere in the code.
2. Install Inter and JetBrains Mono (via @fontsource) and set typography scale from section 3.
3. Build src/components/ui: Button (primary/secondary/danger/ghost, loading), Card, Badge, RiskBadge (level -> colour, icon, label, score), RiskMeter, TestBadge, DemoBadge, SponsoredBadge, VerifiedBadge, Banner (offline/info/disclaimer), Modal, Drawer, Tabs, Toast, Skeleton, EmptyState, Input, Select, Switch.
4. Build layout: Header (logo text "RouteX" with a simple mountain-route SVG glyph in brand colour, nav, Demo-mode switch placeholder, online/offline dot, SOS button, login/avatar), Footer (disclaimer text verbatim from section 8 and attributions from doc 03 section 14), mobile bottom tab bar, and an AppShell used by every page.
5. Create placeholder pages and routes for all pages in section 6 (Home, Route, Map, Report modal route, Reports, Trek, Offline, SOS, Stays, Rewards, Alerts, Profile, Login, About) each showing its title and an EmptyState "Coming soon" (this is allowed placeholder UI, not fake data).
6. Create a /design-system dev-only page showing every component and colour token with the risk levels.
Acceptance: all routes render; keyboard focus visible; no colour used except tokens; contrast AA for text on soft backgrounds; typecheck and lint pass. Do not add business logic.
```

### P3. Supabase: schema, RLS, functions, auth, test data
```
Read docs/03-tech-stack-and-apis.md sections 5, 8, 9 and docs/01-project-requirements.md sections 6.1, 6.4, 6.5, 6.10.

Task:
1. Create supabase/migrations/001_init.sql with the exact schema from doc 03 section 5, plus RLS policies, indexes, the handle_new_user trigger, and the functions: reports_near, reports_along_route, cast_vote, redeem_offer, expire_reports with the status, expiry and points rules from section 8. Include an include_test parameter where specified. Write SQL comments for each rule.
2. Create supabase/seed.sql with a SMALL set of clearly labelled TEST data only: about 8 hazard_reports flagged is_test=true with realistic hill/Northeast locations (use real place coordinates only for the place named; descriptions must start with "[TEST]"), and 4 fictional demo partners with offers flagged is_demo=true with invented neutral names (no real brands). Never insert fake users with points, weather, or historic data.
3. Implement src/lib/supabase.ts (client), src/features/auth: Google and email/password sign in/up/out, session provider, protected-route wrapper, Login page and Profile page (display name, optional phone, emergency contacts CRUD). Mobile OTP login is NOT required.
4. Tell me the exact manual steps for: running the migration in the Supabase SQL editor, enabling the PostGIS extension if needed, configuring Google OAuth redirect URLs, and creating a Storage bucket "report-photos" with a safe policy.
Acceptance: I can sign up by email, see my profile row created, add an emergency contact, and RLS blocks reading other users' contacts (show a short SQL or test proving it). Ask me before changing any rule in doc 03.
```

### P4. Map foundation with PMTiles
```
Read docs/02-ui-ux-design.md sections 4, 6.2, 6.3, 10 and docs/03-tech-stack-and-apis.md sections 2, 4, 11.

Task: build src/components/map/RouteXMap.tsx and src/features/map/.
- MapLibre GL map using a PMTiles basemap (Protomaps "light" flavour via @protomaps/basemaps). Register the pmtiles protocol once. Source files live in public/maps/ (himalaya.pmtiles, northeast.pmtiles, india-overview.pmtiles). Choose the file by viewport (zoomed-out: india-overview; Himalaya or Northeast bbox: the regional file). Show a friendly message if a file is missing.
- Create a custom PMTiles Source abstraction (getBytes) with two implementations: HTTP (default) and Blob-from-IndexedDB (will be used in P13). Keep the interface ready now.
- Layer manager API: addGeoJSONLayer(id, data, style), removeLayer, toggleLayer, fitToBounds, flyTo, addMarker(icon, colour, popup). Marker icons use lucide icons rendered as SVG and the risk colour tokens.
- Controls: zoom, geolocate, scale, attribution ("© OpenStreetMap contributors"), layer panel component, legend component (risk colours with icons and labels).
- Map click to set a location (used for From/To and report location).
- Test on the /map page with an empty layer list and the geolocate button.
Acceptance: the map renders Shimla and Guwahati areas from the local PMTiles files with Wi-Fi on, no calls to external tile servers (verify in the network tab), attribution visible, 60 fps panning on my laptop. If the @protomaps/basemaps API differs from the docs, report and ask.
```

### P5. Weather service, Home page and alerts
```
Read docs/01-project-requirements.md section 6.2, docs/02-ui-ux-design.md sections 4 and 6.1, docs/03-tech-stack-and-apis.md sections 4 and 6.4, and PROGRESS.md "API verification notes".

Task:
1. src/features/weather: Open-Meteo client with zod-validated responses, 8 s timeout + one retry, 30-minute cache (memory + weather_cache table via a thin service), multi-location batching, and fields: temperature, rain last 24 h, rain next 72 h, wind (and gusts), humidity, snowfall, soil moisture. Use only variable names confirmed in P1.
2. src/features/quakes: USGS earthquake client (M4.5+, last 72 h) with distance calculation.
3. Location logic: use device geolocation if allowed; otherwise a location picker using Open-Meteo geocoding (search box, no hard-coded city list).
4. Home page per wireframe in doc 02 section 6.1: eight WeatherBox components + AREA RISK box (use a clearly labelled "single-point estimate" until P7 adds the engine; for now show "Calculating in next build" ONLY if the engine does not exist yet), alerts strip from doc 03 section 6.4 (real, derived from the fetched data; if no alerts: "No active alerts from forecast data"), route search card (navigates to /route with from/to query params), mini hazard map (RouteXMap), latest reports list placeholder (EmptyState until P8), sponsored stays placeholder (until P11), rewards teaser, how-it-works, real stats from database counts excluding test data (show 0 if none), footer.
5. Every WeatherBox shows source and updated time; loading skeleton; error state with retry; cached state with age.
Acceptance: Home loads real data for my location and for a searched place (try Shimla, Tawang, Guwahati); no hard-coded numbers; offline-ish error states look right when I block the network in dev tools. Add Vitest tests for unit conversions and rain accumulation helpers.
```

### P6. Geocoding and routing (without risk yet)
```
Read docs/01-project-requirements.md section 6.3, docs/02-ui-ux-design.md section 6.2, docs/03-tech-stack-and-apis.md sections 4 and 7.

Task:
1. src/features/routing: geocoding autocomplete (Open-Meteo geocoding; Photon as fallback only if P1 found it necessary), OSRM client using routed-car and routed-foot path prefixes with alternatives=true, overview=full, geometries=geojson, steps=true; types for Route, Leg, Step; 8 s timeout, one retry; clear error messages (no route, service busy, too far).
2. Route page: left panel (From, To, swap, Drive/Walk toggle, results as RouteCards with distance and duration, selected route steps summary) and map (route lines with white casing, alternatives dashed grey, start/end pins, fit bounds). Support URL params from the Home search card. Allow choosing From/To by clicking the map.
3. Placeholders for risk badge are NOT allowed to show fake numbers: show a neutral "Risk: pending" chip until P7.
Acceptance: Shimla -> Manali drive and Tawang -> a nearby trailhead walk both return routes; alternatives show when the service provides them; errors are friendly. Typecheck, lint, tests pass.
```

### P7. Risk engine, route scoring and explanation
```
Read docs/03-tech-stack-and-apis.md sections 6, 15, 16 completely and docs/01-project-requirements.md sections 6.3 and 7. This is the core of the project. Implement formulas EXACTLY as written; keep all constants in src/features/risk/config.ts.

Task:
1. Pure functions (no network inside) in src/features/risk: sampleRoute, slopeFromElevations, rainFactor, soilFactor, terrainFactor, historyFactor, reportsFactor, seismicFactor, scoreSegment (with the Blocked override), scoreRoute, levelFor, explain (returns top factors with values and sources).
2. Data adapter layer (network): getSampleWeather (grid-cell dedupe, multi-location, cache), getSampleElevationsAndSlopes (5 points per sample, Open-Meteo elevation, cache, respect max coordinates per call found in P1), getHistoricalNear (Supabase historical_landslides, last 10 years), getReportsAlong (Supabase RPC reports_along_route with include_test from Demo mode), getQuakes (USGS).
3. Vitest tests with a fixture file and hand-calculated expected values for every factor boundary, a blocked override case, a route with all zero factors, and a route where History has no records (must output factor 0 and the text "No recent records in catalogue", never "safe").
4. Route page: after routes load, score each route (show progress per layer; partial failures listed), colour segments by level, show RouteCard RiskBadge, mark Recommended (lowest score), "Why this score" accordion with six factor bars (value, source, timestamp), hazards-on-route list, and the disclaimer.
5. Home AREA RISK box: use the same engine for a single point (with its 4-neighbour slope sample).
6. About page "How risk works": formula weights, data sources, limitations (copy from doc 03 sections 6 and 15).
Acceptance: all tests pass; Shimla -> Manali shows scores and an explanation; changing Demo mode changes whether test reports affect the score; I can print the factor values for a segment and recompute by hand. Do not tune constants without asking.
```

### P8. Reports: create, list, show
```
Read docs/01-project-requirements.md section 6.4, docs/02-ui-ux-design.md sections 4, 6.4, 6.5 and docs/03-tech-stack-and-apis.md sections 5 and 8.

Task:
1. Report form (modal, 5 steps per doc 02 6.4) with zod validation: type, severity 1-3, description (<=500), location via GPS or draggable pin inside the India bounding area, optional photo upload to Storage bucket report-photos (<= 3 MB jpeg/png/webp). Login required.
2. Duplicate detection: same type within 200 m in the last 2 h -> show the existing report and suggest voting.
3. Rate limit check (5/hour) enforced in the database function or policy and surfaced as a friendly error.
4. Insert with correct expires_at per doc 03 section 8.
5. Reports page and Home "Latest reports": list sorted by newest or distance, filter pending/verified, ReportCard with type icon, severity, time ago, distance, photo, TEST badge when is_test.
6. Show reports on the map with markers by type and status; click opens a drawer with details.
7. Supabase Realtime subscription so new reports and count changes appear live.
8. Offline: if offline, add to the Dexie queue placeholder interface (implemented in P13), show "Saved, will sync".
Acceptance: I can post a report as user A and see it appear live for user B in another browser; invalid inputs are rejected; no HTML injection possible in description.
```

### P9. Voting, trust, points, rewards, coupons, demo offers
```
Read docs/01-project-requirements.md sections 6.4 and 6.5, docs/02-ui-ux-design.md sections 4 and 6.10, docs/03-tech-stack-and-apis.md sections 5, 8, 9.

Task:
1. VerifyBar component: thumbs up / thumbs down with counts, text "Verified by N people", blue VerifiedBadge when status is verified, DisputedBadge when disputed. Calls cast_vote RPC. Disabled with tooltip when logged out or own report. Optimistic update with rollback.
2. Status transitions and points exactly as in doc 03 section 8 (implemented in SQL; add Vitest or SQL tests that prove: 3 net up votes -> verified, reporter +20; 3 net down -> disputed, reporter -15 floor 0; voter +1 up to 10/day; test data never awards points).
3. Rewards page per doc 02 6.10: balance, trust score, ledger, DEMO offers grid (from partners/offers where is_demo = true) with DemoBadge, Redeem modal calling redeem_offer, showing the coupon code in JetBrains Mono, expiry, terms, "DEMO coupon" watermark; "one per offer per day" error handled.
4. Sponsored (Demo) component with a "Why this stay" line that uses only real fields (distance, risk level at the location from the engine, category). Show on Home (replace placeholder) using the ranking rule in doc 03 section 9 (safety first, then sponsored, then distance).
5. Home real stats now read verified reports and contributors counts (exclude test).
Acceptance: end-to-end with two real accounts: report -> 3 votes -> verified -> points -> redeem coupon. Provide a short manual test script in PROGRESS.md.
```

### P10. Hazard layers and Hazard Map page
```
Read docs/02-ui-ux-design.md section 6.3, docs/03-tech-stack-and-apis.md sections 4 and 6 and PROGRESS.md (P1 notes on the landslide catalogue).

Task:
1. scripts/import-landslides.ts: import REAL landslide events from the maintained NASA GLC FeatureServer for India (bounding box lat 6-38, lon 68-98), last 10 years only, into historical_landslides (dedupe by source + source_event_id; run with the Supabase service role key from a local .env, never in the frontend). Print how many rows per year. If P1 found too few events, stop and ask me what to do. Do not fabricate rows.
2. Hazard Map page with layer panel: Community reports, Historical landslides (hollow triangles), Earthquakes last 7 days from USGS (rings sized by magnitude), Stays (placeholder until P11), filters (type, severity, status, time). Clicking a marker opens a drawer with details and the VerifyBar for reports, and for historical events: date, trigger, location text, source credit.
3. Demo mode switch in the header (persisted in localStorage, default from VITE_DEMO_MODE): controls whether is_test reports appear and are used in risk scoring; when on, show a thin banner "Demo mode: test data included and labelled".
4. Legend with risk colours + icons.
Acceptance: layers toggle quickly with clustering above 30 markers; earthquake layer matches USGS; historical layer shows only imported real rows with a source credit.
```

### P11. Stays, SOS, SMS simulation
```
Read docs/01-project-requirements.md section 6.6, docs/02-ui-ux-design.md sections 6.8, 6.9, and docs/03-tech-stack-and-apis.md sections 4, 9, 11.

Task:
1. Stays service: Overpass query for tourism=hotel|guest_house|hostel|chalet and amenity=shelter|hospital|clinic within a radius (default 15 km), parsed to typed objects (name if present, type, coordinates, tags), cached 24 h in Dexie and memory, attribution shown. Compute safety level at each place with the risk engine single-point function (cap to the nearest 15 places per call to respect limits).
2. Ranking per doc 03 section 9: hide Severe, safety level first, sponsored demo partner first within the same level, then distance. Every card has a "Why this stay" line from real fields.
3. Stays page with list + map toggle and "Safe only" filter default on.
4. SOS page per doc 02 6.8: condition chips with instruction cards (content from public/offline-guide.json; create the file with the scenarios from doc 03 section 10 and conservative general guidance; mark it "needs human review" in a comment), location block (GPS or last cached), safer options list, Call 112 and NDMA 1078 tel: links (add a TODO comment: verify numbers before demo), Send SOS button.
5. Send SOS: insert sos_events when online (queue when offline), then show the SMS simulation modal: phone-style bubble with the exact message ("RouteX SOS: <name> needs help. Condition: <condition>. Location: <lat,lng> <maps link>. Time: <time>.") and recipients from emergency contacts, with a clear "Simulated: not actually sent" label.
6. Persistent SOS button in the header and FAB on mobile opens /sos.
Acceptance: with GPS allowed I see real nearby stays sorted correctly; SOS works online and with the network off (queued); no sponsored item appears above a safer non-sponsored one.
```

### P12. Safety chat (online AI + offline guide)
```
Read docs/01-project-requirements.md section 6.7 and docs/03-tech-stack-and-apis.md section 10. I will provide GEMINI_API_KEY and GEMINI_MODEL as Supabase function secrets; never place them in frontend code.

Task:
1. supabase/functions/gemini-chat/index.ts: validate input (zod), message <= 600 chars, history last 6, rate limit 10/min per user (or per IP when anonymous), CORS limited to http://localhost:5173 and http://localhost:4173, call the Gemini REST API with the model from the GEMINI_MODEL secret, system prompt exactly per doc 03 section 10 rules, 15 s timeout, safe error messages. Provide the exact CLI commands to set secrets and deploy.
2. Frontend chat drawer per doc 02 6.15: status chip (Online AI / Offline guide), quick prompts, structured answer blocks (Do now, Call, What RouteX data shows, Safe stays), typing indicator, error fallback.
3. buildContextPacket(): rounded location (2 decimals), mode, current route risk breakdown, up to 5 nearest verified reports, 72 h forecast summary, up to 5 nearest safe stays with sponsored flag; NO names, phones or exact coordinates.
4. Offline guide engine: keyword-scored intent matching over public/offline-guide.json, decision-tree follow-up questions, uses cached context (last risk snapshot and cached stays from IndexedDB). Safe stays are listed safer first; sponsored ones labelled "Sponsored (Demo)" and only if safe.
5. Fallback logic: use the offline guide automatically when navigator.onLine is false or the function fails.
Acceptance: online answers follow Do now -> Call -> data -> stays order and never mention data not in the context; with the network off the guide answers "landslide ahead", "I am stuck", "where can I stay" correctly. Add 5 unit tests for intent matching.
```

### P13. Offline: PWA, offline maps, queue
```
Read docs/01-project-requirements.md section 6.8 and docs/03-tech-stack-and-apis.md section 11 and docs/02-ui-ux-design.md section 6.7.

Task:
1. Configure vite-plugin-pwa: manifest, icons (simple generated SVG/PNG using brand colours), precache app shell, runtime caching strategies (stale-while-revalidate for API data with timestamps).
2. Dexie database with tables: tiles (region id, blob, size, downloadedAt), routeSnapshots, staysCache, guide, queue (type, payload, createdAt, tries), meta.
3. Offline Maps page: list regions from public/maps/*.pmtiles with size; Download (fetch with progress -> store Blob in Dexie), Delete, storage used; use the Blob-backed PMTiles Source in the map when the region is downloaded or when offline.
4. Cache on route check: geometry, segment scores, risk breakdown, hazards, safe stays, timestamp, emergency contacts, last known location. Show "cached 2 h ago" on all cached panels.
5. Offline queue: reports, votes, SOS, check-ins; flush on the online event with retry/backoff, show the queue count and a sync indicator; conflicts resolved by server-wins.
6. Global Banner when offline; online/offline dot in the header.
Acceptance: after one online session (route checked, region downloaded), switch Wi-Fi off and reload: the app opens, the map renders from Blob, the cached route/risk opens, SOS and offline chat work, a report is queued and then syncs when Wi-Fi returns. Provide a manual test script in PROGRESS.md.
```

### P14. Auto re-route, saved routes, alerts, notifications (Should)
```
Read docs/03-tech-stack-and-apis.md sections 7 and 12 and docs/02-ui-ux-design.md sections 6.2, 6.11. Use the ORS behaviour recorded in PROGRESS.md from P1.

Task:
1. Auto re-route button (shows only if the recommended route is High, Severe or Blocked): build 400 m circle polygons around each hazard (verified blocked/landslide reports and segments scoring >= 75), call ORS Directions with options.avoid_polygons and the correct profile (driving-car or foot-hiking), score the new route with the engine, and show a side-by-side comparison card (score, distance, duration, hazards avoided). Fallback messages per doc 03 section 7.
2. Saved routes (login): save/load/delete; Route page loads a saved route and re-scores it.
3. Alerts page: current-location alerts and saved-route alerts (rain category, quake, verified hazard within 5 km of a saved route, risk level increased since last snapshot), with severity colours, source and time.
4. Notifications: ask permission with a clear explanation; when risk increases a level or a verified hazard appears near a saved route, show an in-app toast and a browser Notification. No real SMS: for critical alerts show the SMS simulation modal.
Acceptance: choose a route with a (test) blocked report in Demo mode and see a re-route that avoids it with a clear comparison; saved route re-scores; notification fires once per change (no spam).
```

### P15. QA, polish, performance, demo readiness
```
Read all docs. Do a full QA and polish pass WITHOUT adding features.

Task:
1. Run through every requirement FR-* in doc 01 and mark Done / Partial / Missing in PROGRESS.md; list Missing items for me.
2. Check every page for loading, empty, error and offline states; fix gaps.
3. Accessibility: keyboard navigation, focus rings, aria labels, contrast on all risk colours, icons + text with every colour use.
4. Data honesty audit: search the code for any hard-coded weather, hazard, hotel, statistic or user values; list and remove anything not clearly labelled TEST/DEMO. Confirm TEST/DEMO badges appear everywhere test data shows. Confirm disclaimers and attributions appear.
5. Performance: route check time, map pan smoothness, bundle size; fix the worst offenders. Make sure external API calls are cached and not repeated.
6. Security: confirm no keys in the frontend bundle except VITE_SUPABASE_*, VITE_ORS_API_KEY; RLS policies tested; input validation present.
7. Create docs/DEMO-SCRIPT.md with the exact click path from section 6 of doc 04 and a "if X fails, do Y" table.
8. Create a seed reset script (supabase/reset-demo.sql) that deletes only is_test rows and re-inserts the test set.
Acceptance: typecheck, lint, tests, and `npm run build && npm run preview` all pass; the demo script runs end to end twice in a row with no console errors.
```

---

## 5. Manual QA checklist (run before the feature freeze)
- [ ] Home: 8 weather boxes show real values with source/time; location picker works; alerts strip honest.
- [ ] Route: Shimla -> Manali (drive) and a short trek (walk) show scores, coloured segments, "Why this score".
- [ ] Demo mode toggle changes the score when TEST reports exist.
- [ ] Report -> vote with second account -> verified badge, points, ledger.
- [ ] Redeem DEMO coupon; code displays; second redeem same day blocked.
- [ ] Hazard map layers: reports, historical (real), earthquakes (real).
- [ ] Stays: safer first; sponsored labelled; none above safer.
- [ ] SOS online and offline; SMS popup says simulated; call links work.
- [ ] Chat online follows safety-first order; offline guide works.
- [ ] Wi-Fi off: app opens, map from local data, cached route, queue then sync.
- [ ] Auto re-route compares correctly (if P14 done).
- [ ] No console errors; no secret keys in the network panel; disclaimer and attributions visible.

## 6. Demo script (about 6 minutes)
1. **Problem (30 s):** hill roads get blocked; map apps do not show terrain hazards.
2. **Home (45 s):** weather boxes, alerts strip, area risk with explanation.
3. **Route (90 s):** Shimla -> Manali: 3 routes, scores, coloured segments, open "Why this score" (rain, slope, soil, history, reports, quakes). Show the honesty line: "estimate, not official warning".
4. **Community (60 s):** report a hazard as user A; on a second browser/tab as user B thumbs-up; counter becomes "Verified by 3 people"; points awarded.
5. **Auto re-route (30 s, if built):** blocked road -> safer route comparison.
6. **Rewards (30 s):** redeem a DEMO coupon; show DEMO/Sponsored labels.
7. **SOS (45 s):** choose "Trapped by landslide", safer options first, Send SOS -> SMS popup (simulated).
8. **Offline + chat (60 s):** ask chat online; switch Wi-Fi off; map, cached route and offline guide still work.
9. **Close (30 s):** data sources, limitations, next steps (ML validation, partner integration, real SMS/Web Push).

## 7. Fallback plan for demo day
| If this fails | Do this |
|---|---|
| Venue Wi-Fi unstable | Use phone hotspot; cached data and offline mode show the offline strength |
| Open-Meteo / OSRM down | Show cached route snapshot (checked earlier) and say data is cached with its timestamp |
| Gemini rate-limited | Chat falls back to the offline guide automatically; mention it |
| Supabase paused | Open dashboard 30 min before, click Restore; keep a recorded demo video as backup |
| ORS key rejected | Show OSRM alternatives and explain avoid-area re-route design |
| Laptop problem | Backup screen recording on a USB drive and phone |

## 8. Submission checklist
- [ ] Final commit, tag `v1-hackathon`.
- [ ] `docs/` folder and README with run instructions in the repo.
- [ ] Demo video (3-5 min) recorded as backup.
- [ ] Slide or one-page summary: problem, solution, data sources, risk method, limitations, roadmap.
- [ ] Credits: OpenStreetMap contributors, Open-Meteo (CC BY 4.0), USGS, NASA GLC (Kirschbaum et al.), Protomaps, OSRM/FOSSGIS, OpenRouteService.
- [ ] Laptop charged, charger packed, hotspot ready, Supabase project awake.
