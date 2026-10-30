import type { SegmentFactors, HazardReportItem, EarthquakeRiskItem } from '../types';

/**
 * Hand-calculated fixture data for risk engine testing.
 * Every expected value is pre-calculated from docs/03-tech-stack-and-apis.md section 6.
 */

export const RAIN_TEST_CASES = [
  { accum: 0, maxHourly: 0, expected: 0.0 },
  { accum: 60, maxHourly: 15, expected: 0.5 }, // 0.7 * (60/120) + 0.3 * (15/30) = 0.35 + 0.15 = 0.50
  { accum: 120, maxHourly: 30, expected: 1.0 }, // 0.7 * 1 + 0.3 * 1 = 1.0
  { accum: 200, maxHourly: 60, expected: 1.0 }, // saturated
  { accum: -10, maxHourly: -5, expected: 0.0 }, // negative values clamped
];

export const SOIL_TEST_CASES = [
  { moisture: 0.15, expected: 0.0 }, // min threshold
  { moisture: 0.1, expected: 0.0 }, // below min clamped
  { moisture: 0.275, expected: 0.5 }, // (0.275 - 0.15) / 0.25 = 0.50
  { moisture: 0.4, expected: 1.0 }, // max threshold
  { moisture: 0.55, expected: 1.0 }, // saturated clamped
];

export const TERRAIN_TEST_CASES = [
  { slopeDeg: 10, expected: 0.0 }, // min threshold
  { slopeDeg: 5, expected: 0.0 }, // below min clamped
  { slopeDeg: 22.5, expected: 0.5 }, // (22.5 - 10) / 25 = 0.50
  { slopeDeg: 35, expected: 1.0 }, // max threshold
  { slopeDeg: 55, expected: 1.0 }, // steep clamped
];

export const HISTORY_TEST_CASES = [
  { count: 0, hasRecords: false, expectedFactor: 0.0, expectedText: 'No recent records in catalogue' },
  { count: 0, hasRecords: true, expectedFactor: 0.0, expectedText: 'No recent records in catalogue' },
  { count: 1, hasRecords: true, expectedFactor: 0.2, expectedText: '1 historical landslide event in last 10 years within 5 km' },
  { count: 5, hasRecords: true, expectedFactor: 1.0, expectedText: '5 historical landslide events in last 10 years within 5 km' },
  { count: 12, hasRecords: true, expectedFactor: 1.0, expectedText: '12 historical landslide events in last 10 years within 5 km' },
];

export const SEISMIC_TEST_CASES = [
  { mag: 4.5, distKm: 0, expected: 0.0 }, // (4.5 - 4.5)/1.5 * 1.0 = 0.0
  { mag: 6.0, distKm: 0, expected: 1.0 }, // 1.0 * 1.0 = 1.0
  { mag: 6.0, distKm: 75, expected: 0.5 }, // 1.0 * (1 - 75/150) = 0.50
  { mag: 6.0, distKm: 150, expected: 0.0 }, // 1.0 * 0 = 0.0
  { mag: 5.25, distKm: 0, expected: 0.5 }, // (0.75 / 1.5) * 1.0 = 0.50
  { mag: 7.2, distKm: 0, expected: 1.0 }, // clamped mag
];

export const ZERO_FACTORS: SegmentFactors = {
  rain: 0,
  terrain: 0,
  reports: 0,
  history: 0,
  soil: 0,
  seismic: 0,
  historyHasNoRecords: true,
  rawMetrics: {
    accumRainMm: 0,
    maxHourlyRainMm: 0,
    slopeDeg: 0,
    elevationM: 1000,
    soilMoistureM3: 0.12,
    historyNearCount: 0,
    activeReportsCount: 0,
    nearbyQuakesCount: 0,
  },
};

export const BALANCED_FACTORS: SegmentFactors = {
  rain: 0.5, // 0.30 * 0.5 = 0.150
  terrain: 0.5, // 0.20 * 0.5 = 0.100
  reports: 0.5, // 0.20 * 0.5 = 0.100
  history: 0.4, // 0.15 * 0.4 = 0.060
  soil: 0.5, // 0.10 * 0.5 = 0.050
  seismic: 0.5, // 0.05 * 0.5 = 0.025
  // Total = 0.15 + 0.10 + 0.10 + 0.06 + 0.05 + 0.025 = 0.485 * 100 = 48.5 -> round = 49 (Moderate)
  historyHasNoRecords: false,
  rawMetrics: {
    accumRainMm: 60,
    maxHourlyRainMm: 15,
    slopeDeg: 22.5,
    elevationM: 2150,
    soilMoistureM3: 0.275,
    historyNearCount: 2,
    activeReportsCount: 1,
    nearbyQuakesCount: 1,
  },
};

export const BLOCKED_HAZARD_REPORT: HazardReportItem = {
  id: 'rep-blocked-001',
  type: 'road_blocked',
  severity: 3,
  status: 'verified',
  is_test: false,
  up_count: 5,
  down_count: 0,
  coordinates: [77.1734, 31.1048],
  distanceMeters: 75, // < 150m -> triggers override
  description: 'Massive debris block on NH5',
};

export const SAMPLE_QUAKE_75KM: EarthquakeRiskItem = {
  id: 'usgs-m6-001',
  magnitude: 6.0,
  timeIso: new Date().toISOString(),
  coordinates: [77.17, 31.8],
  distanceKm: 75,
  place: '75km N of Mandi',
};
