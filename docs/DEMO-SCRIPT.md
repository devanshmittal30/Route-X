# RouteX Live Demo Script & Fallback Runbook

This document details the exact 6-minute live presentation click path and contingency runbook for RouteX, demonstrating mountain hazard-aware navigation, offline resilience, and community safety verified on live data.

---

## 1. Demo Overview

- **Audience:** Hackathon judges, emergency response stakeholders, and mountain travelers.
- **Total Duration:** 6 minutes (strict timekeeping).
- **Primary Goal:** Prove that RouteX solves the critical blind spot in standard navigation apps (Google Maps, Apple Maps) which route drivers onto steep, rain-saturated, and actively blocked mountain corridors without warning.
- **Presenter Setup:**
  - Chrome / Chromium browser opened to `http://localhost:5173` (or production deploy).
  - Incognito or secondary browser profile ready for real-time community verification test.
  - Network panel accessible or OS Wi-Fi quick toggle ready for the offline PWA showcase.
  - Test accounts pre-registered (or Demo mode toggle active in the header).

---

## 2. Minute-by-Minute Live Click Path

### Step 1: The Mountain Hazard Problem (0:00 - 0:30 | 30 s)
- **Visual:** Stand on the RouteX Home page header (`/`).
- **Narration:**
  > "Every monsoon, hundreds of travelers and locals across Himachal Pradesh, Uttarakhand, and Sikkim get stranded or caught in fatal landslides. Mainstream navigation tools calculate routes strictly on travel time and traffic speed—they have zero awareness of rainfall saturation, slope steepness, historical landslide frequency, or recent seismic activity.
  > 
  > RouteX bridges this gap. It is an offline-capable, mountain-aware safety navigation platform that evaluates road corridors against 6 transparent environmental hazard factors and verifies live obstacles through a peer-validated community ledger."

---

### Step 2: Home Page Live Weather & Area Risk (0:30 - 1:15 | 45 s)
- **Visual Actions:**
  1. Scroll down to the **8 Weather Metric Boxes**: point out temperature, rainfall (last 24h & next 72h forecast), wind gusts, humidity, and soil moisture saturation.
  2. Point to the **Data Timestamp & Source:** "Live Open-Meteo data, cached 30 min".
  3. Highlight the **Area Risk Box:** Single-point risk index (e.g., *Moderate* or *Low*).
  4. Note the active **Alerts Strip** at the top if mountain rainfall exceeds threshold.
  5. Point out the honest database statistics in the footer/hero: verified reports and active contributors (test data strictly excluded).
- **Narration:**
  > "Before planning a journey, RouteX gives an instant mountain environmental scan. We pull real-time weather and forecast data from Open-Meteo with no hardcoded mocks. Notice our soil moisture index—a crucial precursor for slope failure."

---

### Step 3: Route Planning & Transparent Risk Engine (1:15 - 2:45 | 90 s)
- **Visual Actions:**
  1. Click **"Check a Route"** or navigate to `/route`.
  2. Select sample route: **Shimla $\rightarrow$ Manali** (driving mode).
  3. Click **"Find Routes"**.
  4. Observe OSRM returning primary and alternative corridors.
  5. Point to the map:
     - Route geometry is sampled every 2 km.
     - Each segment is visually color-coded according to the 6-factor risk formula: Green (Low), Yellow (Moderate), Orange (High), Red (Severe), or Dark Burgundy (Blocked).
  6. Click **"Why this score?"** on the route card to expand the factor breakdown drawer:
     - Show individual factor weights: Rain factor, Soil saturation, Slope steepness (from elevation profiles), NASA historical landslide proximity (last 10 years), Community reports, and USGS seismic proximity (last 72h).
     - Point to the transparent **Blocked road override** logic: any verified obstacle within 150m immediately flags the route segment as Blocked.
  7. Show the mandatory honesty disclaimer: *"RouteX provides risk estimates from public data and community reports. It is not an official warning. Follow IMD, NDMA and local advisories."*
- **Narration:**
  > "When we route from Shimla to Manali, RouteX samples the route every 2 km, querying elevations to compute slope gradient, pulling hyper-local rain and soil saturation, and scanning the NASA Global Landslide Catalogue. Every score is mathematically auditable in the 'Why this score' breakdown—no black-box AI hallucinations."

---

### Step 4: Community Reporting & Live Peer Verification (2:45 - 3:45 | 60 s)
- **Visual Actions:**
  1. Click **"Report Hazard"** (`/report`).
  2. Complete the 5-step modal:
     - Type: *Landslide / Rockfall*
     - Severity: *Level 3 (Road Blocked)*
     - Location: Select on map or use current location pin.
     - Description: *"Fresh debris blocking both lanes after heavy morning downpour."*
  3. Click **"Submit Report"**. Notice the report appears instantly as **Pending** (yellow badge) with a clear `TEST` label in demo mode.
  4. Switch to the secondary browser / incognito tab (logged in as User B).
  5. Navigate to `/hazard-map` or `/reports`.
  6. Locate the report and click the **Thumbs Up** button on the `VerifyBar`.
  7. Point out the counter increment: upon reaching threshold (3 net upvotes), status automatically flips to **Verified** (blue badge).
  8. Return to User A's profile / rewards page: point out the **+20 Karma Points** credited in the Points Ledger.
- **Narration:**
  > "Mountain roads change in seconds. Travelers can submit geolocated hazard reports even on poor connections. To prevent spam, our database enforces rate limits and peer validation: once verified by travelers on the ground, the submitter earns points, and the obstacle immediately updates the route engine to block dangerous segments."

---

### Step 5: Hazard-Avoiding Auto Re-Route (3:45 - 4:15 | 30 s)
- **Visual Actions:**
  1. Return to the route page with the blocked hazard report active.
  2. The primary route card now displays a prominent **"Auto Re-Route"** suggestion button.
  3. Click **"Avoid Hazard & Re-Route"**.
  4. Watch ORS generate an avoidance corridor bypassing the 400 m hazard circle.
  5. Review the **Side-by-Side Comparison Card**:
     - Compares original route vs. re-routed corridor.
     - Displays time difference (+18 min), distance delta, and confirmation that the severe hazard zone was bypassed.
- **Narration:**
  > "When a route becomes blocked or reaches High/Severe risk, RouteX's auto re-route constructs an exclusion polygon around the hazard coordinates and calculates an alternative mountain corridor, letting drivers make informed decisions before getting trapped in a bottleneck."

---

### Step 6: Rewards & Sponsored Partner Coupons (4:15 - 4:45 | 30 s)
- **Visual Actions:**
  1. Navigate to **Rewards** (`/rewards`).
  2. Point out the **Karma Points Balance** and **Trust Score**.
  3. Scroll to the **DEMO Partner Offers** grid (clearly labelled with `DEMO` badges).
  4. Click **Redeem** on a demo homestay discount (e.g. *20% Off Safe Hill Stay*).
  5. The redemption modal reveals a unique code in monospace font (`JetBrains Mono`) with a clear `"DEMO coupon"` watermark.
  6. Attempt to redeem the same offer again: show the polite `"One redemption per offer per day"` anti-abuse prevention.
- **Narration:**
  > "Safety karma has tangible utility. Travelers can redeem karma points for discounts at verified local mountain stays and gear outfitters. All test rewards carry prominent DEMO watermarks to ensure complete honesty."

---

### Step 7: Emergency SOS & Simulated SMS Dispatch (4:45 - 5:30 | 45 s)
- **Visual Actions:**
  1. Click the red **Emergency SOS** button in the top navigation or floating action button (`/sos`).
  2. Select scenario chip: **"Trapped by landslide"**.
  3. Immediate action instructions appear from the offline survival guide.
  4. Point out the emergency dispatch links: **Call 112 (National Emergency)** and **1078 (NDMA Disaster Helpline)**.
  5. Review the **Nearest Safe Shelters** list: ranked by risk score (safer stays strictly above higher risk; sponsored stays never outrank safer public shelters).
  6. Click **"Send Emergency SOS"**.
  7. The phone-style **SMS Simulation Modal** pops up:
     - Pre-formatted distress text with exact GPS coordinates and Google Maps link.
     - Recipients populated from saved emergency contacts.
     - Bold amber banner: *"Simulated: not actually sent"*.
- **Narration:**
  > "In a critical crisis, every second counts. RouteX's Emergency SOS provides instant offline action protocols, quick dials to 112 and NDMA, and identifies the nearest verified safe havens. Our simulated SMS dispatch packages exact coordinates for dispatch to trusted family contacts."

---

### Step 8: Offline PWA, PMTiles Vector Maps & AI Safety Chat (5:30 - 6:30 | 60 s)
- **Visual Actions:**
  1. Open the **Safety Chat** drawer (`/chat`).
  2. Ask online AI: *"There is heavy rain near Solang Valley. Should I proceed?"*
     - Demonstrate the structured 4-block response: **Do Now** $\rightarrow$ **Call** $\rightarrow$ **What RouteX Data Shows** $\rightarrow$ **Safe Stays**.
     - Point out the status pill: `Online AI (Gemini 2.5 Flash)`.
  3. **Simulate Total Connectivity Loss:**
     - Open Chrome DevTools $\rightarrow$ Network $\rightarrow$ Set to **Offline** (or toggle device Wi-Fi off).
     - Global offline banner appears: *"You are offline. Showing cached data"*.
  4. Navigate to `/offline-maps`: show pre-downloaded regional PMTiles vector pack.
  5. Navigate to `/route`: the previously checked Shimla $\rightarrow$ Manali route loads instantly from IndexedDB cache with the label *"Cached 5m ago"*.
  6. Return to **Safety Chat**: ask *"I am stuck near a rockfall, what do I do?"*
     - Point out the chip automatically switched to `Offline Guide`.
     - Guide immediately responds from local IndexedDB keyword-matching with survival instructions and nearby cached shelters.
  7. Re-enable network: show queued actions automatically synchronizing with Supabase without page refresh.
- **Narration:**
  > "In mountain valleys, cell service drops constantly. RouteX is engineered PWA-first. Offline vector tiles render directly from Dexie IndexedDB blobs, cached route risk analyses remain readable, and our local safety guide answers distress queries even without a single bar of cell signal."

---

### Step 9: Wrap-Up & Vision (6:30 - 7:00 | 30 s)
- **Visual:** Return to Home or About page (`/about`).
- **Narration:**
  > "RouteX is built entirely on open datasets—Open-Meteo, USGS, OpenStreetMap, and the NASA GLC catalogue. It doesn't replace official authorities; it empowers travelers with transparent, offline-first situational awareness before disaster strikes. Thank you."

---

## 3. Fallback Plan & Contingency Matrix

If any external API, network connection, or hardware hiccup occurs during the live presentation, execute the corresponding contingency immediately:

| Failure Mode | Root Cause | Contingency Action (Execute in < 5 seconds) | What to Say to the Judges |
| :--- | :--- | :--- | :--- |
| **Venue Wi-Fi drops or fails to connect** | Local network congestion | Switch to pre-configured phone hotspot OR immediately pivot to the **Offline PWA showcase** (Step 8). | *"As you can see, mountain navigation must withstand zero connectivity. RouteX immediately transitioned into Offline PWA mode with local vector tiles and cached risk models."* |
| **Open-Meteo API timeout or rate limit** | Upstream weather gateway latency | RouteX's 30-minute memory/database cache automatically serves the last valid weather forecast. If cold, use a previously saved route from `/profile`. | *"To protect mountain travelers from server hiccups, all environmental readings are cached with transparent timestamps."* |
| **OSRM routing service unreachable** | Public demo OSRM server downtime | Switch route mode to Walk (which queries foot profile) or load a saved route snapshot from `/profile` or `/offline-maps`. | *"RouteX caches complete route geometries and hazard segment matrices locally in Dexie IndexedDB."* |
| **Gemini AI Chat rate-limited or slow (> 15s)** | Quota cap on free tier API key | The chat drawer has built-in auto-fallback: if the Edge Function fails or times out, it switches instantly to the `Offline Guide`. | *"Notice how the chat safely degraded to our deterministic offline safety tree rather than leaving the traveler with an unhandled error."* |
| **Supabase project paused or cold-start** | Free tier inactivity | Ensure project is unpaused 30 minutes prior. If database connection fails, RouteX operates in read-only offline mode via IndexedDB. | *"Our offline-first architecture allows all emergency guides, maps, and cached routes to function completely independent of cloud backends."* |
| **OpenRouteService (ORS) avoid polygon error** | ORS token quota exceeded | Open Route Comparison modal and demonstrate the pre-calculated alternative routes from OSRM. | *"When third-party avoid-polygon routing is unavailable, RouteX falls back to multi-corridor OSRM alternatives scored against our risk engine."* |
| **Complete hardware / browser crash** | Laptop OS crash | Have a 1080p 60fps backup demo recording ready on a USB drive and accessible via mobile/iPad. | Continue presentation smoothly while pulling up the backup video. |

---

## 4. Pre-Demo Verification Checklist (T-30 Minutes)

1. [ ] **Verify Supabase Status:** Open `https://supabase.com/dashboard` and ensure database `uvtxpwnjvvxasjtopdby` is active.
2. [ ] **Reset Demo Data:** Run `supabase/reset-demo.sql` in Supabase SQL Editor if old test reports need to be cleaned up.
3. [ ] **Verify Demo Mode:** Confirm the Demo Mode switch in the header is turned **ON** (`VITE_DEMO_MODE=true`).
4. [ ] **Pre-warm Caches:**
   - Search `Shimla` to `Manali` on `/route` once so elevation and weather tiles are cached in IndexedDB.
   - Download the test regional map pack on `/offline-maps`.
5. [ ] **Test Two Accounts:** Open primary account in main window, test voter account in secondary window.
6. [ ] **Check Secrets:** Verify Supabase Edge Function `gemini-chat` responds with HTTP 200 to test ping.
7. [ ] **Check Console:** Ensure DevTools console is clean of unhandled exceptions or red errors.
