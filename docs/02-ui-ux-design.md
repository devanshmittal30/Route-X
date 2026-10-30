# 02. UI/UX Design Document: RouteX

Light theme only. White background. Professional, calm, safety-first. Map-first interface.

## 1. Design principles
1. **Clarity over decoration**: a stressed user must read risk in 2 seconds (colour + icon + word).
2. **Risk colours mean only risk** (never reuse them for decoration).
3. **Trust**: always show data source, time, and "Verified by N people".
4. **Honesty**: TEST, DEMO and Sponsored labels are always visible.
5. **Offline-aware**: every data panel can show a "cached, 2h ago" state.
6. **Thumb-friendly** (works on phone browsers too), but designed laptop-first for the demo.

## 2. Colour tokens (define in `src/styles/tokens.css` and Tailwind config; use only these)

### Neutrals
| Token | Hex | Use |
|---|---|---|
| `--bg` | #FFFFFF | page background |
| `--surface` | #F6F8FB | cards, panels, input fill |
| `--surface-2` | #EDF1F7 | hover, table stripes |
| `--border` | #DDE3EC | borders, dividers |
| `--text` | #0F172A | primary text |
| `--text-2` | #475569 | secondary text |
| `--text-3` | #64748B | muted text (min size 13px) |

### Brand
| Token | Hex | Use |
|---|---|---|
| `--brand` | #0B3C5D | logo, headers, primary buttons |
| `--brand-hover` | #082C45 | primary button hover |
| `--brand-soft` | #E6EEF4 | selected states, chips |
| `--accent` | #1D6FA5 | links, focus ring, secondary buttons |

### Risk and status (semantic; always pair with icon + label)
| Token | Hex | Soft background | Meaning | Icon (lucide) |
|---|---|---|---|---|
| `--risk-low` | #15803D | #E7F5EC | Low (0-24) Safe to proceed | `shield-check` |
| `--risk-moderate` | #B45309 | #FEF3C7 | Moderate (25-49) Be careful | `triangle-alert` |
| `--risk-high` | #C2410C | #FFEDD5 | High (50-74) Avoid if possible | `octagon-alert` |
| `--risk-severe` | #B91C1C | #FEE2E2 | Severe (75-100) Do not travel | `siren` |
| `--risk-blocked` | #111827 | #E5E7EB | Road/trail blocked (verified) | `ban` |
| `--info` | #0369A1 | #E0F2FE | Information, forecasts | `info` |
| `--verified` | #1D4ED8 | #DBEAFE | Community verified | `badge-check` |
| `--sponsored` | #6D28D9 | #EDE9FE | Sponsored / Demo partner label | `megaphone` |
| `--test` | #475569 | #F1F5F9 (diagonal stripe) | TEST data label | `flask-conical` |
| `--sos` | #DC2626 | #FEE2E2 | SOS button (solid red, white text) | `life-buoy` |

Map line colours use the same risk hex values; route being compared uses dashed grey for non-selected options.
All text on soft backgrounds uses the strong colour or `--text` (checked for WCAG AA 4.5:1).

## 3. Typography and spacing
- Font: **Inter** (system fallback: -apple-system, Segoe UI, Roboto). Mono for coupon codes: **JetBrains Mono**.
- Sizes: H1 36/44 (home hero), H2 24/32, H3 18/26, body 15/24, small 13/20. Weight: 400, 500, 600.
- Spacing scale 4 px (4, 8, 12, 16, 24, 32, 48, 64). Radius: cards 14 px, buttons 10 px, chips 999 px. Shadow: `0 1px 2px rgba(15,23,42,.06), 0 4px 12px rgba(15,23,42,.06)`.
- Max content width 1200 px; map pages full-bleed with a 380 px left panel.

## 4. Core components
- **Button**: primary (brand fill, white text), secondary (white, border, brand text), danger (SOS red), ghost. Min height 44 px. Loading spinner state.
- **RiskBadge**: pill with icon + label ("High 62"). **RiskMeter**: horizontal 0-100 bar with level bands.
- **WeatherBox**: icon, big value, unit, label, small "source + time". 3 states: loading skeleton, value, error/offline cached.
- **RouteCard**: mode icon, distance, duration, RiskBadge, short reason, "Select" and "View breakdown".
- **ReportCard**: type icon, severity dots, description, time ago, distance, photo thumb, `VerifyBar`.
- **VerifyBar**: thumbs-up button with count, thumbs-down button with count, text "Verified by 7 people" (blue verified badge appears at 3+). Disabled with tooltip when logged out or own report.
- **OfferCard / StayCard**: image placeholder (neutral, no stock people), name, "Why this stay" line, safety chip for the location, distance, price text, **Sponsored (Demo)** badge, coupon button.
- **Banner**: offline (grey), cached data age (info), disclaimer (surface).
- **Toast**, **Modal**, **Drawer**, **Tabs**, **Empty state** (icon + sentence + action), **Skeleton**.
- **SOS FAB**: fixed bottom-right (mobile) / header right (desktop), always visible, red, label "SOS".
- **ChatFAB**: fixed bottom-right above SOS on mobile; opens chat drawer.
- **Map markers**: circle with icon; colour by risk/type; reports with stripe when TEST; earthquake = concentric ring sized by magnitude; historical landslide = small hollow triangle; hotels/shelters = bed/home icon.

## 5. Layout shell
- **Header** (64 px): logo "RouteX" (text logo, brand colour, simple mountain-route glyph), nav (Home, Plan Route, Hazard Map, Stays, Rewards, Offline), Demo-mode switch, online/offline dot, SOS button, avatar/Login.
- **Footer**: disclaimer, data attributions (© OpenStreetMap contributors, Open-Meteo CC BY 4.0, NASA GLC, USGS), version.
- Mobile: bottom tab bar (Home, Route, Map, Rewards, Profile) + SOS FAB.

## 6. Pages (every page lists purpose, layout, components, states)

### 6.1 Home `/`
Purpose: instant situational awareness + start a trip.
```
[Header]
[Location bar: "Weather for: Shimla, HP ▾  (use my location)"      Updated 14:05]
[ Temp ][ Rain 24h ][ Rain next 72h ][ Wind ][ Humidity ][ Snow ][ Soil wetness ][ Quakes 72h ]  [ AREA RISK: Moderate 38 ]
[Alerts strip: real alerts, severity coloured, dismissible]
[Hero: "Travel the mountains safely"   | Route card: From / To / Drive|Walk / Check route safety ]
[Mini hazard map (left 60%)   | Latest community reports (right 40%) with VerifyBar ]
[Stays near safe areas (Sponsored Demo labelled) - horizontal cards]
[Rewards teaser: your points, "Report a hazard, earn points, get coupons"]
[How it works: 4 steps with icons]   [Real stats: verified reports, contributors (excluding test)]
[Footer]
```
States: location denied -> picker with search; API error -> box shows "Unavailable" + retry; offline -> cached values with age.

### 6.2 Plan Route `/route`
Layout: left panel (380 px) + full-height map.
Left panel: From, To (autocomplete), swap, mode toggle (Drive / Walk), "Depart now" label, results list of RouteCards, selected route "Why this score" accordion (six factor bars with values and sources), hazards-on-route list, buttons: **Auto re-route (safer)**, Save route, Download for offline, Share (copy link).
Map: coloured segments, hazard markers, alternatives dashed grey, start/end pins, layer toggles, legend.
States: no results, route too long (warn), service timeout (retry), partial data (list which layers failed).

### 6.3 Hazard Map `/map`
Full-screen map with layer panel: Reports, Historical landslides (recent years), Earthquakes (7 d), Rain intensity, Stays. Filters by type, severity, status (pending/verified), time. Click marker -> ReportCard drawer with VerifyBar. FAB: "Report hazard here".

### 6.4 Report Hazard `/report` (modal from anywhere)
Steps: 1 Type (big icon buttons), 2 Severity (1-3) + optional description, 3 Location (GPS default, drag pin), 4 Photo (optional), 5 Review. Duplicate suggestion screen if a similar report exists. Success screen: "+5 points. It becomes Verified when 3 people confirm."

### 6.5 Community Feed `/reports`
List of reports near me / along my saved route, sorted by newest or distance, filter pending/verified. VerifyBar on each; TEST badge where applicable.

### 6.6 Trek Mode `/trek`
Mode for walking: large text, high-contrast, route risk, elevation (stretch), nearest shelters, battery-light styling, offline status prominent, SOS prominent, "I'm safe" check-in button (stores timestamp locally/DB).

### 6.7 Offline Maps `/offline`
List of regions (Himachal-Uttarakhand, Northeast India, India overview) with size, status (Not downloaded / Downloading % / Ready), download/delete buttons, storage used, what works offline checklist, last sync, queued actions count.

### 6.8 SOS `/sos` (full-screen overlay)
Red header "Emergency". Condition chips (Trapped by landslide, Road blocked, Injured, Lost on trail, Flood, Earthquake). Instruction card (3-5 short steps, big text). Location block (coordinates, accuracy, "cached" if old). **Safer options** list (stays/shelters/hospitals sorted by safety then distance; sponsored labelled and never above safer). Buttons: Call 112, Call NDMA 1078 (verify), **Send SOS**. After send: SMS simulation modal (phone-style bubble showing exact message and recipients, "Simulated: not actually sent").

### 6.9 Stays `/stays`
Real nearby places from OpenStreetMap (hotels, guest houses, hostels) with safety chip for their location; Sponsored (Demo) partners labelled; filters (safe only default). Map toggle.

### 6.10 Rewards `/rewards`
Points balance (large), level/trust score, ledger table (reason, +/-, date), DEMO offers grid with points cost, Redeem -> modal showing coupon code (mono font), expiry, terms, "DEMO coupon" watermark. "How to earn" list.

### 6.11 Alerts `/alerts`
List of alerts for saved routes and current location (heavy rain, quake, verified blockage near route, risk level changed) with severity colour, source, time; enable-notifications control.

### 6.12 Profile `/profile`
Name, optional phone, emergency contacts (add/edit/delete), my reports (status), my coupons, saved routes, sign out, data & privacy note.

### 6.13 Login / Sign up `/login`
Continue with Google, email + password, forgot password. Short copy: "Login keeps reports trustworthy." Error states inline.

### 6.14 About / How risk works `/about`
Explains layers (weather, terrain, history, soil, user reports, quakes), formula weights, data sources with links, limitations, disclaimer. This page supports the judges' questions.

### 6.15 Chat drawer (global)
Header: "RouteX Safety Assistant" + status chip (Online AI / Offline guide). Quick prompts: "Is my route safe?", "Landslide ahead", "I am stuck", "Where can I stay?". Messages with structured answer blocks: **Do now**, **Call**, **What RouteX data shows**, **Safe stays** (labelled). Typing indicator, error fallback to offline guide, disclaimer line.

## 7. Key flows
1. **Plan and re-route**: Home -> enter From/To -> Route page -> see scores -> open breakdown -> if High, tap Auto re-route -> compare -> Save/Download offline.
2. **Report and verify**: Hazard Map -> Report hazard -> submit -> other user sees it -> thumbs up -> count rises -> verified badge -> reporter gets points -> Rewards -> redeem coupon.
3. **Emergency**: SOS -> choose condition -> read steps -> see safer options -> Send SOS -> SMS simulation -> Call 112.
4. **Offline**: Offline page -> download region -> check route online once -> turn Wi-Fi off -> open map, route, risk, guide, chat (offline).

## 8. Microcopy rules
Short, calm, active voice. Never say "safe" as a promise: use "Low risk". Examples: "High risk: heavy rain forecast on steep slopes near km 42." "Verified by 7 people." "TEST data: not real." "Sponsored (Demo): partner offer."
Disclaimer text (verbatim): *RouteX gives risk estimates from public data and user reports. It is not an official warning. Follow IMD, NDMA and local administration advisories.*

## 9. Responsive and accessibility
- Breakpoints 640 / 1024 / 1280. Left panel becomes a bottom sheet under 1024.
- Focus ring 2 px `--accent`. All icons have text or aria-label. Map controls reachable by keyboard. Reduced-motion respected. Never rely on colour alone.

## 10. Map styling
Protomaps "light" basemap flavour (PMTiles), muted greys and soft blue water so risk colours stand out. Route line 6 px with white 2 px casing; selected route opaque, alternatives 50 % dashed grey. Cluster markers when > 30. Attribution control visible ("© OpenStreetMap contributors").

## 11. Empty, loading, error states (apply everywhere)
Loading = skeletons (not spinners only). Empty = icon + one sentence + action. Error = what failed + retry + what still works. Offline = banner + cached age.
