import { describe, it, expect } from 'vitest';
import {
  rainFactor,
  soilFactor,
  terrainFactor,
  historyFactor,
  reportsFactor,
  seismicFactor,
  slopeFromElevations,
  scoreSegment,
  scoreRoute,
  levelFor,
  sampleRoute,
  explainRoute,
} from './pureScoring';
import {
  RAIN_TEST_CASES,
  SOIL_TEST_CASES,
  TERRAIN_TEST_CASES,
  HISTORY_TEST_CASES,
  SEISMIC_TEST_CASES,
  ZERO_FACTORS,
  BALANCED_FACTORS,
  BLOCKED_HAZARD_REPORT,
} from './__fixtures__/riskFixtures';
import type { HazardReportItem, SegmentRisk } from './types';

describe('RouteX Risk Scoring Engine (Pure Functions)', () => {
  describe('Rain Factor (0..1)', () => {
    RAIN_TEST_CASES.forEach(({ accum, maxHourly, expected }) => {
      it(`calculates rainFactor for accum=${accum}mm, maxHourly=${maxHourly}mm/h -> expected ${expected}`, () => {
        const factor = rainFactor(accum, maxHourly);
        expect(factor).toBeCloseTo(expected, 3);
      });
    });
  });

  describe('Soil Factor (0..1)', () => {
    SOIL_TEST_CASES.forEach(({ moisture, expected }) => {
      it(`calculates soilFactor for moisture=${moisture} m³/m³ -> expected ${expected}`, () => {
        const factor = soilFactor(moisture);
        expect(factor).toBeCloseTo(expected, 3);
      });
    });
  });

  describe('Terrain Factor (0..1)', () => {
    TERRAIN_TEST_CASES.forEach(({ slopeDeg, expected }) => {
      it(`calculates terrainFactor for slope=${slopeDeg}° -> expected ${expected}`, () => {
        const factor = terrainFactor(slopeDeg);
        expect(factor).toBeCloseTo(expected, 3);
      });
    });

    it('calculates slopeFromElevations accurately with 250m orthogonal neighbours', () => {
      // 45 degrees slope: dz = 250m over 250m distance
      const slope45 = slopeFromElevations(2000, 2250, 2000, 2000, 2000, 250);
      expect(slope45).toBeCloseTo(45.0, 1);

      // Flat terrain: dz = 0
      const slopeFlat = slopeFromElevations(1500, 1500, 1500, 1500, 1500, 250);
      expect(slopeFlat).toBe(0.0);
    });
  });

  describe('History Factor (0..1) & Integrity Rules', () => {
    HISTORY_TEST_CASES.forEach(({ count, hasRecords, expectedFactor, expectedText }) => {
      it(`count=${count}, hasRecords=${hasRecords} -> factor=${expectedFactor}, text="${expectedText}"`, () => {
        const result = historyFactor(count, hasRecords);
        expect(result.factor).toBeCloseTo(expectedFactor, 3);
        expect(result.text).toBe(expectedText);
      });
    });

    it('STRICT INTEGRITY RULE: when History has no records, must output factor 0 and "No recent records in catalogue", NEVER "safe"', () => {
      const result = historyFactor(0, false);
      expect(result.factor).toBe(0);
      expect(result.text).toBe('No recent records in catalogue');
      expect(result.text.toLowerCase()).not.toContain('safe');
    });
  });

  describe('Community Reports Factor (0..1) & Blocked Override', () => {
    it('returns factor 0 when no reports exist in buffer', () => {
      const result = reportsFactor([]);
      expect(result.factor).toBe(0);
      expect(result.hasBlockedOverride).toBe(false);
    });

    it('calculates score for pending landslide with 0 upvotes (confidence 0.4, severity 3)', () => {
      const report: HazardReportItem = {
        id: 'rep-pending-1',
        type: 'landslide',
        severity: 3,
        status: 'pending',
        is_test: false,
        up_count: 0,
        down_count: 0,
        coordinates: [77.17, 31.1],
        distanceMeters: 300,
      };

      const result = reportsFactor([report]);
      // typeFactor 1.0 * confidence 0.4 * severity 1.0 = 0.40
      expect(result.factor).toBeCloseTo(0.4, 3);
      expect(result.hasBlockedOverride).toBe(false);
    });

    it('calculates score for verified rockfall (severity 2 multiplier 0.8, type 0.8)', () => {
      const report: HazardReportItem = {
        id: 'rep-verified-1',
        type: 'rockfall',
        severity: 2,
        status: 'verified',
        is_test: false,
        up_count: 4,
        down_count: 0,
        coordinates: [77.17, 31.1],
        distanceMeters: 400,
      };

      const result = reportsFactor([report]);
      // type 0.8 * verified 1.0 * severity 0.8 = 0.64
      expect(result.factor).toBeCloseTo(0.64, 3);
    });

    it('activates Blocked override for verified road_blocked within 150 m', () => {
      const result = reportsFactor([BLOCKED_HAZARD_REPORT]);
      expect(result.hasBlockedOverride).toBe(true);
    });

    it('does NOT activate Blocked override for verified road_blocked beyond 150 m', () => {
      const distantReport: HazardReportItem = {
        ...BLOCKED_HAZARD_REPORT,
        distanceMeters: 250, // > 150m
      };
      const result = reportsFactor([distantReport]);
      expect(result.hasBlockedOverride).toBe(false);
      expect(result.factor).toBeGreaterThan(0);
    });

    it('ignores expired and disputed reports', () => {
      const disputedReport: HazardReportItem = {
        ...BLOCKED_HAZARD_REPORT,
        status: 'disputed',
      };
      const result = reportsFactor([disputedReport]);
      expect(result.factor).toBe(0);
      expect(result.hasBlockedOverride).toBe(false);
    });
  });

  describe('Seismic Factor (0..1)', () => {
    SEISMIC_TEST_CASES.forEach(({ mag, distKm, expected }) => {
      it(`calculates seismicFactor for M${mag} at ${distKm}km -> expected ${expected}`, () => {
        const factor = seismicFactor([
          {
            id: 'quake-test',
            magnitude: mag,
            timeIso: new Date().toISOString(),
            coordinates: [77.0, 31.0],
            distanceKm: distKm,
          },
        ]);
        expect(factor).toBeCloseTo(expected, 3);
      });
    });

    it('returns 0 when no quakes exist in the 150 km radius', () => {
      expect(seismicFactor([])).toBe(0);
    });
  });

  describe('scoreSegment and RiskLevel', () => {
    it('scores balanced factors to hand-calculated 49 (Moderate)', () => {
      const result = scoreSegment(BALANCED_FACTORS, false);
      expect(result.score).toBe(49);
      expect(result.level).toBe('Moderate');
      expect(result.isBlocked).toBe(false);
    });

    it('scores all zero factors to 0 (Low)', () => {
      const result = scoreSegment(ZERO_FACTORS, false);
      expect(result.score).toBe(0);
      expect(result.level).toBe('Low');
      expect(result.isBlocked).toBe(false);
    });

    it('forces score 100 and level Blocked when Blocked override is true', () => {
      const result = scoreSegment(ZERO_FACTORS, true);
      expect(result.score).toBe(100);
      expect(result.level).toBe('Blocked');
      expect(result.isBlocked).toBe(true);
    });

    it('verifies levelFor boundary thresholds', () => {
      expect(levelFor(0)).toBe('Low');
      expect(levelFor(24)).toBe('Low');
      expect(levelFor(25)).toBe('Moderate');
      expect(levelFor(49)).toBe('Moderate');
      expect(levelFor(50)).toBe('High');
      expect(levelFor(74)).toBe('High');
      expect(levelFor(75)).toBe('Severe');
      expect(levelFor(100)).toBe('Severe');
      expect(levelFor(10, true)).toBe('Blocked');
    });
  });

  describe('scoreRoute Aggregation', () => {
    it('aggregates segment scores with 60% max + 40% mean', () => {
      // Segments: [30, 40, 50, 60, 70]
      // max = 70, mean = 50
      // routeScore = round(0.6 * 70 + 0.4 * 50) = 42 + 20 = 62 (High)
      const scores = [30, 40, 50, 60, 70];
      const result = scoreRoute(scores, false);
      expect(result.score).toBe(62);
      expect(result.level).toBe('High');
      expect(result.maxSegmentScore).toBe(70);
      expect(result.meanSegmentScore).toBe(50);
    });

    it('returns score 100 and level Blocked if hasAnyBlockedOverride is true', () => {
      const result = scoreRoute([20, 25, 30], true);
      expect(result.score).toBe(100);
      expect(result.level).toBe('Blocked');
    });
  });

  describe('sampleRoute Pure Function', () => {
    it('samples route with min 8 and max 30 points at 2 km intervals', () => {
      // Line from Shimla to Manali (~126 km)
      const lineGeometry = {
        type: 'LineString' as const,
        coordinates: [
          [77.1734, 31.1048],
          [77.18, 31.5],
          [77.1892, 32.2432],
        ],
      };

      const samples = sampleRoute(lineGeometry, 2.0, 8, 30);
      expect(samples.length).toBeGreaterThanOrEqual(8);
      expect(samples.length).toBeLessThanOrEqual(30);

      // First sample starts at origin
      expect(samples[0].distanceKm).toBe(0);
      expect(samples[0].coordinates[0]).toBeCloseTo(77.1734, 2);
      expect(samples[0].coordinates[1]).toBeCloseTo(31.1048, 2);

      // Each sample has a gridCellKey (0.1 degree)
      expect(samples[0].gridCellKey).toBe('31.1,77.2');
    });

    it('handles short route by clamping to minSamples (8)', () => {
      const shortLine = {
        type: 'LineString' as const,
        coordinates: [
          [77.17, 31.1],
          [77.175, 31.105],
        ],
      };

      const samples = sampleRoute(shortLine, 2.0, 8, 30);
      expect(samples.length).toBe(8);
    });
  });

  describe('explainRoute & Factor Bars', () => {
    it('produces 6 factor bars with values, sources, and disclaimer', () => {
      const mockSegments: SegmentRisk[] = [
        {
          sampleIndex: 0,
          coordinates: [77.17, 31.1],
          distanceKm: 0,
          segmentGeometry: { type: 'LineString', coordinates: [] },
          score: 49,
          level: 'Moderate',
          isBlocked: false,
          factors: BALANCED_FACTORS,
        },
      ];

      const explanation = explainRoute(mockSegments);
      expect(explanation.factorBars).toHaveLength(6);
      expect(explanation.disclaimer).toContain('RouteX gives risk estimates from public data');

      const factorIds = explanation.factorBars.map((b) => b.id);
      expect(factorIds).toContain('rain');
      expect(factorIds).toContain('terrain');
      expect(factorIds).toContain('reports');
      expect(factorIds).toContain('history');
      expect(factorIds).toContain('soil');
      expect(factorIds).toContain('seismic');
    });

    it('outputs "No recent records in catalogue" for history when catalogue has no records', () => {
      const mockSegments: SegmentRisk[] = [
        {
          sampleIndex: 0,
          coordinates: [77.17, 31.1],
          distanceKm: 0,
          segmentGeometry: { type: 'LineString', coordinates: [] },
          score: 0,
          level: 'Low',
          isBlocked: false,
          factors: ZERO_FACTORS,
        },
      ];

      const explanation = explainRoute(mockSegments);
      const historyBar = explanation.factorBars.find((b) => b.id === 'history');
      expect(historyBar?.value).toBe(0);
      expect(historyBar?.description).toBe('No recent records in catalogue');
      expect(historyBar?.description.toLowerCase()).not.toContain('safe');
    });
  });
});

