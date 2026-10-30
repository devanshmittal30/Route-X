import * as turf from '@turf/turf';
import type { LineString } from 'geojson';
import {
  RISK_WEIGHTS,
  SAMPLING_CONFIG,
  RAIN_CONFIG,
  SOIL_CONFIG,
  TERRAIN_CONFIG,
  HISTORY_CONFIG,
  REPORTS_CONFIG,
  SEISMIC_CONFIG,
  ROUTE_AGGREGATION_CONFIG,
  RISK_DISCLAIMER_TEXT,
  DATA_SOURCES,
  type RiskLevel,
} from './config';
import type {
  RouteSample,
  SegmentFactors,
  SegmentRisk,
  HazardReportItem,
  EarthquakeRiskItem,
  FactorBar,
} from './types';

/**
 * Utility clamp helper.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Pure function: sample a GeoJSON LineString route.
 * Rule: Sample a point every 2 km (min 8, max 30 samples per route).
 * Each sample has a segment (the stretch to the next sample).
 */
export function sampleRoute(
  lineGeometry: LineString,
  intervalKm: number = SAMPLING_CONFIG.intervalKm,
  minSamples: number = SAMPLING_CONFIG.minSamples,
  maxSamples: number = SAMPLING_CONFIG.maxSamples
): RouteSample[] {
  const line = turf.lineString(lineGeometry.coordinates);
  const totalLengthKm = turf.length(line, { units: 'kilometers' });

  // Determine number of sample points
  let sampleCount: number;
  if (totalLengthKm <= 0.001) {
    sampleCount = minSamples;
  } else {
    sampleCount = Math.round(totalLengthKm / intervalKm) + 1;
    sampleCount = Math.max(minSamples, Math.min(maxSamples, sampleCount));
  }

  const samples: RouteSample[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const distanceKm =
      sampleCount <= 1 ? 0 : (totalLengthKm * i) / (sampleCount - 1);

    const point = turf.along(line, distanceKm, { units: 'kilometers' });
    const coords: [number, number] = [
      Number(point.geometry.coordinates[0].toFixed(5)),
      Number(point.geometry.coordinates[1].toFixed(5)),
    ];

    // Compute stretch to next sample point (or backwards for last sample)
    let segmentGeometry: LineString;
    if (totalLengthKm <= 0.001) {
      segmentGeometry = {
        type: 'LineString',
        coordinates: [coords, coords],
      };
    } else if (i < sampleCount - 1) {
      const nextDistanceKm = (totalLengthKm * (i + 1)) / (sampleCount - 1);
      const sliced = turf.lineSliceAlong(line, distanceKm, nextDistanceKm, {
        units: 'kilometers',
      });
      segmentGeometry = sliced.geometry as LineString;
    } else {
      const prevDistanceKm = (totalLengthKm * (i - 1)) / (sampleCount - 1);
      const sliced = turf.lineSliceAlong(line, prevDistanceKm, distanceKm, {
        units: 'kilometers',
      });
      segmentGeometry = sliced.geometry as LineString;
    }

    // Grid cell key rounded to 0.1 degree for weather deduplication
    const gridCellKey = `${coords[1].toFixed(1)},${coords[0].toFixed(1)}`;

    samples.push({
      index: i,
      coordinates: coords,
      distanceKm: Number(distanceKm.toFixed(2)),
      segmentGeometry,
      gridCellKey,
    });
  }

  return samples;
}

/**
 * Pure function: calculates slope degrees from center and 4 orthogonal neighbours (250m).
 * Formula: atan(max(abs(dz)) / 250m) * (180 / PI)
 */
export function slopeFromElevations(
  centerElev: number,
  northElev: number,
  southElev: number,
  eastElev: number,
  westElev: number,
  distanceM: number = TERRAIN_CONFIG.neighborDistanceM
): number {
  const dzN = Math.abs(northElev - centerElev);
  const dzS = Math.abs(southElev - centerElev);
  const dzE = Math.abs(eastElev - centerElev);
  const dzW = Math.abs(westElev - centerElev);

  const maxAbsDz = Math.max(dzN, dzS, dzE, dzW);
  const slopeRad = Math.atan(maxAbsDz / distanceM);
  const slopeDeg = slopeRad * (180 / Math.PI);

  return Number(slopeDeg.toFixed(2));
}

/**
 * Pure function: Rain factor (normalized 0..1)
 * Formula: 0.7 * min(1, accum / 120) + 0.3 * min(1, maxHourly / 30)
 * where accum = rain past 72 h + 0.5 * rain next 48 h (mm),
 *       maxHourly = max hourly precipitation in next 24 h (mm/h).
 */
export function rainFactor(accumRainMm: number, maxHourlyRainMm: number): number {
  const accumClamped = Math.max(0, accumRainMm);
  const hourlyClamped = Math.max(0, maxHourlyRainMm);

  const accumPart =
    RAIN_CONFIG.accumWeight *
    Math.min(1, accumClamped / RAIN_CONFIG.accumThresholdMm);
  const hourlyPart =
    RAIN_CONFIG.hourlyWeight *
    Math.min(1, hourlyClamped / RAIN_CONFIG.hourlyThresholdMm);

  const factor = accumPart + hourlyPart;
  return clamp(Number(factor.toFixed(4)), 0, 1);
}

/**
 * Pure function: Soil factor (normalized 0..1)
 * Formula: clamp((soilMoisture - 0.15) / (0.40 - 0.15), 0, 1)
 */
export function soilFactor(soilMoistureM3: number): number {
  const factor =
    (soilMoistureM3 - SOIL_CONFIG.minMoisture) /
    (SOIL_CONFIG.maxMoisture - SOIL_CONFIG.minMoisture);
  return clamp(Number(factor.toFixed(4)), 0, 1);
}

/**
 * Pure function: Terrain factor (normalized 0..1)
 * Formula: clamp((slopeDeg - 10) / (35 - 10), 0, 1)
 */
export function terrainFactor(slopeDeg: number): number {
  const factor =
    (slopeDeg - TERRAIN_CONFIG.minSlopeDeg) /
    (TERRAIN_CONFIG.maxSlopeDeg - TERRAIN_CONFIG.minSlopeDeg);
  return clamp(Number(factor.toFixed(4)), 0, 1);
}

/**
 * Pure function: History factor (normalized 0..1)
 * Formula: min(1, N / 5), where N = historical landslides within 5 km in last 10 years.
 * If catalogue has no records in area, factor is 0 and text is "No recent records in catalogue" (never "safe").
 */
export function historyFactor(
  nearCount10Years: number,
  hasRecordsInCatalogue: boolean = true
): { factor: number; text: string } {
  if (!hasRecordsInCatalogue || nearCount10Years <= 0) {
    return {
      factor: 0,
      text: HISTORY_CONFIG.noRecordsText,
    };
  }

  const factor = Math.min(1, nearCount10Years / HISTORY_CONFIG.saturationCount);
  return {
    factor: clamp(Number(factor.toFixed(4)), 0, 1),
    text: `${nearCount10Years} historical landslide event${nearCount10Years > 1 ? 's' : ''} in last 10 years within 5 km`,
  };
}

/**
 * Pure function: Reports factor (normalized 0..1)
 * Formula: max over reports within 500m of sample (non-expired, not disputed, test only if Demo mode):
 * typeFactor * confidence * severityMultiplier
 * typeFactor: landslide 1.0, road_blocked 1.0, rockfall 0.8, flood 0.8, bridge_damage 0.9, snow 0.5, all_clear 0
 * confidence: verified = 1.0; pending = min(1, 0.4 + 0.2 * up_count)
 * severityMultiplier: 0.6 / 0.8 / 1.0
 */
export function reportsFactor(reports: HazardReportItem[]): {
  factor: number;
  hasBlockedOverride: boolean;
  topReport: HazardReportItem | null;
} {
  if (!reports || reports.length === 0) {
    return { factor: 0, hasBlockedOverride: false, topReport: null };
  }

  let maxFactor = 0;
  let hasBlockedOverride = false;
  let topReport: HazardReportItem | null = null;

  for (const report of reports) {
    // Check Blocked Override: verified road_blocked or landslide report within 150 m
    if (
      report.status === 'verified' &&
      (report.type === 'road_blocked' || report.type === 'landslide') &&
      report.distanceMeters <= REPORTS_CONFIG.blockedOverrideRadiusM
    ) {
      hasBlockedOverride = true;
    }

    // Ignore expired or disputed
    if (report.status === 'expired' || report.status === 'disputed') {
      continue;
    }

    const typeWeight = REPORTS_CONFIG.typeFactors[report.type] ?? 0.5;

    // Confidence: verified = 1.0, pending = min(1, 0.4 + 0.2 * up_count)
    let confidence: number;
    if (report.status === 'verified') {
      confidence = 1.0;
    } else if (report.status === 'pending') {
      confidence = Math.min(
        REPORTS_CONFIG.pendingMaxConfidence,
        REPORTS_CONFIG.pendingBaseConfidence +
          REPORTS_CONFIG.pendingUpVoteBonus * (report.up_count || 0)
      );
    } else {
      confidence = 0.5;
    }

    // Severity multiplier: 0.6 / 0.8 / 1.0
    const sevMultiplier =
      REPORTS_CONFIG.severityMultipliers[
        report.severity as keyof typeof REPORTS_CONFIG.severityMultipliers
      ] ?? 0.8;

    const reportScore = typeWeight * confidence * sevMultiplier;

    if (reportScore > maxFactor) {
      maxFactor = reportScore;
      topReport = report;
    }
  }

  return {
    factor: clamp(Number(maxFactor.toFixed(4)), 0, 1),
    hasBlockedOverride,
    topReport,
  };
}

/**
 * Pure function: Seismic factor (normalized 0..1)
 * Formula: max over USGS events M4.5+ in the last 72 h within 150 km:
 * clamp((mag - 4.5) / 1.5, 0, 1) * (1 - distanceKm / 150)
 */
export function seismicFactor(quakes: EarthquakeRiskItem[]): number {
  if (!quakes || quakes.length === 0) return 0;

  let maxScore = 0;

  for (const q of quakes) {
    if (q.distanceKm > SEISMIC_CONFIG.radiusKm) continue;

    const magFactor = clamp(
      (q.magnitude - SEISMIC_CONFIG.minMagnitude) /
        SEISMIC_CONFIG.magScaleDenominator,
      0,
      1
    );

    const distFactor = Math.max(0, 1 - q.distanceKm / SEISMIC_CONFIG.radiusKm);
    const score = magFactor * distFactor;

    if (score > maxScore) {
      maxScore = score;
    }
  }

  return clamp(Number(maxScore.toFixed(4)), 0, 1);
}

/**
 * Pure function: maps a numerical score (0..100) or override to RiskLevel.
 * Levels: Low 0-24 · Moderate 25-49 · High 50-74 · Severe 75-100 · Blocked (override).
 */
export function levelFor(score: number, isBlocked: boolean = false): RiskLevel {
  if (isBlocked) return 'Blocked';
  if (score >= 75) return 'Severe';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

/**
 * Pure function: score an individual segment with the six weighted factors and Blocked override.
 * Formula: score = 100 * (0.30 Rain + 0.20 Terrain + 0.20 Reports + 0.15 History + 0.10 Soil + 0.05 Seismic)
 * Override: a verified road_blocked or landslide report within 150 m sets score = 100 and status = Blocked.
 */
export function scoreSegment(
  factors: SegmentFactors,
  hasBlockedOverride: boolean = false
): { score: number; level: RiskLevel; isBlocked: boolean } {
  if (hasBlockedOverride) {
    return {
      score: 100,
      level: 'Blocked',
      isBlocked: true,
    };
  }

  const raw =
    100 *
    (RISK_WEIGHTS.rain * factors.rain +
      RISK_WEIGHTS.terrain * factors.terrain +
      RISK_WEIGHTS.reports * factors.reports +
      RISK_WEIGHTS.history * factors.history +
      RISK_WEIGHTS.soil * factors.soil +
      RISK_WEIGHTS.seismic * factors.seismic);

  const score = Math.round(clamp(raw, 0, 100));
  const level = levelFor(score, false);

  return {
    score,
    level,
    isBlocked: false,
  };
}

/**
 * Pure function: aggregates segment scores into a single route score.
 * Formula: routeScore = round(0.6 * max(segment scores) + 0.4 * mean(segment scores))
 */
export function scoreRoute(
  segmentScores: number[],
  hasAnyBlockedOverride: boolean = false
): {
  score: number;
  level: RiskLevel;
  maxSegmentScore: number;
  meanSegmentScore: number;
} {
  if (hasAnyBlockedOverride) {
    const maxScore = segmentScores.length > 0 ? Math.max(...segmentScores) : 100;
    const meanScore =
      segmentScores.length > 0
        ? segmentScores.reduce((a, b) => a + b, 0) / segmentScores.length
        : 100;

    return {
      score: 100,
      level: 'Blocked',
      maxSegmentScore: maxScore,
      meanSegmentScore: Math.round(meanScore),
    };
  }

  if (!segmentScores || segmentScores.length === 0) {
    return {
      score: 0,
      level: 'Low',
      maxSegmentScore: 0,
      meanSegmentScore: 0,
    };
  }

  const maxSegmentScore = Math.max(...segmentScores);
  const meanSegmentScore =
    segmentScores.reduce((acc, curr) => acc + curr, 0) / segmentScores.length;

  const rawRouteScore =
    ROUTE_AGGREGATION_CONFIG.maxWeight * maxSegmentScore +
    ROUTE_AGGREGATION_CONFIG.meanWeight * meanSegmentScore;

  const routeScore = Math.round(clamp(rawRouteScore, 0, 100));
  const level = levelFor(routeScore, false);

  return {
    score: routeScore,
    level,
    maxSegmentScore,
    meanSegmentScore: Math.round(meanSegmentScore),
  };
}

/**
 * Pure function: generates the "Why this score" factor bars and explanations.
 * Sorts factors by their weighted contribution to the score and includes sources and timestamps.
 */
export function explainRoute(
  segments: SegmentRisk[],
  timestampStr: string = 'Updated within 30m'
): {
  factorBars: FactorBar[];
  summary: string;
  disclaimer: string;
} {
  if (!segments || segments.length === 0) {
    return {
      factorBars: [],
      summary: 'No route segments available for evaluation.',
      disclaimer: RISK_DISCLAIMER_TEXT,
    };
  }

  const n = segments.length;

  // Calculate averages across segments
  let sumRain = 0;
  let sumTerrain = 0;
  let sumReports = 0;
  let sumHistory = 0;
  let sumSoil = 0;
  let sumSeismic = 0;

  let maxRainAccum = 0;
  let maxHourlyRain = 0;
  let maxSlopeDeg = 0;
  let maxElevationM = 0;
  let maxSoilMoisture = 0;
  let totalHistoryCount = 0;
  let totalActiveReports = 0;
  let totalQuakesCount = 0;
  let hasAnyHistoryRecords = false;

  for (const s of segments) {
    const f = s.factors;
    sumRain += f.rain;
    sumTerrain += f.terrain;
    sumReports += f.reports;
    sumHistory += f.history;
    sumSoil += f.soil;
    sumSeismic += f.seismic;

    if (!f.historyHasNoRecords) {
      hasAnyHistoryRecords = true;
    }

    const r = f.rawMetrics;
    if (r.accumRainMm > maxRainAccum) maxRainAccum = r.accumRainMm;
    if (r.maxHourlyRainMm > maxHourlyRain) maxHourlyRain = r.maxHourlyRainMm;
    if (r.slopeDeg > maxSlopeDeg) maxSlopeDeg = r.slopeDeg;
    if (r.elevationM > maxElevationM) maxElevationM = r.elevationM;
    if (r.soilMoistureM3 > maxSoilMoisture) maxSoilMoisture = r.soilMoistureM3;
    totalHistoryCount += r.historyNearCount;
    totalActiveReports += r.activeReportsCount;
    totalQuakesCount += r.nearbyQuakesCount;
  }

  const avgRain = sumRain / n;
  const avgTerrain = sumTerrain / n;
  const avgReports = sumReports / n;
  const avgHistory = sumHistory / n;
  const avgSoil = sumSoil / n;
  const avgSeismic = sumSeismic / n;

  // Factor bar 1: Rain
  const rainBar: FactorBar = {
    id: 'rain',
    name: 'Rainfall Intensity & Forecast',
    weight: Math.round(RISK_WEIGHTS.rain * 100),
    value: Number(avgRain.toFixed(2)),
    weightedScore: Number((RISK_WEIGHTS.rain * avgRain * 100).toFixed(1)),
    source: DATA_SOURCES.rain.name,
    timestamp: timestampStr,
    description:
      maxRainAccum > 0 || maxHourlyRain > 0
        ? `Peak 72h accumulation: ${maxRainAccum.toFixed(1)} mm, max hourly: ${maxHourlyRain.toFixed(1)} mm/h.`
        : 'Dry conditions forecast across all route segments.',
  };

  // Factor bar 2: Terrain
  const terrainBar: FactorBar = {
    id: 'terrain',
    name: 'Terrain Steepness & Slope',
    weight: Math.round(RISK_WEIGHTS.terrain * 100),
    value: Number(avgTerrain.toFixed(2)),
    weightedScore: Number((RISK_WEIGHTS.terrain * avgTerrain * 100).toFixed(1)),
    source: DATA_SOURCES.terrain.name,
    timestamp: timestampStr,
    description: `Peak slope: ${maxSlopeDeg.toFixed(1)}° at ~${maxElevationM}m elevation. 4-neighbour gradient calculation.`,
  };

  // Factor bar 3: Reports
  const reportsBar: FactorBar = {
    id: 'reports',
    name: 'Community Hazard Reports',
    weight: Math.round(RISK_WEIGHTS.reports * 100),
    value: Number(avgReports.toFixed(2)),
    weightedScore: Number((RISK_WEIGHTS.reports * avgReports * 100).toFixed(1)),
    source: DATA_SOURCES.reports.name,
    timestamp: 'Live verified queue',
    description:
      totalActiveReports > 0
        ? `${totalActiveReports} active crowdsourced report${totalActiveReports > 1 ? 's' : ''} detected within 500 m buffer.`
        : 'No unverified or active road hazard reports within 500 m.',
  };

  // Factor bar 4: History
  // Special integrity rule: If the catalogue has no records in the area, the factor is 0
  // and the UI says "No recent records in catalogue" (never "safe").
  const historyDescription = !hasAnyHistoryRecords
    ? HISTORY_CONFIG.noRecordsText
    : totalHistoryCount > 0
      ? `${totalHistoryCount} recorded historical landslide event${totalHistoryCount > 1 ? 's' : ''} within 5 km over the last 10 years.`
      : HISTORY_CONFIG.noRecordsText;

  const historyBar: FactorBar = {
    id: 'history',
    name: 'Historical Landslide Catalogue',
    weight: Math.round(RISK_WEIGHTS.history * 100),
    value: hasAnyHistoryRecords ? Number(avgHistory.toFixed(2)) : 0,
    weightedScore: hasAnyHistoryRecords
      ? Number((RISK_WEIGHTS.history * avgHistory * 100).toFixed(1))
      : 0,
    source: DATA_SOURCES.history.name,
    timestamp: '10-year official catalogue',
    description: historyDescription,
  };

  // Factor bar 5: Soil
  const soilBar: FactorBar = {
    id: 'soil',
    name: 'Surface Soil Wetness (0–1 cm)',
    weight: Math.round(RISK_WEIGHTS.soil * 100),
    value: Number(avgSoil.toFixed(2)),
    weightedScore: Number((RISK_WEIGHTS.soil * avgSoil * 100).toFixed(1)),
    source: DATA_SOURCES.soil.name,
    timestamp: timestampStr,
    description: `Peak volumetric soil moisture: ${(maxSoilMoisture * 100).toFixed(1)}% (${maxSoilMoisture.toFixed(3)} m³/m³).`,
  };

  // Factor bar 6: Seismic
  const seismicBar: FactorBar = {
    id: 'seismic',
    name: 'Seismic Activity (M4.5+)',
    weight: Math.round(RISK_WEIGHTS.seismic * 100),
    value: Number(avgSeismic.toFixed(2)),
    weightedScore: Number((RISK_WEIGHTS.seismic * avgSeismic * 100).toFixed(1)),
    source: DATA_SOURCES.seismic.name,
    timestamp: 'USGS last 72 hours',
    description:
      totalQuakesCount > 0
        ? `${totalQuakesCount} M4.5+ earthquake${totalQuakesCount > 1 ? 's' : ''} recorded within 150 km in the last 72 hours.`
        : 'No M4.5+ earthquakes recorded within 150 km in the last 72 hours.',
  };

  const factorBars = [
    rainBar,
    terrainBar,
    reportsBar,
    historyBar,
    soilBar,
    seismicBar,
  ];

  // Sort descending by weighted contribution
  factorBars.sort((a, b) => b.weightedScore - a.weightedScore);

  // Top driving factor for summary
  const topFactor = factorBars[0];
  const summary =
    topFactor && topFactor.weightedScore > 2
      ? `Primary risk driver: ${topFactor.name} (${topFactor.weightedScore.toFixed(1)} pts). ${topFactor.description}`
      : 'All environmental and crowdsourced factors remain within low-risk operational baseline.';

  return {
    factorBars,
    summary,
    disclaimer: RISK_DISCLAIMER_TEXT,
  };
}
