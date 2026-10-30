import * as turf from '@turf/turf';
import type { RouteMode, RouteOption } from './types';
import type { RouteRiskScore } from '../risk/types';
import { scoreFullRoute } from '../risk/dataAdapters';
import { getEnv } from '../../lib/config';

export interface AvoidHazardPoint {
  coordinates: [number, number]; // [lng, lat]
  title: string;
  type: string;
  source: 'verified_report' | 'high_risk_segment';
  score?: number;
}

export interface ReRouteComparison {
  originalRoute: RouteOption;
  originalRisk: RouteRiskScore;
  saferRoute: RouteOption;
  saferRisk: RouteRiskScore;
  scoreDifference: number; // e.g. -45 (improvement)
  distanceDifferenceMeters: number; // e.g. +14000 (+14 km)
  durationDifferenceSeconds: number; // e.g. +1200 (+20 min)
  hazardsAvoidedCount: number;
  hazardsAvoided: AvoidHazardPoint[];
  fallbackNotice?: string;
}

export interface OrsDirectionsResponse {
  type: string;
  features?: Array<{
    type: string;
    geometry: {
      type: 'LineString';
      coordinates: [number, number][];
    };
    properties: {
      summary: {
        distance: number;
        duration: number;
      };
      segments?: Array<{
        distance: number;
        duration: number;
        steps?: Array<{
          distance: number;
          duration: number;
          instruction: string;
          name: string;
        }>;
      }>;
    };
  }>;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Extracts hazards along a route that must be avoided:
 * 1. Verified blocked or landslide reports
 * 2. Segments scoring >= 75 or marked isBlocked
 * Omits coordinates within 450 m of start or destination to prevent unroutable endpoints.
 */
export function extractAvoidHazards(
  routeRisk: RouteRiskScore,
  start: [number, number],
  end: [number, number]
): AvoidHazardPoint[] {
  const hazards: AvoidHazardPoint[] = [];
  const startPt = turf.point(start);
  const endPt = turf.point(end);

  // 1. Check verified landslide or road_blocked reports along route
  if (routeRisk.hazardsOnRoute && routeRisk.hazardsOnRoute.length > 0) {
    for (const h of routeRisk.hazardsOnRoute) {
      if (h.isVerified && (h.type === 'landslide' || h.type === 'road_blocked')) {
        const pt = turf.point(h.coordinates);
        const distToStart = turf.distance(startPt, pt, { units: 'meters' });
        const distToEnd = turf.distance(endPt, pt, { units: 'meters' });

        // Skip if directly at start/end endpoint (within 450m)
        if (distToStart > 450 && distToEnd > 450) {
          hazards.push({
            coordinates: h.coordinates,
            title: h.title,
            type: h.type,
            source: 'verified_report',
          });
        }
      }
    }
  }

  // 2. Check segments scoring >= 75 or blocked
  if (routeRisk.segments && routeRisk.segments.length > 0) {
    for (const s of routeRisk.segments) {
      if (s.score >= 75 || s.isBlocked) {
        const pt = turf.point(s.coordinates);
        const distToStart = turf.distance(startPt, pt, { units: 'meters' });
        const distToEnd = turf.distance(endPt, pt, { units: 'meters' });

        if (distToStart > 450 && distToEnd > 450) {
          // Avoid duplicate coordinates within 300m
          const alreadyAdded = hazards.some(
            (h) => turf.distance(turf.point(h.coordinates), pt, { units: 'meters' }) < 300
          );
          if (!alreadyAdded) {
            hazards.push({
              coordinates: s.coordinates,
              title: s.isBlocked ? 'Blocked corridor segment' : `Severe hazard segment (${Math.round(s.score)}/100)`,
              type: s.isBlocked ? 'road_blocked' : 'high_risk_zone',
              source: 'high_risk_segment',
              score: s.score,
            });
          }
        }
      }
    }
  }

  return hazards;
}

/**
 * Builds GeoJSON MultiPolygon coordinates with a 400 m circle around each hazard
 * using Turf circle (16 steps).
 */
export function buildAvoidMultiPolygon(
  hazards: AvoidHazardPoint[]
): GeoJSON.MultiPolygon | null {
  if (hazards.length === 0) return null;

  const circles = hazards.map((h) =>
    turf.circle(h.coordinates, 0.4, { steps: 16, units: 'kilometers' })
  );

  return {
    type: 'MultiPolygon',
    coordinates: circles.map((c) => c.geometry.coordinates as [number, number][][]),
  };
}

/**
 * Calls OpenRouteService Directions API with options.avoid_polygons
 * Profiles: driving-car (for Drive), foot-hiking (for Walk) per Doc 03 section 7.
 * 8 s timeout + 1 retry.
 */
export async function fetchOrsAvoidRoute(
  start: [number, number],
  end: [number, number],
  mode: RouteMode,
  avoidPolygons: GeoJSON.MultiPolygon,
  orsApiKey?: string
): Promise<RouteOption | null> {
  const apiKey = orsApiKey || getEnv().VITE_ORS_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_ORS_API_KEY is not configured.');
  }

  const profile = mode === 'walk' ? 'foot-hiking' : 'driving-car';
  const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;

  const requestBody = {
    coordinates: [start, end],
    options: {
      avoid_polygons: avoidPolygons,
    },
  };

  const makeRequest = async (attempt: number): Promise<RouteOption | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404 || response.status === 400) {
          // No route could bypass the hazard
          return null;
        }
        if (attempt === 0) {
          return makeRequest(1);
        }
        return null;
      }

      const data: OrsDirectionsResponse = await response.json();
      const feature = data.features?.[0];
      if (!feature || !feature.geometry) {
        return null;
      }

      const summary = feature.properties.summary;
      const rawSteps = feature.properties.segments?.[0]?.steps || [];

      return {
        id: `ors-reroute-${Date.now()}`,
        name: 'Safer Re-route (Avoids Hazards)',
        distanceMeters: Math.round(summary.distance),
        durationSeconds: Math.round(summary.duration),
        geometry: feature.geometry,
        legs: [
          {
            distance: Math.round(summary.distance),
            duration: Math.round(summary.duration),
            summary: 'Safer corridor avoiding active hazard zones',
            steps: rawSteps.map((s) => ({
              name: s.name || '',
              distance: Math.round(s.distance),
              duration: Math.round(s.duration),
              instruction: s.instruction || `Follow corridor (${Math.round(s.distance)} m)`,
              maneuver: {
                type: 'turn',
                modifier: '',
                location: [0, 0],
              },
            })),
          },
        ],
        isRecommended: true,
      };
    } catch {
      clearTimeout(timeoutId);
      if (attempt === 0) {
        return makeRequest(1);
      }
      return null;
    }
  };

  return makeRequest(0);
}

/**
 * High-level auto re-route orchestrator:
 * 1. Checks if original route is High, Severe or Blocked
 * 2. Extracts 400 m hazard circles
 * 3. Fetches ORS route with avoid_polygons
 * 4. Scores the new route with the risk engine
 * 5. Returns full side-by-side comparison or fallback notice per Doc 03 section 7
 */
export async function calculateAutoReRoute(params: {
  originalRoute: RouteOption;
  originalRisk: RouteRiskScore;
  start: [number, number];
  end: [number, number];
  mode: RouteMode;
  demoMode: boolean;
  onProgress?: (step: string) => void;
}): Promise<ReRouteComparison> {
  const { originalRoute, originalRisk, start, end, mode, demoMode, onProgress } = params;

  onProgress?.('Identifying route hazards to avoid...');
  const hazards = extractAvoidHazards(originalRisk, start, end);

  if (hazards.length === 0) {
    return {
      originalRoute,
      originalRisk,
      saferRoute: originalRoute,
      saferRisk: originalRisk,
      scoreDifference: 0,
      distanceDifferenceMeters: 0,
      durationDifferenceSeconds: 0,
      hazardsAvoidedCount: 0,
      hazardsAvoided: [],
      fallbackNotice: 'No high-risk segments or verified blockages found along this route.',
    };
  }

  const avoidPolygons = buildAvoidMultiPolygon(hazards);
  if (!avoidPolygons) {
    return {
      originalRoute,
      originalRisk,
      saferRoute: originalRoute,
      saferRisk: originalRisk,
      scoreDifference: 0,
      distanceDifferenceMeters: 0,
      durationDifferenceSeconds: 0,
      hazardsAvoidedCount: 0,
      hazardsAvoided: [],
      fallbackNotice: 'No route found that avoids the hazard; showing the lowest-risk option.',
    };
  }

  onProgress?.(`Querying OpenRouteService (${mode === 'walk' ? 'foot-hiking' : 'driving-car'}) with 400m avoid buffer...`);
  const saferRoute = await fetchOrsAvoidRoute(start, end, mode, avoidPolygons);

  if (!saferRoute) {
    return {
      originalRoute,
      originalRisk,
      saferRoute: originalRoute,
      saferRisk: originalRisk,
      scoreDifference: 0,
      distanceDifferenceMeters: 0,
      durationDifferenceSeconds: 0,
      hazardsAvoidedCount: 0,
      hazardsAvoided: hazards,
      fallbackNotice: 'No route found that avoids the hazard; showing the lowest-risk option.',
    };
  }

  onProgress?.('Evaluating risk score for safer alternative route...');
  const saferRisk = await scoreFullRoute(saferRoute.geometry, demoMode, (step) => {
    onProgress?.(`Scoring alternative: ${step}`);
  });

  return {
    originalRoute,
    originalRisk,
    saferRoute,
    saferRisk,
    scoreDifference: saferRisk.score - originalRisk.score,
    distanceDifferenceMeters: saferRoute.distanceMeters - originalRoute.distanceMeters,
    durationDifferenceSeconds: saferRoute.durationSeconds - originalRoute.durationSeconds,
    hazardsAvoidedCount: hazards.length,
    hazardsAvoided: hazards,
  };
}
