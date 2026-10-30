import { db, type RouteSnapshotRecord } from '../../lib/db';
import type { RouteRiskScore } from '../risk/types';
import type { StayCandidate } from '../rewards/ranking';
import type { EmergencyContact } from '../sos/types';

export interface CacheRouteParams {
  fromName: string;
  fromDisplayName: string;
  toName: string;
  toDisplayName: string;
  mode: 'drive' | 'walk';
  geometry: {
    type: 'LineString';
    coordinates: number[][];
  };
  riskScore: RouteRiskScore;
  safeStays?: StayCandidate[];
  emergencyContacts?: EmergencyContact[];
  lastKnownLocation?: [number, number];
}

/**
 * Formats a cached timestamp into human-readable relative age (e.g. "Cached 2h ago")
 */
export function formatCachedAge(cachedAtMs: number): string {
  const diffMs = Date.now() - cachedAtMs;
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Cached just now';
  }
  if (diffMins < 60) {
    return `Cached ${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `Cached ${diffHours}h ago`;
  }
  return `Cached ${diffDays}d ago`;
}

/**
 * Caches complete route snapshot per Doc 01 Section 6.8 & Doc 03 Section 11:
 * geometry, segment scores, risk breakdown, hazards, safe stays, timestamp, emergency contacts, last known location.
 */
export async function cacheRouteSnapshot(params: CacheRouteParams): Promise<string> {
  const cleanFrom = params.fromName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const cleanTo = params.toName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const snapshotId = `${cleanFrom}-${cleanTo}-${params.mode}`;

  const now = Date.now();
  const record: RouteSnapshotRecord = {
    id: snapshotId,
    fromLabel: params.fromDisplayName,
    toLabel: params.toDisplayName,
    mode: params.mode,
    geometry: params.geometry,
    score: params.riskScore.score,
    level: params.riskScore.level,
    segmentScores: params.riskScore.segments.map((seg) => ({
      segmentIndex: seg.sampleIndex,
      score: seg.score,
      level: seg.level,
      coordinates: seg.coordinates,
    })),
    riskBreakdown: {
      summary: params.riskScore.summary,
      factors: params.riskScore.factorBars ? Object.fromEntries(
        params.riskScore.factorBars.map((b) => [b.id, b.value])
      ) : {},
    },
    hazards: (params.riskScore.hazardsOnRoute || []).map((h) => ({
      id: h.id,
      type: h.type,
      severity: h.severity,
      distanceMeters: Math.round(h.distanceKm * 1000),
    })),
    safeStays: params.safeStays || [],
    emergencyContacts: params.emergencyContacts || [],
    lastKnownLocation: params.lastKnownLocation || [77.1734, 31.1048],
    cachedAt: now,
    cachedAtFormatted: new Date(now).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  try {
    await db.routeSnapshots.put(record);
    await db.meta.put({
      key: 'lastCachedRouteId',
      value: snapshotId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to cache route snapshot in IndexedDB:', err);
  }

  return snapshotId;
}

/**
 * Retrieves the most recently cached route snapshot
 */
export async function getLastCachedRouteSnapshot(): Promise<RouteSnapshotRecord | null> {
  try {
    const meta = await db.meta.get('lastCachedRouteId');
    if (meta?.value && typeof meta.value === 'string') {
      const snap = await db.routeSnapshots.get(meta.value);
      if (snap) return snap;
    }

    const last = await db.routeSnapshots.orderBy('cachedAt').last();
    return last || null;
  } catch {
    return null;
  }
}

/**
 * Retrieves a route snapshot by its ID
 */
export async function getRouteSnapshotById(id: string): Promise<RouteSnapshotRecord | null> {
  try {
    return (await db.routeSnapshots.get(id)) || null;
  } catch {
    return null;
  }
}
