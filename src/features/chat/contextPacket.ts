import type { ContextPacket } from './types';
import type { StayCandidate } from '../rewards/ranking';
import type { HazardReport } from '../reports/types';

export interface BuildContextPacketParams {
  coordinates?: [number, number]; // [lon, lat]
  mode?: 'drive' | 'walk' | 'trek';
  routeRisk?: {
    score: number;
    level: string;
    topFactors?: string[];
  };
  nearbyReports?: HazardReport[];
  weather?: {
    accumRain72h?: number;
    maxHourly24h?: number;
    soilMoisture?: number;
    alerts?: string[];
  };
  stays?: StayCandidate[];
}

/**
 * Builds privacy-compliant Context Packet per Doc 03 Section 10:
 * - Rounded location (2 decimals max)
 * - Mode
 * - Current route risk breakdown
 * - Up to 5 nearest verified reports
 * - 72 h forecast summary
 * - Up to 5 nearest safe stays (with sponsored flag)
 * - Strict Privacy: NO names, NO phone numbers, NO exact coordinates.
 */
export function buildContextPacket(params: BuildContextPacketParams): ContextPacket {
  const packet: ContextPacket = {};

  // 1. Coarse coordinates rounded to 2 decimals (~1.1 km precision)
  if (params.coordinates && params.coordinates.length >= 2) {
    const lon = Number(params.coordinates[0].toFixed(2));
    const lat = Number(params.coordinates[1].toFixed(2));
    packet.location = [lon, lat];
  }

  // 2. Travel mode
  packet.mode = params.mode || 'drive';

  // 3. Route risk breakdown
  if (params.routeRisk) {
    packet.routeRisk = {
      score: params.routeRisk.score,
      level: params.routeRisk.level,
      topFactors: params.routeRisk.topFactors?.slice(0, 3) || [],
    };
  }

  // 4. Up to 5 nearest verified reports (no personal names, phone numbers, or exact coordinates)
  if (params.nearbyReports && params.nearbyReports.length > 0) {
    packet.nearbyReports = params.nearbyReports
      .filter((r) => r.status === 'verified' || (r.up_count || 0) >= 3)
      .slice(0, 5)
      .map((r) => ({
        type: r.type,
        distanceKm: r.distance_m ? Number((r.distance_m / 1000).toFixed(1)) : 1.0,
        upCount: r.up_count || 0,
        timeAgo: 'recent',
      }));
  }

  // 5. 72h weather forecast summary
  if (params.weather) {
    packet.weatherSummary = {
      accumRain72h: params.weather.accumRain72h ?? 0,
      maxHourly24h: params.weather.maxHourly24h ?? 0,
      soilMoisture: params.weather.soilMoisture ?? 0.25,
      alerts: params.weather.alerts?.slice(0, 3) || [],
    };
  }

  // 6. Up to 5 nearest safe stays (Low & Moderate only, severe excluded)
  if (params.stays && params.stays.length > 0) {
    packet.safeStays = params.stays
      .filter((s) => s.riskLevel === 'Low' || s.riskLevel === 'Moderate')
      .slice(0, 5)
      .map((s) => ({
        name: s.name,
        category: s.category,
        distanceKm: s.distanceKm ?? 1.5,
        safetyLevel: s.riskLevel,
        isSponsored: Boolean(s.isSponsored),
      }));
  }

  return packet;
}
