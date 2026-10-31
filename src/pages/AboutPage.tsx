import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  CloudRain,
  Mountain,
  Users,
  History,
  Droplets,
  Activity,
  AlertTriangle,
  Database,
  Sliders,
  ShieldCheck,
  Scale,
  ExternalLink,
  Copy,
  Check,
  Compass,
  Layers,
  Navigation,
  Globe,
  Sparkles,
} from 'lucide-react';
import { RISK_DISCLAIMER_TEXT } from '../features/risk/config';

interface DataSourceAttribution {
  name: string;
  category: string;
  license: string;
  licenseBadgeVariant: 'brand' | 'verified' | 'info' | 'neutral';
  attributionText: string;
  usageDescription: string;
  cachingPolicy: string;
  link: string;
  linkLabel: string;
  icon: React.ReactNode;
  iconBg: string;
}

export const AboutPage: React.FC = () => {
  const [copied, setCopied] = useState<boolean>(false);

  const FORMAL_LEGAL_ATTRIBUTION =
    '© OpenStreetMap contributors (ODbL) · Weather and elevation data by Open-Meteo.com (CC BY 4.0) · USGS Earthquake Hazards Program (Public Domain) · Geological Survey of India (GSI) / NASA Global Landslide Catalog (Kirschbaum et al. 2010, 2015) · Protomaps basemap data (PMTiles) · OpenRouteService / OSRM (FOSSGIS).';

  const handleCopyAttribution = async () => {
    try {
      await navigator.clipboard.writeText(FORMAL_LEGAL_ATTRIBUTION);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  const DATA_SOURCES: DataSourceAttribution[] = [
    {
      name: 'OpenStreetMap (OSM) & Overpass API',
      category: 'Road Geometry, Mountain Passes & Stays',
      license: 'ODbL 1.0 (Open Database License)',
      licenseBadgeVariant: 'brand',
      attributionText: '© OpenStreetMap contributors',
      usageDescription:
        'Provides foundational road and trail network geometry, mountain pass topological corridors, emergency shelters, high-altitude medical centers, and vetted accommodation amenities across the Himalayas.',
      cachingPolicy: '24-hour persistent IndexedDB cache (Dexie) with offline resilience',
      link: 'https://www.openstreetmap.org/copyright',
      linkLabel: 'openstreetmap.org/copyright',
      icon: <Compass className="w-5 h-5 text-emerald-600" />,
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      name: 'Open-Meteo Weather & Elevation API',
      category: 'Hydrometeorology, Soil Moisture & DEM',
      license: 'CC BY 4.0 (Creative Commons Attribution)',
      licenseBadgeVariant: 'verified',
      attributionText: 'Weather and elevation data by Open-Meteo.com (CC BY 4.0)',
      usageDescription:
        'Supplies 72-hour antecedent precipitation accumulation, 48-hour hourly rainfall forecasts, 0–1 cm topsoil moisture saturation levels, and 90m digital elevation models (DEM) for orthogonal slope grade calculations.',
      cachingPolicy: 'Hourly service-worker CacheStorage & StaleWhileRevalidate strategy',
      link: 'https://open-meteo.com/',
      linkLabel: 'open-meteo.com',
      icon: <CloudRain className="w-5 h-5 text-blue-600" />,
      iconBg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      name: 'USGS Earthquake Hazards Program',
      category: 'Near-Real-Time Seismic Monitoring',
      license: 'Public Domain (U.S. Government Work)',
      licenseBadgeVariant: 'info',
      attributionText: 'Data courtesy of the U.S. Geological Survey (USGS)',
      usageDescription:
        'Streams live seismic tremor feeds for M4.5+ earthquake events within a 150 km radius over the preceding 72 hours, weighting ground shake impact on steep fracture-prone slope faces.',
      cachingPolicy: 'Live GeoJSON polling with 24-hour fallback storage',
      link: 'https://earthquake.usgs.gov/',
      linkLabel: 'earthquake.usgs.gov',
      icon: <Activity className="w-5 h-5 text-red-600" />,
      iconBg: 'bg-red-500/10 border-red-500/20',
    },
    {
      name: 'NASA GLC & Geological Survey of India (GSI)',
      category: 'Historical Landslide Catalogue & Clusters',
      license: 'Open Scientific Data / Public Research',
      licenseBadgeVariant: 'neutral',
      attributionText: 'NASA GLC (Kirschbaum et al. 2010, 2015) & GSI Hazard Inventories',
      usageDescription:
        'Powers the 10-year historical landslide hazard catalogue within 5 km radial sample buffers, identifying recurrent slide corridors and chronic high-risk zones across HP, UK, J&K, and Northeast India.',
      cachingPolicy: 'Embedded static spatial index with zero network overhead',
      link: 'https://data.nasa.gov/',
      linkLabel: 'data.nasa.gov',
      icon: <Mountain className="w-5 h-5 text-amber-600" />,
      iconBg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      name: 'Protomaps Vector Basemaps & PMTiles',
      category: 'Offline-First Vector Basemap Engine',
      license: 'BSD-3-Clause / CC BY 4.0',
      licenseBadgeVariant: 'brand',
      attributionText: 'Basemap data © OpenStreetMap contributors, styles by Protomaps',
      usageDescription:
        'Enables zero-cloud-latency, serverless vector tile streaming directly from local byte-range PMTiles archives, guaranteeing complete offline mapping when cellular towers fail in deep Himalayan gorges.',
      cachingPolicy: 'Local device PWA storage; zero third-party tile server calls',
      link: 'https://protomaps.com/',
      linkLabel: 'protomaps.com',
      icon: <Layers className="w-5 h-5 text-indigo-600" />,
      iconBg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      name: 'OpenRouteService (HeiGIT) & Project OSRM',
      category: 'Multi-Modal Corridors & Hazard Detours',
      license: 'GPL v3 / FOSSGIS Community Fair-Use',
      licenseBadgeVariant: 'verified',
      attributionText: 'Routing engines powered by OpenRouteService (HeiGIT) & Project OSRM',
      usageDescription:
        'Computes vehicle and pedestrian topological routing corridors, executes 2 km interval waypoint sampling, and generates dynamic 400m hazard exclusion polygons for automatic landslide bypass detours.',
      cachingPolicy: 'Route corridor geometry cached in Dexie for offline turn guidance',
      link: 'https://openrouteservice.org/',
      linkLabel: 'openrouteservice.org',
      icon: <Navigation className="w-5 h-5 text-purple-600" />,
      iconBg: 'bg-purple-500/10 border-purple-500/20',
    },
  ];

  return (
    <div className="max-w-[1000px] w-full mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand" icon={<Sparkles className="w-3.5 h-3.5" />}>
            Verified Open Methodology
          </Badge>
          <Badge variant="verified" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            Hackathon Edition v0.1.0
          </Badge>
        </div>
        <h1 className="text-h1 font-bold text-brand tracking-tight">
          About RouteX & Risk Methodology
        </h1>
        <p className="text-body text-text-2 max-w-3xl leading-relaxed">
          RouteX is an explainable, disaster-aware mountain navigation platform engineered specifically
          for the rugged terrain and flash hazard environments of the Himalayan states (Himachal Pradesh,
          Uttarakhand, Jammu & Kashmir, Ladakh) and Northeast India.
        </p>

        {/* Quick Jump Navigation Pill Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/80 text-xs">
          <span className="text-text-3 font-semibold uppercase tracking-wider text-[11px] mr-1">
            Contents:
          </span>
          <a
            href="#attributions"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-chip bg-brand text-white font-bold shadow-sm hover:bg-brand-hover transition-colors"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Data Attributions & Open Licenses</span>
            <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-chip uppercase tracking-wider font-extrabold ml-0.5">
              Priority
            </span>
          </a>
          <a
            href="#architecture"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-chip bg-surface-2 text-text hover:text-brand hover:bg-surface border border-border transition-colors font-medium"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Engine Architecture</span>
          </a>
          <a
            href="#factors"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-chip bg-surface-2 text-text hover:text-brand hover:bg-surface border border-border transition-colors font-medium"
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>Factor Formulations</span>
          </a>
          <a
            href="#limitations"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-chip bg-surface-2 text-text hover:text-brand hover:bg-surface border border-border transition-colors font-medium"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Known Limitations</span>
          </a>
        </div>
      </div>

      {/* Safety Disclaimer Banner */}
      <Banner variant="disclaimer">
        {RISK_DISCLAIMER_TEXT}
      </Banner>

      {/* =========================================================================
          PRIORITIZED SECTION 1: DATA ATTRIBUTIONS & OPEN LICENSES (BOLD & PROMINENT)
         ========================================================================= */}
      <section id="attributions" className="scroll-mt-20">
        <div className="relative overflow-hidden rounded-card border-2 border-brand/50 bg-gradient-to-br from-surface via-surface to-brand-soft/25 p-6 sm:p-8 shadow-card space-y-6">
          {/* Decorative accent top bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand via-accent to-verified" />

          {/* Section Header */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand" icon={<Scale className="w-3.5 h-3.5" />}>
                100% Open Data Stack
              </Badge>
              <Badge variant="verified" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                ODbL & CC BY 4.0 Compliant
              </Badge>
              <Badge variant="info" icon={<Globe className="w-3.5 h-3.5" />}>
                Zero Proprietary Black-Boxes
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-btn bg-brand text-white shadow-sm">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-brand tracking-tight">
                  Data Attributions & Open Licenses
                </h2>
                <p className="text-xs sm:text-sm text-text-3 font-medium">
                  Technical Specification Compliance (Doc 03 Section 14) · Transparent Data Provenance
                </p>
              </div>
            </div>

            <p className="text-body text-text-2 leading-relaxed pt-1">
              RouteX operates on an uncompromising commitment to open science, copyleft governance, and public safety transparency.
              Our hazard predictions, road topology, and emergency features are powered entirely by public-sector scientific datasets,
              crowdsourced cartography, and open APIs. Every data source utilized in the platform is formally recognized and attributed
              below in full compliance with its upstream license.
            </p>
          </div>

          {/* 6 Data Sources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {DATA_SOURCES.map((source) => (
              <div
                key={source.name}
                className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-btn bg-surface border border-border hover:border-brand/40 hover:shadow-md transition-all duration-200"
              >
                <div className="space-y-3">
                  {/* Top row: Icon, Category & License */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-btn border ${source.iconBg}`}>
                        {source.icon}
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider block">
                          {source.category}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-text group-hover:text-brand transition-colors">
                          {source.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={source.licenseBadgeVariant}>
                      {source.license}
                    </Badge>
                  </div>

                  {/* Operational Role */}
                  <p className="text-xs text-text-2 leading-relaxed">
                    {source.usageDescription}
                  </p>
                </div>

                {/* Footer of Card: Attribution requirement & Link */}
                <div className="pt-3 mt-3 border-t border-border/70 space-y-2 text-xs">
                  <div className="flex items-start gap-1.5 font-mono text-[11px] text-text-2 bg-surface-2 p-2 rounded-btn border border-border/50">
                    <span className="text-brand font-bold shrink-0">Credit:</span>
                    <span className="select-all font-semibold text-text">{source.attributionText}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-3 font-medium truncate max-w-[200px]" title={source.cachingPolicy}>
                      {source.cachingPolicy}
                    </span>
                    <a
                      href={source.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-brand hover:text-brand-hover hover:underline shrink-0"
                    >
                      <span>{source.linkLabel}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Verbatim Legal Attribution Copyable Block */}
          <div className="p-4 sm:p-5 rounded-btn bg-surface border-2 border-brand/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-verified" />
                <h4 className="text-sm font-bold text-text">
                  Official Verbatim Legal Notice (Doc 03 Section 14)
                </h4>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyAttribution}
                className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-semibold"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-verified" />
                    <span className="text-verified">Copied Notice</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-text-2" />
                    <span>Copy Formal Attribution</span>
                  </>
                )}
              </Button>
            </div>

            <div className="p-3 bg-surface-2 rounded-btn border border-border font-mono text-xs text-text select-all leading-relaxed">
              {FORMAL_LEGAL_ATTRIBUTION}
            </div>

            <p className="text-[11px] text-text-3 leading-normal">
              This statutory attribution clause is continuously rendered across RouteX’s persistent application footer,
              offline PMTiles metadata manifests, Route Risk export summaries, and emergency PDF snapshots.
            </p>
          </div>

          {/* Open Governance & Fair-Use Compliance Table */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs sm:text-sm font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-brand" />
              <span>Open Licensing & Fair-Use Compliance Matrix</span>
            </h4>
            <div className="overflow-x-auto rounded-btn border border-border">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-surface-2 text-text font-semibold border-b border-border">
                    <th className="p-2.5 border-r border-border">Provider</th>
                    <th className="p-2.5 border-r border-border">License</th>
                    <th className="p-2.5 border-r border-border">Operational Scope</th>
                    <th className="p-2.5">Fair-Use & Caching Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text-2 font-mono text-[11px]">
                  <tr>
                    <td className="p-2.5 border-r border-border font-sans font-semibold text-text">OpenStreetMap</td>
                    <td className="p-2.5 border-r border-border text-brand font-bold">ODbL 1.0</td>
                    <td className="p-2.5 border-r border-border font-sans">Road vectors, amenities, stays</td>
                    <td className="p-2.5 font-sans">24h IndexedDB cache; Overpass fair-use mirrors used</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border-r border-border font-sans font-semibold text-text">Open-Meteo</td>
                    <td className="p-2.5 border-r border-border text-verified font-bold">CC BY 4.0</td>
                    <td className="p-2.5 border-r border-border font-sans">Rainfall, soil saturation, elevation DEM</td>
                    <td className="p-2.5 font-sans">Free non-commercial tier (&lt;10,000 calls/day); CC BY credit shown</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border-r border-border font-sans font-semibold text-text">USGS</td>
                    <td className="p-2.5 border-r border-border text-info font-bold">Public Domain</td>
                    <td className="p-2.5 border-r border-border font-sans">M4.5+ seismic tremors within 150 km</td>
                    <td className="p-2.5 font-sans">Unrestricted public domain access; 72h moving window</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border-r border-border font-sans font-semibold text-text">NASA GLC / GSI</td>
                    <td className="p-2.5 border-r border-border text-text font-bold">Open Science</td>
                    <td className="p-2.5 border-r border-border font-sans">10-year historical slide points</td>
                    <td className="p-2.5 font-sans">Scientific citation (Kirschbaum et al. 2010, 2015)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border-r border-border font-sans font-semibold text-text">Protomaps</td>
                    <td className="p-2.5 border-r border-border text-brand font-bold">BSD-3 / CC BY</td>
                    <td className="p-2.5 border-r border-border font-sans">Offline PMTiles vector basemap</td>
                    <td className="p-2.5 font-sans">Zero external tile API calls; bundled on-device</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border-r border-border font-sans font-semibold text-text">OSRM / ORS</td>
                    <td className="p-2.5 border-r border-border text-verified font-bold">GPL v3 / FOSS</td>
                    <td className="p-2.5 border-r border-border font-sans">Routing corridors, avoidance detours</td>
                    <td className="p-2.5 font-sans">Public community cluster fair-use with local fallback</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: CORE ARCHITECTURE & RISK SCORING ENGINE
         ========================================================================= */}
      <section id="architecture" className="scroll-mt-20">
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-brand" />
            <h2 className="text-h2 font-semibold text-text">How Risk Scoring Works (Engine Architecture)</h2>
          </div>
          <p className="text-body text-text-2 leading-relaxed">
            Unlike standard road routing engines that optimize strictly for the shortest travel time, RouteX samples candidate corridors every 2 km (between 8 and 30 sample points per route) and evaluates six environmental, topographic, and crowdsourced hazard factors for each segment.
          </p>

          <div className="p-4 bg-brand-soft/40 border border-brand/20 rounded-btn font-mono text-xs sm:text-sm text-brand space-y-1">
            <p className="font-bold">Segment Score Formula (0 to 100):</p>
            <p className="text-text">
              score = 100 × (0.30 Rain + 0.20 Terrain + 0.20 Reports + 0.15 History + 0.10 Soil + 0.05 Seismic)
            </p>
            <p className="text-risk-severe font-semibold pt-1">
              Blocked Override: A verified road_blocked or landslide report within 150 m sets score = 100 and status = Blocked.
            </p>
          </div>

          <div className="p-4 bg-surface border border-border rounded-btn font-mono text-xs sm:text-sm text-text space-y-1">
            <p className="font-bold text-brand">Route Score Aggregation:</p>
            <p>
              routeScore = round(0.6 × max(segment_scores) + 0.4 × mean(segment_scores))
            </p>
            <p className="text-text-2 text-xs pt-1">
              Heavily penalizes routes with single severe bottlenecks while maintaining awareness of continuous sustained exposure.
            </p>
          </div>

          {/* Risk Bands Table */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-xs text-left border-collapse border border-border">
              <thead>
                <tr className="bg-surface text-text font-semibold border-b border-border">
                  <th className="p-2.5 border-r border-border">Risk Level</th>
                  <th className="p-2.5 border-r border-border">Score Band</th>
                  <th className="p-2.5 border-r border-border">Operational Meaning</th>
                  <th className="p-2.5">UI Token Color</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-text-2">
                <tr>
                  <td className="p-2.5 border-r border-border font-semibold text-risk-low">Low</td>
                  <td className="p-2.5 border-r border-border">0 – 24</td>
                  <td className="p-2.5 border-r border-border font-sans">Normal baseline hill conditions. Safe to proceed.</td>
                  <td className="p-2.5 font-bold text-risk-low">#22C55E</td>
                </tr>
                <tr>
                  <td className="p-2.5 border-r border-border font-semibold text-risk-moderate">Moderate</td>
                  <td className="p-2.5 border-r border-border">25 – 49</td>
                  <td className="p-2.5 border-r border-border font-sans">Elevated rain or moderate slope cutting. Drive with caution.</td>
                  <td className="p-2.5 font-bold text-risk-moderate">#EAB308</td>
                </tr>
                <tr>
                  <td className="p-2.5 border-r border-border font-semibold text-risk-high">High</td>
                  <td className="p-2.5 border-r border-border">50 – 74</td>
                  <td className="p-2.5 border-r border-border font-sans">Heavy precipitation or recent active hazards. Avoid non-essential travel.</td>
                  <td className="p-2.5 font-bold text-risk-high">#F97316</td>
                </tr>
                <tr>
                  <td className="p-2.5 border-r border-border font-semibold text-risk-severe">Severe</td>
                  <td className="p-2.5 border-r border-border">75 – 100</td>
                  <td className="p-2.5 border-r border-border font-sans">Flash flood risk, saturated slopes, or major active slide. High danger.</td>
                  <td className="p-2.5 font-bold text-risk-severe">#EF4444</td>
                </tr>
                <tr className="bg-risk-blocked-soft">
                  <td className="p-2.5 border-r border-border font-bold text-risk-blocked">Blocked</td>
                  <td className="p-2.5 border-r border-border">100</td>
                  <td className="p-2.5 border-r border-border font-sans font-semibold text-risk-blocked">Physically obstructed road confirmed by verified report within 150m.</td>
                  <td className="p-2.5 font-bold text-risk-blocked">#1E293B</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* =========================================================================
          SECTION 3: MATHEMATICAL FORMULATIONS PER FACTOR
         ========================================================================= */}
      <section id="factors" className="scroll-mt-20">
        <Card className="space-y-4">
          <h2 className="text-h2 font-semibold text-text">Mathematical Formulations per Factor (Normalized 0..1)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Rain */}
            <div className="p-3.5 rounded-btn bg-surface border border-border space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-text">
                <CloudRain className="w-4 h-4 text-blue-500" />
                <span>Rainfall Intensity (30% Weight)</span>
              </div>
              <p className="font-mono text-text">
                Rain = 0.7 × min(1, accum / 120) + 0.3 × min(1, maxHourly / 30)
              </p>
              <p className="text-text-2">
                accum = rain past 72 h + 0.5 × rain next 48 h (mm). maxHourly = max hourly precipitation in next 24 h (mm/h).
              </p>
            </div>

            {/* Terrain */}
            <div className="p-3.5 rounded-btn bg-surface border border-border space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-text">
                <Mountain className="w-4 h-4 text-amber-600" />
                <span>Terrain Steepness (20% Weight)</span>
              </div>
              <p className="font-mono text-text">
                Terrain = clamp((slopeDeg - 10) / (35 - 10), 0, 1)
              </p>
              <p className="text-text-2">
                Elevation is sampled at the point and 4 orthogonal neighbours ~250m away (N, S, E, W). slopeDeg = atan(max(abs(dz)) / 250m) × (180 / π).
              </p>
            </div>

            {/* Community Reports */}
            <div className="p-3.5 rounded-btn bg-surface border border-border space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-text">
                <Users className="w-4 h-4 text-orange-500" />
                <span>Community Hazard Reports (20% Weight)</span>
              </div>
              <p className="font-mono text-text">
                Reports = max(typeFactor × confidence × severityMultiplier)
              </p>
              <p className="text-text-2">
                Evaluated over non-expired, non-disputed reports within 500m. Types: landslide (1.0), road_blocked (1.0), rockfall (0.8), flood (0.8), bridge (0.9), snow (0.5), all_clear (0.0). Confidence: verified = 1.0; pending = min(1, 0.4 + 0.2 × up_votes). Severity: 0.6 / 0.8 / 1.0.
              </p>
            </div>

            {/* History */}
            <div className="p-3.5 rounded-btn bg-surface border border-border space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-text">
                <History className="w-4 h-4 text-indigo-500" />
                <span>Historical Landslide Catalogue (15% Weight)</span>
              </div>
              <p className="font-mono text-text">
                History = min(1, N / 5)
              </p>
              <p className="text-text-2">
                N = count of historical landslide occurrences within 5 km of sample in the last 10 years. <strong>Integrity rule:</strong> If catalogue has no records in the area, factor is 0 and output is "No recent records in catalogue" (never "safe").
              </p>
            </div>

            {/* Soil Moisture */}
            <div className="p-3.5 rounded-btn bg-surface border border-border space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-text">
                <Droplets className="w-4 h-4 text-emerald-500" />
                <span>Surface Soil Moisture (10% Weight)</span>
              </div>
              <p className="font-mono text-text">
                Soil = clamp((soilMoisture - 0.15) / (0.40 - 0.15), 0, 1)
              </p>
              <p className="text-text-2">
                Uses shallow hourly soil moisture (0–1 cm in m³/m³). Captures topsoil saturation before deep infiltration occurs.
              </p>
            </div>

            {/* Seismic */}
            <div className="p-3.5 rounded-btn bg-surface border border-border space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-text">
                <Activity className="w-4 h-4 text-red-500" />
                <span>Seismic Activity (5% Weight)</span>
              </div>
              <p className="font-mono text-text">
                Seismic = max(clamp((mag - 4.5) / 1.5, 0, 1) × (1 - distanceKm / 150))
              </p>
              <p className="text-text-2">
                USGS events M4.5+ in the last 72 hours within 150 km. Accounts for rock destabilization caused by ground tremors.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* =========================================================================
          SECTION 4: KNOWN LIMITATIONS (STATED HONESTLY)
         ========================================================================= */}
      <section id="limitations" className="scroll-mt-20">
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-risk-moderate" />
            <h2 className="text-h2 font-semibold text-text">Known Limitations (Stated Honestly)</h2>
          </div>
          <p className="text-small text-text-2 leading-relaxed">
            As stated in our technical specification (Doc 03 section 15):
          </p>
          <ul className="list-disc list-inside text-small text-text-2 space-y-2 ml-2">
            <li><strong>No live single landslide API:</strong> No free live global or national landslide-event API exists; the RouteX score is an explainable layered estimate rather than a deterministic ground truth sensor.</li>
            <li><strong>Reporting Bias:</strong> Historical catalogues (GSI / NASA GLC) are largely media-reported and naturally biased toward accessible, inhabited, and populated highway corridors.</li>
            <li><strong>Resolution Limits:</strong> Slope derived from 250 m orthogonal neighbour sampling is coarse and may smooth micro-cuttings or vertical roadside overhangs.</li>
            <li><strong>Non-commercial Data Limits:</strong> Open-Meteo free tier is restricted to non-commercial use; production commercial launch with partner stays would transition to their paid commercial tier or self-hosted ERA5 models.</li>
            <li><strong>Shared Fair-use Servers:</strong> Base routing relies on OSRM public community routing instances; network latency fluctuates during peak traffic.</li>
            <li><strong>Heuristic Baseline:</strong> Factor weights are expert starting heuristics formulated for the hackathon prototype pending backtesting against historical disaster archives.</li>
          </ul>
        </Card>
      </section>
    </div>
  );
};
