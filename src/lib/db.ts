import Dexie, { type Table } from 'dexie';
import type { StayCandidate } from '../features/rewards/ranking';

export interface StaysCacheRecord {
  cacheKey: string;
  data: StayCandidate[];
  cachedAt: number;
  lat: number;
  lon: number;
  radiusKm: number;
}

export interface OfflineQueueItem {
  id?: number;
  type: 'sos' | 'report' | 'vote' | 'checkin';
  payload: Record<string, unknown>;
  createdAt: string;
  tries: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
}

export interface OfflineMapRecord {
  regionId: string;
  name: string;
  blob: Blob;
  downloadedAt: string;
  sizeBytes: number;
}

export class RouteXDatabase extends Dexie {
  staysCache!: Table<StaysCacheRecord, string>;
  offlineQueue!: Table<OfflineQueueItem, number>;
  offlineMaps!: Table<OfflineMapRecord, string>;

  constructor() {
    super('RouteXDatabase');
    this.version(1).stores({
      staysCache: 'cacheKey, cachedAt, [lat+lon]',
      offlineQueue: '++id, type, status, createdAt',
      offlineMaps: 'regionId, downloadedAt',
    });
  }
}

export const db = new RouteXDatabase();
