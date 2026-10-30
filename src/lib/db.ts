import Dexie, { type Table } from 'dexie';
import type { StayCandidate } from '../features/rewards/ranking';

export interface TileRecord {
  id: string; // Region ID e.g. 'himalaya', 'northeast', 'india-overview'
  name: string;
  blob: Blob;
  size: number;
  downloadedAt: string;
}

export interface RouteSnapshotRecord {
  id: string; // e.g. 'shimla-manali-drive'
  fromLabel: string;
  toLabel: string;
  mode: 'drive' | 'walk';
  geometry: {
    type: 'LineString';
    coordinates: number[][];
  };
  score: number;
  level: string;
  segmentScores: Array<{
    segmentIndex: number;
    score: number;
    level: string;
    coordinates: [number, number];
  }>;
  riskBreakdown?: {
    summary?: string;
    factors?: Record<string, number>;
  };
  hazards?: Array<{
    id: string;
    type: string;
    severity: number;
    distanceMeters: number;
  }>;
  safeStays?: StayCandidate[];
  emergencyContacts?: Array<{
    id: string;
    name: string;
    phone: string;
    relation?: string | null;
  }>;
  lastKnownLocation?: [number, number];
  cachedAt: number; // ms timestamp
  cachedAtFormatted: string;
}

export interface StaysCacheRecord {
  cacheKey: string;
  data: StayCandidate[];
  cachedAt: number;
  lat: number;
  lon: number;
  radiusKm: number;
}

export interface GuideRecord {
  id: string; // e.g. 'offline-guide-v1'
  data: unknown;
  cachedAt: number;
}

export interface QueueItem {
  id?: number;
  type: 'report' | 'vote' | 'sos' | 'checkin';
  payload: Record<string, unknown>;
  createdAt: string;
  tries: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  lastError?: string;
}

export interface MetaRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

export class RouteXDatabase extends Dexie {
  tiles!: Table<TileRecord, string>;
  routeSnapshots!: Table<RouteSnapshotRecord, string>;
  staysCache!: Table<StaysCacheRecord, string>;
  guide!: Table<GuideRecord, string>;
  queue!: Table<QueueItem, number>;
  meta!: Table<MetaRecord, string>;

  // Backward-compatible aliases
  offlineQueue!: Table<QueueItem, number>;
  offlineMaps!: Table<TileRecord, string>;

  constructor() {
    super('RouteXDatabase');
    this.version(2).stores({
      tiles: 'id, downloadedAt',
      routeSnapshots: 'id, cachedAt, [fromLabel+toLabel]',
      staysCache: 'cacheKey, cachedAt, [lat+lon]',
      guide: 'id, cachedAt',
      queue: '++id, type, status, createdAt',
      meta: 'key, updatedAt',
    });

    // Wire aliases
    this.offlineQueue = this.queue;
    this.offlineMaps = this.tiles;
  }
}

export const db = new RouteXDatabase();
