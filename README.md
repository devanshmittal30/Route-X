# 🏔️ RouteX — Mountain-Grade Disaster-Aware Navigation

> **Intelligent natural disaster prediction, landslide risk assessment, and zero-connectivity offline navigation engineered for the Himalayas and high-altitude mountain corridors.**

🔗 **Live Deployment:** [https://route-x-lv44.onrender.com](https://route-x-lv44.onrender.com)  
📦 **GitHub Repository:** [devanshmittal30/Route-X](https://github.com/devanshmittal30/Route-X)

---

## 📌 Executive Summary (For Presentations & Judges)

Most navigation applications like Google Maps are designed for urban cities. They measure **traffic congestion (cars per minute)**, not **mountain physics (rainfall saturation, slope shear angle, and seismic destabilization)**. In mountainous regions like Himachal Pradesh, Uttarakhand, and Ladakh, a mountain highway can show **"fast, green traffic"** on Google Maps right until a sudden landslide or flash flood sweeps the road away.

**RouteX solves this life-threatening gap.** It combines real-time meteorological models, elevation slope gradients, seismic tremors, and community-verified road reports into a **6-Factor Landslide & Natural Disaster Risk Engine**. Furthermore, because cellular towers frequently lose power or coverage in mountain valleys, RouteX is built with a **Zero-Data Offline Architecture** that keeps maps, risk breakdowns, emergency shelters, and satellite SOS active without internet.

---

## 🧠 1. How RouteX Predicts Landslides & Natural Disasters

RouteX calculates a dynamic **Risk Score (0 to 100)** for every 2 km segment along any road or hiking trail. The score uses a calibrated multi-variable mathematical model:

$$\text{Risk Score} = (0.30 \times \text{Rain}) + (0.25 \times \text{Slope}) + (0.20 \times \text{Reports}) + (0.10 \times \text{History}) + (0.10 \times \text{Soil}) + (0.05 \times \text{Seismic})$$

```
                   ┌────────────────────────────────────────┐
                   │    RouteX 6-Factor Risk Engine (0-100)  │
                   └────────────────────┬───────────────────┘
                                        │
     ┌──────────────┬──────────────┬────┴─────────┬──────────────┬──────────────┐
     ▼              ▼              ▼              ▼              ▼              ▼
 🌧️ Rain        📐 Slope       👥 Reports     📜 History     🌱 Soil        🌋 Seismic
   (30%)          (25%)          (20%)          (10%)          (10%)           (5%)
 Accumulation   Steepness &    Verified Road  Past Landslide  Moisture       USGS Tremors
 & Intensity    Shear Angles   Obstructions   Cluster Data    Saturation     Within 50km
```

### The 6 Core Factors Explained:

1. **Rainfall Accumulation & Intensity (30% Weight)**
   * **Source:** Open-Meteo High-Resolution API & wttr.in live meteorological station feeds.
   * **Physics:** Water adds weight to topsoil while simultaneously reducing frictional resistance between bedrock and rock layers. RouteX monitors both **24h/72h accumulated rain** and **peak hourly precipitation** ($\text{mm/h}$). Exceeding $50\text{ mm}$ in 24 hours dramatically spikes the landslide index.
2. **Terrain Slope & Elevation Gradient (25% Weight)**
   * **Source:** SRTM Digital Elevation Model (DEM) & OpenRouteService elevation profiles.
   * **Physics:** Slopes between **$25^\circ$ and $45^\circ$** have the highest critical shear risk. Slopes shallower than $20^\circ$ rarely slide, while cliffs steeper than $55^\circ$ shed rock continuously rather than accumulating mass.
3. **Crowdsourced Live Reports (20% Weight)**
   * **Source:** Supabase PostGIS real-time hazard database with user verification.
   * **Physics:** Verified obstacles (landslides, mudslides, waterlogged roads, collapsed bridges, heavy snowfall) directly flag active road blockages.
4. **Historical Landslide Frequency (10% Weight)**
   * **Source:** Geological Survey of India (GSI) historical landslide hazard zonation data.
   * **Physics:** Areas with recurring historical failure planes are geologically predisposed to slide again during trigger events.
5. **Soil Moisture Saturation (10% Weight)**
   * **Source:** Open-Meteo Land Surface volumetric soil water content ($0–10\text{ cm}$).
   * **Physics:** When soil moisture reaches **$\ge 0.35\text{ m}^3/\text{m}^3$**, pore-water pressure overcomes soil cohesion, triggering slope liquefaction and mudflows.
6. **Seismic & Earthquake Activity (5% Weight)**
   * **Source:** USGS Global Earthquake Hazards API (Real-time).
   * **Physics:** Any earthquake with magnitude **$\ge 3.0$ within 50 km** vibrates and fractures mountain slopes, creating residual instability that persists for up to 48 hours.

### Risk Level Categorization:
* 🟢 **Low Risk (0–29):** Dry weather, gentle slopes, clear road status. Safe for all vehicles.
* 🟡 **Moderate Risk (30–59):** Light rain, moderate incline. Standard mountain caution advised.
* 🟠 **High Risk (60–74):** Heavy rainfall, steep slopes, high slide probability. Avoid night driving.
* 🔴 **Severe / Blocked (75–100):** Impassable landslide, active roadblock, or critical saturation. **Auto Re-route triggered.**

---

## 🆚 2. How RouteX Outperforms Google Maps in Mountain Regions

| Feature | Google Maps | RouteX | Why RouteX is Superior |
| :--- | :--- | :--- | :--- |
| **Routing Metric** | Traffic speed & vehicle density | **Terrain physics, weather, and slope risk** | Google Maps routes travelers into active disaster zones if there is no traffic congestion. RouteX avoids danger zones. |
| **Hazard Avoidance** | Standard alternative paths | **400m Hazard Avoidance Polygons** | RouteX creates a 400m safety exclusion bubble around landslides and recalculates routes via safe corridors. |
| **Offline Operation** | Requires pre-downloading huge cities; fails if route changes | **Full offline capability**: Route snapshot, risk analysis, safe stays & emergency contacts | When network drops in high valleys, RouteX keeps the entire route line, risk scores, and mountain shelters active. |
| **GPS Tracking Offline** | Can glitch without continuous data | **Hardware Satellite GPS directly talks to satellites** | Uses browser `navigator.geolocation` linked to phone GPS hardware (GPS, GLONASS, Galileo) with zero data usage. |
| **Safe Mountain Stays** | Sponsored commercial hotels | **Emergency mountain shelters, dhabas & homestays** | Filters safe verified shelters along the route when caught in landslides or bad weather. |
| **Emergency SOS** | None (only general 911/112 dialer) | **Emergency SOS Beacon Generator with SMS Payload** | Generates satellite/SMS-ready distress packets with exact coordinates, altitude, battery level, and nearest road marker. |
| **Community Trust** | Generic reviews | **Gamified Trust Score & Partner Rewards** | Verified hazard reporters earn points redeemable for partner discounts (gear, stay, food) with anti-spam voting. |

---

## 📶 3. Offline Services & How We Deliver Them Without Internet

Mountain travel frequently experiences total cellular blackouts. RouteX is engineered as a **Local-First Progressive Web App (PWA)**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RouteX Offline Architecture                     │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
 📱 PWA Service Worker      💾 Dexie.js (IndexedDB)    🛰️ Hardware Satellite GPS
   Pre-caches HTML, CSS,      Stores route snapshots,    Connects directly to
   JS bundle & icons via      safe stays, and map        satellites in orbit.
   Workbox cache storage.     tiles locally on device.   Zero cellular data needed.
```

### What We Provide Offline:
1. **Full Route Navigation:** Complete route line coordinates and turns are cached the instant a route is checked.
2. **Segment Risk Breakdown:** Even without internet, you can inspect each 2 km segment to see slope angles and hazard notes.
3. **Emergency Mountain Shelters:** Safe stays and homestays along your route are cached locally.
4. **Emergency Contact Numbers:** Police, SDRF, NDRF, and local mountain rescue helplines are stored on your device.
5. **Offline Action Queue:** If you report a hazard, submit a vote, or record a check-in while disconnected, RouteX queues it locally and automatically syncs it with the server when connectivity returns.

### How We Technologically Provide It:
* **Vite PWA & Workbox:** Service worker precaches 47+ critical app shell files, vector basemaps, and runtime API caches with `StaleWhileRevalidate` strategies.
* **Dexie.js (IndexedDB):** A client-side SQL-like database operating directly in the browser with 6 dedicated tables: `tiles`, `routeSnapshots`, `staysCache`, `guide`, `queue`, and `meta`.
* **Hardware GPS Geolocation:** Calls device GPS chips (`navigator.geolocation`) which communicate with GNSS satellites orbiting Earth, functioning flawlessly in deep mountain gorges with no cellular signal.

---

## 🆘 4. Emergency SOS System

When an emergency happens at high altitude (rockfall, vehicle breakdown, sudden hypothermia, acute mountain sickness), every second counts:

* **1-Tap SOS Beacon:** Available persistently in the top navigation bar.
* **Live GPS Coordinates & Altitude:** Instantly displays exact latitude, longitude, and elevation.
* **Compressed SMS / Satellite Rescue Payload:** Cellular data (4G/5G) often fails, but standard SMS or satellite messaging channels can transmit tiny text packets. RouteX automatically formats a standardized rescue message:
  ```text
  [RouteX SOS] Emergency!
  Loc: 31.1048 N, 77.1734 E (Alt: 2276m)
  Route: Shimla -> Manali (Km 42)
  Bat: 84% | Time: 05:30 IST
  Medical / Rescue Required.
  ```
* **Offline Mountain Survival Guide:** Interactive emergency protocol providing actionable advice on hypothermia, landslides, flash floods, and vehicle breakdowns without internet.

---

## 🛠️ 5. Tech Stack & APIs Used

| Component | Technology | Purpose & Why We Used It |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18 + TypeScript** | Type-safe, component-driven UI for fast response times. |
| **Build & PWA** | **Vite + vite-plugin-pwa** | Instant hot-reloading and automated Workbox Service Worker generation. |
| **Styling** | **Tailwind CSS** | Custom mountain-themed design system optimized for high-contrast sunlight readability. |
| **Interactive Maps** | **MapLibre GL JS** | Open-source GPU-accelerated WebGL vector mapping with zero proprietary lock-in. |
| **Basemap Tiles** | **OpenStreetMap (FOSSGIS)** | Free, unwatermarked, highly detailed topological and road tiles requiring no API key. |
| **Offline Map Packaging**| **PMTiles (Protomaps)** | Cloud-optimized single-file map archive allowing partial byte-range reading from IndexedDB. |
| **Routing Engine** | **OpenRouteService & OSRM** | Supports custom avoidance polygons (`avoid_polygons`) to re-route around landslides. |
| **Weather & Soil Data** | **Open-Meteo & wttr.in** | Hourly rainfall accumulation and volumetric soil moisture models with rate-limit fallback. |
| **Seismic Data** | **USGS Earthquakes API** | Real-time global seismic monitoring to detect slope-destabilizing tremors. |
| **Database & Auth** | **Supabase (PostgreSQL + PostGIS)** | Spatial queries (`ST_DWithin`), Row-Level Security, and instant real-time data sync. |
| **Client Storage** | **Dexie.js (IndexedDB)** | High-capacity browser database for offline route snapshots and offline action queues. |
| **Testing** | **Vitest + Happy-DOM** | 124 automated unit and integration tests across risk, routing, offline, and UI components. |

---

## 🚀 6. Presentation Script / 2-Minute Demo Flow

When presenting RouteX to evaluators, use this exact click path:

1. **Step 1: Live Location & Instant Destination Search**
   * Open the homepage and go to **Plan Route**.
   * Click **"Use GPS"** above Origin: show that it instantly gets your live mountain locality, flies the map, and **auto-focuses the Destination field**.
2. **Step 2: Risk Breakdown & Hazard Detection**
   * Calculate a mountain route (e.g., *Shimla to Manali* or *Rishikesh to Kedarnath*).
   * Show the color-coded road segments (Green, Amber, Orange, Red).
   * Expand the **Risk Breakdown** to show the 6-factor analysis: rainfall accumulation, slope degrees, soil moisture, and seismic status.
3. **Step 3: Auto Re-Routing Around Hazards**
   * Show an obstructed road segment and click **"Auto Re-Route"**.
   * Demonstrate how RouteX builds a **400m avoidance bubble** around the hazard and presents a side-by-side comparison (Distance, Time, Hazards Avoided).
4. **Step 4: Offline Resilience Demonstration**
   * Turn off Wi-Fi or enable Airplane Mode.
   * Refresh the page or click **"Restore Last Offline Mountain Route"**:
   * Show that the route line, hazard details, safe mountain stays, and emergency numbers load immediately from the local database.
5. **Step 5: Emergency SOS**
   * Click the red **SOS** button in the header.
   * Show the generated GPS rescue payload with coordinates and altitude ready for SMS/satellite transmission.

---

## 💻 Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/devanshmittal30/Route-X.git
cd Route-X

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Add your VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_ORS_API_KEY

# 4. Start local development server
npm run dev

# 5. Run test suite (124 tests)
npm test

# 6. Build production bundle
npm run build
```

---

## 📜 License & Disclaimers

* **License:** MIT License. Built for hackathons, disaster response, and mountain safety.
* **Disclaimer:** RouteX provides disaster risk estimates based on publicly available meteorological models, geological inventories, and crowdsourced hazard reports. In extreme weather events, always adhere to local authorities, NDRF, and SDRF advisories.

