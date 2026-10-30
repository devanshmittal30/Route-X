import * as turf from '@turf/turf';
import { RiskLevel } from '../risk/types';

export interface StayCandidate {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  city?: string;
  coordinates: [number, number]; // [lng, lat]
  riskLevel: RiskLevel;
  riskScore: number;
  isSponsored: boolean;
  distanceKm?: number;
  amenityTags?: string[];
  whyThisStay?: string;
}

/**
 * Severity weight for sorting: Low (1) -> Moderate (2) -> High (3).
 * Severe (4) is hidden per Doc 03 Section 9.
 */
const RISK_ORDER: Record<RiskLevel, number> = {
  Low: 1,
  Moderate: 2,
  High: 3,
  Severe: 4,
  Blocked: 5,
};

/**
 * Ranks stays per Doc 03 Section 9:
 * 1. Location safety level (Low before Moderate before High; HIDE Severe)
 * 2. Sponsored/demo partner first within the same level
 * 3. Distance (closest first)
 */
export function rankStays<T extends StayCandidate>(
  stays: T[],
  userCoords?: [number, number]
): T[] {
  // 1. Calculate distances if user coordinates are provided
  const withDistance = stays.map((stay) => {
    let distanceKm = stay.distanceKm;
    if (userCoords && distanceKm === undefined) {
      try {
        const from = turf.point(userCoords);
        const to = turf.point(stay.coordinates);
        distanceKm = Number(turf.distance(from, to, { units: 'kilometers' }).toFixed(1));
      } catch {
        distanceKm = 999;
      }
    }
    return { ...stay, distanceKm };
  });

  // 2. Hide Severe and Blocked locations per specification
  const filtered = withDistance.filter(
    (stay) => stay.riskLevel !== 'Severe' && stay.riskLevel !== 'Blocked'
  );

  // 3. Sort strictly by:
  //    (a) safety level (Low -> Moderate -> High)
  //    (b) sponsored first within same level
  //    (c) distance (closest first)
  filtered.sort((a, b) => {
    const levelA = RISK_ORDER[a.riskLevel] || 99;
    const levelB = RISK_ORDER[b.riskLevel] || 99;
    if (levelA !== levelB) {
      return levelA - levelB;
    }

    if (a.isSponsored !== b.isSponsored) {
      return a.isSponsored ? -1 : 1; // sponsored first
    }

    const distA = a.distanceKm ?? 999;
    const distB = b.distanceKm ?? 999;
    return distA - distB;
  });

  return filtered;
}

/**
 * Generates an explainable "Why this stay" line using ONLY real fields:
 * - Distance from current location
 * - Risk level and numerical score at location
 * - Real category / amenity tags
 */
export function generateWhyThisStay(stay: StayCandidate): string {
  const parts: string[] = [];

  // Safety level with score
  parts.push(`${stay.riskLevel} Risk (score ${stay.riskScore})`);

  // Distance
  if (stay.distanceKm !== undefined && stay.distanceKm < 999) {
    parts.push(`${stay.distanceKm} km away`);
  }

  // Category or amenity tags
  if (stay.amenityTags && stay.amenityTags.length > 0) {
    parts.push(stay.amenityTags.slice(0, 2).join(', '));
  } else if (stay.category) {
    const formattedCategory =
      stay.category === 'stay'
        ? 'Verified hill shelter'
        : stay.category === 'gear'
          ? 'Emergency gear hub'
          : stay.category;
    parts.push(formattedCategory);
  }

  return parts.join(' · ');
}
