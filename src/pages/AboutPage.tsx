import React from 'react';
import { Card } from '../components/ui/Card';
import { Banner } from '../components/ui/Banner';
import { CloudRain, Mountain, Users, History, Droplets, Activity, AlertTriangle, Database, Sliders } from 'lucide-react';
import { RISK_DISCLAIMER_TEXT } from '../features/risk/config';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-[1000px] w-full mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-h1 font-bold text-brand mb-2">About RouteX & Risk Methodology</h1>
        <p className="text-body text-text-2">
          RouteX is a mountain-and-disaster-aware navigation website engineered specifically for the Himalayan states (Himachal Pradesh, Uttarakhand, Jammu & Kashmir, Ladakh) and Northeast India.
        </p>
      </div>

      <Banner variant="disclaimer">
        {RISK_DISCLAIMER_TEXT}
      </Banner>

      {/* 1. Core Architecture & Risk Formula */}
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

      {/* 2. Factor Mathematical Formulations */}
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

      {/* 3. Known Limitations (Doc 03 Section 15) */}
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

      {/* 4. Data Attributions (Doc 03 Section 14) */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-brand" />
          <h2 className="text-h2 font-semibold text-text">Data Attributions & Open Licenses</h2>
        </div>
        <p className="text-small text-text-2 leading-relaxed">
          © OpenStreetMap contributors (ODbL) · Weather and elevation data by Open-Meteo.com (CC BY 4.0) · USGS Earthquake Hazards Program (Public Domain) · Geological Survey of India (GSI) / NASA Global Landslide Catalog (Kirschbaum et al. 2010, 2015) · Protomaps basemap data · OpenRouteService / OSRM (FOSSGIS).
        </p>
      </Card>
    </div>
  );
};
