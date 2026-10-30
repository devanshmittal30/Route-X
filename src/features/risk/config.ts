/**
 * RouteX Risk Engine Configuration
 * Implemented verbatim from docs/03-tech-stack-and-apis.md section 6.
 *
 * NOTE: All constants below are starting heuristics per project requirements.
 * Do not tune constants without asking the user.
 */

// Factor weights summing to 1.00
export const RISK_WEIGHTS = {
  rain: 0.30,
  terrain: 0.20,
  reports: 0.20,
  history: 0.15,
  soil: 0.10,
  seismic: 0.05,
} as const;

// Sampling rules (doc 03 section 6.1)
export const SAMPLING_CONFIG = {
  intervalKm: 2.0,
  minSamples: 8,
  maxSamples: 30,
  gridCellDeg: 0.1,
  elevationOffsetM: 250,
} as const;

// Rain factor heuristics (doc 03 section 6.2)
export const RAIN_CONFIG = {
  accumThresholdMm: 120,
  accumWeight: 0.7,
  hourlyThresholdMm: 30,
  hourlyWeight: 0.3,
  pastHours: 72,
  futureHours: 48,
  hourlyWindowHours: 24,
} as const;

// Soil factor heuristics (doc 03 section 6.2)
export const SOIL_CONFIG = {
  minMoisture: 0.15,
  maxMoisture: 0.40,
} as const;

// Terrain factor heuristics (doc 03 section 6.2)
export const TERRAIN_CONFIG = {
  minSlopeDeg: 10,
  maxSlopeDeg: 35,
  neighborDistanceM: 250,
} as const;

// Historical landslides heuristics (doc 03 section 6.2)
export const HISTORY_CONFIG = {
  radiusKm: 5,
  lookbackYears: 10,
  saturationCount: 5,
  noRecordsText: 'No recent records in catalogue',
} as const;

// Community hazard reports heuristics (doc 03 section 6.2)
export const REPORTS_CONFIG = {
  radiusM: 500,
  blockedOverrideRadiusM: 150,
  typeFactors: {
    landslide: 1.0,
    road_blocked: 1.0,
    rockfall: 0.8,
    flood: 0.8,
    bridge_damage: 0.9,
    snow: 0.5,
    all_clear: 0.0,
  },
  severityMultipliers: {
    1: 0.6,
    2: 0.8,
    3: 1.0,
  },
  pendingBaseConfidence: 0.4,
  pendingUpVoteBonus: 0.2,
  pendingMaxConfidence: 1.0,
} as const;

// Seismic earthquake heuristics (doc 03 section 6.2)
export const SEISMIC_CONFIG = {
  minMagnitude: 4.5,
  magScaleDenominator: 1.5, // (mag - 4.5) / 1.5 reaches 1.0 at M6.0
  radiusKm: 150,
  lookbackHours: 72,
} as const;

// Route level score aggregation (doc 03 section 6.3)
export const ROUTE_AGGREGATION_CONFIG = {
  maxWeight: 0.6,
  meanWeight: 0.4,
} as const;

// Risk Level bands (doc 03 section 6.3)
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Severe' | 'Blocked';

export const RISK_LEVEL_BANDS = {
  Low: { min: 0, max: 24, label: 'Low', color: '#22C55E', badgeLevel: 'low' },
  Moderate: { min: 25, max: 49, label: 'Moderate', color: '#EAB308', badgeLevel: 'moderate' },
  High: { min: 50, max: 74, label: 'High', color: '#F97316', badgeLevel: 'high' },
  Severe: { min: 75, max: 100, label: 'Severe', color: '#EF4444', badgeLevel: 'severe' },
  Blocked: { min: 100, max: 100, label: 'Blocked', color: '#1E293B', badgeLevel: 'blocked' },
} as const;

// Disclaimer text from doc 01 section 7 and doc 03 section 14
export const RISK_DISCLAIMER_TEXT =
  'RouteX gives risk estimates from public data and user reports. It is not an official warning. Follow IMD, NDMA and local administration advisories.';

// Data sources documentation
export const DATA_SOURCES = {
  rain: {
    name: 'Open-Meteo Weather Forecast',
    license: 'CC BY 4.0',
    endpoint: 'https://api.open-meteo.com/v1/forecast',
  },
  terrain: {
    name: 'Open-Meteo Elevation API',
    license: 'CC BY 4.0',
    endpoint: 'https://api.open-meteo.com/v1/elevation',
  },
  reports: {
    name: 'RouteX Verified Community Reports',
    license: 'ODbL / Platform Data',
    endpoint: 'Supabase RPC reports_along_route',
  },
  history: {
    name: 'Geological Survey of India (GSI) / NASA GLC',
    license: 'Public Domain / Kirschbaum et al.',
    endpoint: 'Supabase historical_landslides',
  },
  soil: {
    name: 'Open-Meteo Soil Wetness (0-1cm)',
    license: 'CC BY 4.0',
    endpoint: 'https://api.open-meteo.com/v1/forecast',
  },
  seismic: {
    name: 'USGS Earthquake Hazards Program',
    license: 'Public Domain',
    endpoint: 'https://earthquake.usgs.gov/fdsnws/event/1/query',
  },
} as const;
