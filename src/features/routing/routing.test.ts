import { describe, it, expect } from 'vitest';
import {
  buildOsrmUrl,
  formatDistance,
  formatDuration,
  formatManeuverInstruction,
} from './osrmClient';
import type { RouteStep, RouteOption } from './types';

describe('OSRM Routing Client Helpers', () => {
  it('builds OSRM URL using routed-car prefix for driving mode', () => {
    const url = buildOsrmUrl(77.1734, 31.1048, 77.1892, 32.2432, 'drive');

    expect(url).toContain('/routed-car/route/v1/driving/');
    expect(url).toContain('77.173400,31.104800;77.189200,32.243200');
    expect(url).toContain('alternatives=true');
    expect(url).toContain('overview=full');
    expect(url).toContain('geometries=geojson');
    expect(url).toContain('steps=true');
  });

  it('builds OSRM URL using routed-foot prefix for walking mode', () => {
    const url = buildOsrmUrl(91.8667, 27.5833, 91.88, 27.59, 'walk');

    expect(url).toContain('/routed-foot/route/v1/foot/');
    expect(url).toContain('91.866700,27.583300;91.880000,27.590000');
    expect(url).toContain('alternatives=true');
  });

  it('formats metric distances accurately', () => {
    expect(formatDistance(450)).toBe('450 m');
    expect(formatDistance(1200)).toBe('1.2 km');
    expect(formatDistance(244200)).toBe('244 km');
    expect(formatDistance(8650)).toBe('8.7 km');
  });

  it('formats duration in hours and minutes accurately', () => {
    expect(formatDuration(45 * 60)).toBe('45 min');
    expect(formatDuration(2 * 3600)).toBe('2 hr');
    expect(formatDuration(3 * 3600 + 25 * 60)).toBe('3 hr 25 min');
    expect(formatDuration(120)).toBe('2 min');
  });

  it('formats turn-by-turn maneuver instructions when missing text', () => {
    const departStep: RouteStep = {
      name: 'Mall Road',
      distance: 500,
      duration: 60,
      maneuver: { type: 'depart', modifier: 'right', location: [77.17, 31.1] },
    };
    expect(formatManeuverInstruction(departStep)).toBe('Head right onto Mall Road');

    const turnStep: RouteStep = {
      name: 'NH5',
      distance: 1200,
      duration: 120,
      maneuver: { type: 'turn', modifier: 'left', location: [77.18, 31.12] },
    };
    expect(formatManeuverInstruction(turnStep)).toBe('Turn left onto NH5');

    const arriveStep: RouteStep = {
      name: '',
      distance: 0,
      duration: 0,
      maneuver: { type: 'arrive', location: [77.19, 32.2] },
    };
    expect(formatManeuverInstruction(arriveStep)).toBe('Arrive at your destination');
  });
});

describe('Auto Re-Route (P14) & Hazard Avoidance', () => {
  const mockFactors: import('../risk/types').SegmentFactors = {
    rain: 0.2,
    terrain: 0.3,
    reports: 0.8,
    history: 0.1,
    soil: 0.2,
    seismic: 0.05,
    historyHasNoRecords: false,
    rawMetrics: {
      accumRainMm: 20,
      maxHourlyRainMm: 5,
      slopeDeg: 15,
      elevationM: 2000,
      soilMoistureM3: 0.25,
      historyNearCount: 1,
      activeReportsCount: 1,
      nearbyQuakesCount: 0,
    },
  };

  const mockRouteRisk: import('../risk/types').RouteRiskScore = {
    score: 82,
    level: 'Severe',
    isBlocked: true,
    maxSegmentScore: 100,
    meanSegmentScore: 65,
    segments: [
      {
        sampleIndex: 0,
        distanceKm: 2,
        segmentGeometry: { type: 'LineString', coordinates: [[77.17, 31.1], [77.175, 31.12]] },
        score: 30,
        level: 'Moderate',
        isBlocked: false,
        coordinates: [77.175, 31.12],
        factors: mockFactors,
      },
      {
        sampleIndex: 1,
        distanceKm: 4,
        segmentGeometry: { type: 'LineString', coordinates: [[77.175, 31.12], [77.18, 31.15]] },
        score: 88,
        level: 'Severe',
        isBlocked: true,
        coordinates: [77.18, 31.15],
        factors: mockFactors,
      },
    ],
    factorBars: [],
    hazardsOnRoute: [
      {
        id: 'hazard-1',
        title: 'NH5 Active Landslide',
        type: 'landslide',
        severity: 3,
        distanceKm: 4.2,
        coordinates: [77.181, 31.151],
        isVerified: true,
        isTest: false,
      },
    ],
    summary: 'Severe road blockage detected.',
    timestamp: '2026-10-31T00:00:00Z',
    disclaimer: 'RouteX estimates.',
  };

  it('extracts hazards to avoid excluding endpoints within 450m', async () => {
    const { extractAvoidHazards } = await import('./rerouteService');
    const start: [number, number] = [77.17, 31.1];
    const end: [number, number] = [77.2, 32.2];

    const hazards = extractAvoidHazards(mockRouteRisk, start, end);
    expect(hazards.length).toBeGreaterThanOrEqual(1);
    expect(hazards.some((h) => h.type === 'landslide')).toBe(true);
    expect(hazards.some((h) => h.source === 'verified_report' || h.source === 'high_risk_segment')).toBe(true);
  });

  it('builds 400 m MultiPolygon circle geometry around hazards', async () => {
    const { extractAvoidHazards, buildAvoidMultiPolygon } = await import('./rerouteService');
    const start: [number, number] = [77.17, 31.1];
    const end: [number, number] = [77.2, 32.2];

    const hazards = extractAvoidHazards(mockRouteRisk, start, end);
    const multiPolygon = buildAvoidMultiPolygon(hazards);

    expect(multiPolygon).not.toBeNull();
    expect(multiPolygon?.type).toBe('MultiPolygon');
    expect(multiPolygon?.coordinates.length).toBe(hazards.length);
    // 16 steps Turf circle has 17 coordinates closing the ring
    expect(multiPolygon?.coordinates[0][0].length).toBe(17);
  });

  it('returns fallback notice when no route can bypass the hazard', async () => {
    const { calculateAutoReRoute } = await import('./rerouteService');
    const originalRoute: RouteOption = {
      id: 'mock-orig-1',
      name: 'Original Route',
      distanceMeters: 244000,
      durationSeconds: 18000,
      geometry: { type: 'LineString', coordinates: [[77.17, 31.1], [77.2, 32.2]] },
      legs: [],
    };

    // With an invalid dummy key, ORS fetch fails gracefully and returns the Doc 03 section 7 fallback notice
    const comparison = await calculateAutoReRoute({
      originalRoute,
      originalRisk: mockRouteRisk,
      start: [77.17, 31.1],
      end: [77.2, 32.2],
      mode: 'drive',
      demoMode: false,
    });

    expect(comparison.fallbackNotice).toBe(
      'No route found that avoids the hazard; showing the lowest-risk option.'
    );
  });
});

