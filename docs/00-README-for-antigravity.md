# RouteX: READ THIS FIRST (instructions for Antigravity)

RouteX is a **website** (React PWA) that works like Google Maps but is built for **mountains, treks and disaster-prone areas of India** (focus: Himalayan states and the whole Northeast). The user picks "from" and "to", chooses **Drive** or **Walk/Trek**, and RouteX shows routes with a **risk score**, warns about landslides, road blockages, heavy rain, floods, snow and earthquakes, and suggests safer alternatives. Users can report hazards, verify each other's reports with thumbs up/down, earn points, and redeem demo partner coupons. It has an SOS button, a safety chat (cloud AI online, rule-based guide offline), and offline map support.

It is being built **solo, for a 36-hour hackathon at Chandigarh University**, as a **working demo presented on one laptop** (MacBook Air M5). The hackathon started Fri 30 Oct 2026 about 08:14 IST and ends about Sat 31 Oct 2026 20:14 IST (see `04-roadmap-and-prompts.md`).

## Documents (read in this order, fully, before writing any code)
1. `docs/01-project-requirements.md`: what to build, scope (Must / Should / Stretch), rules.
2. `docs/02-ui-ux-design.md`: palette, components, every page.
3. `docs/03-tech-stack-and-apis.md`: stack, free APIs, database SQL, risk formulas, architecture.
4. `docs/04-roadmap-and-prompts.md`: phases and the prompts that will be pasted to you one by one.

## Golden rules (never break these)
1. **Do not assume.** If a document does not say something, or two documents conflict, **stop and ask the user**. Do not guess endpoints, variable names, table columns or behaviour. If an external API response differs from the docs, report the difference and adapt only after confirming.
2. **Genuine data only.** Never invent weather, landslide, earthquake, hotel, user, report or statistic values in the UI or code. All real data comes from the sources in doc 03. The only allowed fake content is **clearly labelled test data and demo partner offers**, created by `supabase/seed.sql`, always with `is_test = true` / `is_demo = true`, and always shown with a visible **TEST** or **DEMO** badge. Never use real brand names (Airbnb, OYO, Zomato, etc.) in demo offers.
3. **Stay inside the project.** Build only what the docs list. Do not add features, pages, libraries or services that are not in doc 03. Suggest additions in `PROGRESS.md` instead.
4. **Safety first.** RouteX gives risk *estimates*, not official warnings. Every risk screen must show the disclaimer in doc 02. In the chat and SOS, safety advice always comes before any sponsored content, and sponsored stays appear only if their location is not High/Severe risk.
5. **Free only.** No paid service, no credit card. Use only the services in doc 03.
6. **Secrets.** Never put the Gemini key in frontend code. Keep keys in `.env.local` (git-ignored) and Supabase function secrets. Provide `.env.example` with names only.
7. **Light theme only**, white background, use the colour tokens in doc 02 (no random hex values). Risk colours always come with an icon and a text label (not colour alone).
8. **English only.**

## Working method for every prompt
1. Re-read the relevant doc sections named in the prompt.
2. Make a short plan (in `PROGRESS.md`), then implement.
3. Run type-check, lint and any tests. Fix errors before reporting.
4. Update `PROGRESS.md` with: what was built, files touched, what is still open, any question for the user.
5. Do not refactor unrelated code. Keep components small and typed (TypeScript strict).

## Planned repository layout
```
routex/
  docs/                      (these four documents)
  PROGRESS.md                (you maintain this)
  .env.example
  public/
    maps/                    (PMTiles region files, not committed)
    offline-guide.json       (rule-based safety guide)
    sw.js / manifest.webmanifest
  scripts/
    extract-pmtiles.sh
    import-landslides.ts
  supabase/
    migrations/              (SQL from doc 03)
    seed.sql                 (test data + demo offers only)
    functions/gemini-chat/   (Edge Function: AI chat proxy)
  src/
    app/ (router, providers)
    pages/
    components/ (ui, map, risk, layout)
    features/ (auth, weather, routing, risk, reports, rewards, offers, sos, chat, offline)
    lib/ (supabase, geo, api clients, config)
    styles/ (tokens.css, tailwind config)
```

## Environment variables (names only)
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ORS_API_KEY`, `VITE_DEMO_MODE` (true/false), and Supabase Edge Function secrets `GEMINI_API_KEY`, `GEMINI_MODEL`.

## Definition of done (whole project)
The demo script in doc 04 runs end to end on the laptop, online and with Wi-Fi switched off, with no console errors, using only real data plus clearly labelled test data.
