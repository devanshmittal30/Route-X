# 01. Project Requirements Document: RouteX

Version 1.0, 30 Oct 2026. Owner: the solo builder (Chandigarh University hackathon, 36 hours).

## 1. Overview
**RouteX** is a mountain-and-disaster-aware navigation website. It plans driving and walking/trekking routes across India (focus: Himalayan states and the whole Northeast), scores each route for natural-hazard risk (landslide, blocked road, heavy rain, flood, snow, earthquake), warns the user, and suggests safer alternatives. It combines **free public data** (weather forecasts, earthquakes, historical landslides, maps) with **crowdsourced reports** verified by other users.

## 2. Problem
In hill and Northeast regions, roads and trails are frequently blocked by landslides and floods. Mainstream map apps show traffic, not terrain hazards, and signal is often missing. Travellers lack one place that tells them: "Is this route risky right now, why, what is the safer alternative, and where can I stay safely if I must stop?"

## 3. Goals and non-goals
**Goals**
- G1. Show a clear, explainable risk score for any route (drive or walk) and per segment.
- G2. Warn about hazards from real data plus verified user reports, and suggest or compute a safer route.
- G3. Let users report hazards and verify others' reports (thumbs up / thumbs down with visible counts).
- G4. Reward real contributions with points redeemable for demo partner coupons; show clearly labelled sponsored stays.
- G5. Work offline for core safety functions (cached map region, cached route and risk, offline safety guide, queued reports).
- G6. Provide SOS and a safety chat that always puts safety first.

**Non-goals (v1)**
- Not an official warning system; no guarantee of prediction accuracy.
- No real SMS (an on-screen SMS pop-up simulation is used), no real payments, no real brand partnerships.
- No native mobile apps; no languages other than English; no turn-by-turn voice navigation.

## 4. Users
| Persona | Needs |
|---|---|
| Trekker (walking) | Trail-level risk, offline use, SOS, nearest safe shelter |
| Road traveller / driver | Alternate routes around blocked roads, rain and landslide warnings, safe stops |
| Local resident / reporter | Quick reporting, seeing that others confirm it, earning points |
| Hotel / homestay partner (demo) | Visibility to travellers who need a safe stay |

## 5. Scope and priority (30 hours remaining; solo)
**MUST (demo fails without these)**
M1 Login (Google + email/password), profile. M2 Home with weather/hazard boxes. M3 Route planner: from/to, Drive or Walk, up to 3 alternatives. M4 Risk score per route and per segment with explanation. M5 Hazard layer on map (reports, historical landslides, earthquakes). M6 Report a hazard + thumbs up/down verification with counts. M7 Points ledger + rewards page + demo coupons. M8 Demo partner offers / sponsored stays (labelled). M9 SOS with nearest safe stays. M10 Safety chat: cloud AI online, rule-based offline. M11 Offline mode: cached map region + cached route/risk + offline guide. M12 Simulated SMS pop-up. M13 Clearly labelled test data. M14 Light UI with the specified palette.

**SHOULD**
S1 Automatic safer re-route avoiding hazard areas (OpenRouteService `avoid_polygons`). S2 In-browser push-style notifications for alerts. S3 Report expiry and "all clear" confirmation. S4 Trust score for users. S5 Saved routes. S6 Alerts page.

**STRETCH (only if ahead of schedule)**
X1 Small ML model (logistic regression) trained on recent historical landslide events + rainfall, with coefficients shipped as JSON. X2 NASA satellite rainfall / soil moisture (needs free Earthdata account). X3 True Web Push. X4 Trek elevation profile. X5 PWA install prompt.

## 6. Functional requirements

### 6.1 Authentication and profile
- FR-A1 Sign in/up with Google and with email + password (Supabase Auth). Mobile number is an **optional profile field** (no OTP login).
- FR-A2 Profile page: display name, optional phone, emergency contacts (name, phone), points balance, trust score, my reports, my coupons.
- FR-A3 Reading maps, weather, risk and reports is allowed without login; reporting, voting, redeeming, SOS contact storage require login.

### 6.2 Home page
- FR-H1 Top row of **weather and hazard boxes** for the selected location (device location if permitted, else a location picker): temperature, rain last 24 h, rain forecast next 72 h, wind, humidity, snowfall, soil wetness, earthquakes (last 72 h, M4.5+ near), and an overall "area risk" box with colour + label.
- FR-H2 Route search card (From, To, Drive/Walk toggle, "Check route safety").
- FR-H3 Live alerts strip (real alerts derived from forecast and earthquake data; see doc 03).
- FR-H4 Mini hazard map, latest community reports with verification counts, rewards teaser, sponsored stays (labelled), how-it-works, footer with disclaimer and data attributions.
- FR-H5 Any statistic shown (reports verified, contributors) is a real database count excluding test data; if zero, show zero.

### 6.3 Route planning
- FR-R1 Geocode place names (Open-Meteo Geocoding or Photon). Allow clicking the map to set a point.
- FR-R2 Request routes for the selected mode (car or foot) and up to 3 alternatives where the service supports them.
- FR-R3 Sample each route (about every 2 km, min 8, max 30 points), fetch weather and terrain for samples, and score each segment (doc 03 formulas).
- FR-R4 Show each route with a total risk score (0-100), level label, colour, distance, duration, and "Why this score" breakdown (rain, terrain, soil, history, reports, quakes).
- FR-R5 Colour route segments by risk level; mark hazards on the route with icons.
- FR-R6 If the best route is High/Severe or Blocked, offer **Auto re-route** that avoids hazard zones (ORS avoid polygons) and show the comparison.
- FR-R7 Warn if a verified blocked-road report lies within 150 m of the route; status "Blocked".

### 6.4 Hazards, reports and verification
- FR-X1 Report form: type (landslide, road blocked, flood, snow, rockfall, bridge damage, all clear), severity 1-3, optional description (max 500 chars), optional photo, location (device GPS or map pick).
- FR-X2 New reports are `pending`. Other logged-in users can vote **thumbs up (still there / true)** or **thumbs down (not true / cleared)**. One vote per user per report; no voting on your own report.
- FR-X3 Show "Verified by N people" (N = thumbs up) and the thumbs-down count. A report becomes `verified` when up - down >= 3 and up >= 3; becomes `disputed` when down - up >= 3 (disputed reports are hidden from risk scoring).
- FR-X4 Reports expire automatically (default 72 h landslide/rockfall/bridge, 48 h road blocked/flood, 24 h snow). Anyone can mark "all clear"; an all-clear report that gets verification resolves the original.
- FR-X5 Anti-abuse: max 5 reports per user per hour, login required, geolocation sanity check (location must be inside India's bounding area), duplicate detection (same type within 200 m in 2 h prompts "vote on existing report instead").
- FR-X6 Hazard map layers (toggle): community reports, historical landslides (real, recent years), earthquakes (real, last 7 days), rain intensity overlay (from sampled data), my saved route.

### 6.5 Points, rewards, offers
- FR-P1 Points rules are in doc 03 section 8 (stored in a ledger; balance never below 0).
- FR-P2 Rewards page: balance, ledger, available **demo** offers (stay discount, food coupon, gear), redeem button generating a unique coupon code; one active redemption per offer per user per day.
- FR-P3 Offers come from `partners` + `offers` tables flagged `is_demo = true`; every offer shows a **DEMO** badge.
- FR-P4 Sponsored stays: shown on Home, Stays page, SOS and chat only with a **Sponsored (Demo)** label, a one-line reason ("Why this stay": safety level of the area, distance, amenities from real data), and never above a safer non-sponsored option. Rule: sort by safety level first; among equal levels, sponsored may rank first.

### 6.6 SOS
- FR-S1 Persistent red SOS button. Pressing opens a confirm screen with: current location (or last cached), nearest emergency numbers (112, NDMA 1078; verify before demo), nearest **safer stays/shelters** from OpenStreetMap (hotels, guest houses, hostels, shelters, hospitals) sorted by safety then distance, and a "Send SOS" action.
- FR-S2 "Send SOS" stores an `sos_events` row (when online), shows a **simulated SMS pop-up** that displays the exact message that would be sent to the user's emergency contacts, and offers a "Call 112" link. Offline: queue the event and show the same pop-up; sync later.
- FR-S3 Different conditions: SOS screen has quick choices (Trapped by landslide, Road blocked, Injured, Lost on trail, Flood/rising water, Earthquake) that change the safe-options and instruction card.

### 6.7 Safety chat
- FR-C1 Floating chat button on all pages. Online: messages go to a Supabase Edge Function that calls the Gemini API with a safety-first system prompt and a **context packet** (coarse location, current risk breakdown, nearby verified reports, forecast summary, nearest safe stays). Offline: rule-based guide from `offline-guide.json` using intent keywords and a decision tree, plus the cached context.
- FR-C2 Answer order: (1) immediate safety actions, (2) call 112 if life-threatening, (3) what RouteX data says, (4) safe stay options (non-sponsored and sponsored, labelled). Never invent data; say "I don't know" when unsure.
- FR-C3 Do not send names, phone numbers or exact coordinates to the AI (round coordinates to 2 decimals).

### 6.8 Offline
- FR-O1 PWA with service worker caching the app shell.
- FR-O2 "Offline maps" page: download a region (PMTiles file, e.g. Himachal-Uttarakhand, Northeast, or India low-zoom) into IndexedDB; map reads from the stored file when offline.
- FR-O3 When a route is checked, cache route geometry, risk snapshot, nearby stays, emergency contacts and the offline guide in IndexedDB.
- FR-O4 Offline report/vote/SOS actions go to a queue and sync when online. UI shows an "Offline" banner and the age of the cached data.

### 6.9 Notifications
- FR-N1 When the user opens a saved route or the app, compare the latest risk with the last snapshot; if it increased a level, show an in-app alert and a browser notification (if permitted). Real SMS is **not** sent; use the SMS simulation pop-up for SOS/critical alerts.

### 6.10 Test data and Demo mode
- FR-D1 `supabase/seed.sql` may insert a small set of **test** reports/users/offers flagged `is_test`/`is_demo`. They show a TEST/DEMO badge, never count toward real statistics, trust or points.
- FR-D2 A visible **Demo mode** switch in the header controls whether test reports are included in risk scoring and on the map. Default ON for the hackathon demo, OFF otherwise.

## 7. Data integrity rules
1. Real data sources only (doc 03). No hard-coded sample weather, hazards or statistics.
2. Every data panel shows its source and timestamp ("Open-Meteo, updated 14:05"). Cached data shows its age.
3. Historical landslides: use recent events only (default last 10 years, India region). If the free catalogue has no recent entries in an area, the UI says "No recent records in the catalogue", never "safe".
4. Risk is shown as an estimate with the disclaimer: "RouteX gives risk estimates from public data and user reports. It is not an official warning. Follow IMD, NDMA and local administration advisories."

## 8. Non-functional requirements
- Performance: route check (including weather for samples) under 8 seconds on normal Wi-Fi; map interaction smooth at 60 fps on the laptop.
- Reliability: every external call has a timeout (8 s), retry once, and a graceful fallback message; weather results cached 30 minutes in `weather_cache` and in memory.
- Offline: core pages open with Wi-Fi off after one online visit.
- Security: Supabase Row Level Security on all tables; Gemini key only on the server side; input validation; no personal data to the AI.
- Accessibility: WCAG AA contrast, keyboard focusable controls, aria labels, risk shown with icon + text + colour.
- Browser: latest Chrome (primary demo), Safari/Firefox best effort.

## 9. Decisions confirmed by the user
Website (not an app) · solo · 36 h hackathon, started about 6 h ago · laptop-only demo with live internet · everything free · Supabase backend · login with Google and email/password · mobile number is optional profile data, no OTP · real SMS skipped; show pop-up · thumbs up/down verification with counts · points and coupons via demo offers · test data allowed if clearly labelled · online chat via cloud AI, offline rule-based guide · light theme, white background, standard professional palette · English only · safety options first in chat/SOS · four documents plus README as `.md`.

## 10. Assumptions I made (change them if wrong)
- A1 The hackathon ends about Sat 31 Oct 2026 20:14 IST (36 h after about 08:14 Fri). Confirm the real deadline.
- A2 "Sponsored first" is reconciled with "safer first" as: sort by safety level; among equal levels sponsored goes first, always labelled.
- A3 Gemini free tier is used for the AI chat; model name is set in an environment variable at build time.
- A4 OpenRouteService free key (account needed) is used for avoid-area re-routing and the hiking profile; OSRM public service is used for base routes.
- A5 Open-Meteo free API is used under its non-commercial terms for the hackathon; a commercial launch (ads/coupons) would need their paid plan.
- A6 Region PMTiles files are extracted ahead of time and served from the laptop.

## 11. Risks and mitigations
| Risk | Mitigation |
|---|---|
| No single free live landslide API | Layered score: weather + terrain + recent historical events + user reports; honest labelling |
| Solo, 30 h left | Strict MoSCoW; Must items first; freeze at 19:15 Sat |
| Free API limits / downtime | Caching, 8 s timeout, fallbacks, demo recording as backup |
| Wrong or malicious reports | Login, rate limits, voting, expiry, trust score, disputed state |
| Gemini free-tier limits / privacy | Short prompts, no personal data, rule-based fallback, rate limiting |
| Offline map file size | Small regional extracts, max zoom 12-13 |
| Judges ask "is the prediction accurate?" | Present as explainable risk estimate; show formulas and data sources; mention validation plan (ML stretch / backtest) |

## 12. Demo success criteria
1. Search Shimla to Manali (or any hill route): see 2-3 routes with scores, coloured segments and explanations.
2. See a real weather-based change in risk (high rain forecast area) and a hazard on the map.
3. Post a report, vote on it with a second account, see "Verified by N people", see points awarded.
4. Redeem a DEMO coupon.
5. Press SOS: see safest stays first, SMS pop-up, call link.
6. Ask the chat for help (online) and again with Wi-Fi off (offline guide answer).
7. Wi-Fi off: map region, cached route and risk still open.
