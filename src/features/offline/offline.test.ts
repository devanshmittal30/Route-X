import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../lib/db';
import {
  enqueueAction,
  getPendingQueueCount,
  getQueueItems,
  flushOfflineQueue,
} from './queueService';
import {
  cacheRouteSnapshot,
  getLastCachedRouteSnapshot,
  formatCachedAge,
} from './routeSnapshotService';
import { BlobPmtilesSource } from '../map/pmtilesSources';

describe('P13 Offline Architecture: Dexie DB, Queue & Route Snapshots', () => {
  beforeEach(async () => {
    // Clear test tables before each run
    try {
      await db.queue.clear();
      await db.tiles.clear();
      await db.routeSnapshots.clear();
      await db.meta.clear();
    } catch {
      // Ignore
    }
  });

  it('initializes Dexie database with all required P13 tables and aliases', () => {
    expect(db.tiles).toBeDefined();
    expect(db.routeSnapshots).toBeDefined();
    expect(db.staysCache).toBeDefined();
    expect(db.guide).toBeDefined();
    expect(db.queue).toBeDefined();
    expect(db.meta).toBeDefined();

    // Verify backward-compatible aliases
    expect(db.offlineQueue).toBe(db.queue);
    expect(db.offlineMaps).toBe(db.tiles);
  });

  it('correctly enqueues actions and tracks pending count in offline queue', async () => {
    // Simulate offline state
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    expect(await getPendingQueueCount()).toBe(0);

    const reportId = await enqueueAction('report', {
      type: 'landslide',
      severity: 3,
      description: 'Massive mudslide across highway',
      coordinates: [77.17, 31.10],
    });

    const voteId = await enqueueAction('vote', {
      reportId: 'rep-123',
      vote: 1,
    });

    const sosId = await enqueueAction('sos', {
      condition: 'Trapped by landslide',
      message: 'Need rescue',
      lat: 31.1048,
      lon: 77.1734,
    });

    expect(reportId).toBeGreaterThan(0);
    expect(voteId).toBeGreaterThan(0);
    expect(sosId).toBeGreaterThan(0);

    const pendingCount = await getPendingQueueCount();
    expect(pendingCount).toBe(3);

    const items = await getQueueItems();
    expect(items.length).toBe(3);
    expect(items.map((i) => i.type)).toContain('report');
    expect(items.map((i) => i.type)).toContain('vote');
    expect(items.map((i) => i.type)).toContain('sos');

    // Flush while offline should return without error
    const flushRes = await flushOfflineQueue();
    expect(flushRes.successCount).toBe(0);
  });

  it('formats cached relative age accurately per Doc 01 Section 7', () => {
    const now = Date.now();

    expect(formatCachedAge(now)).toBe('Cached just now');
    expect(formatCachedAge(now - 15 * 60 * 1000)).toBe('Cached 15m ago');
    expect(formatCachedAge(now - 2 * 3600 * 1000)).toBe('Cached 2h ago');
    expect(formatCachedAge(now - 26 * 3600 * 1000)).toBe('Cached 1d ago');
    expect(formatCachedAge(now - 50 * 3600 * 1000)).toBe('Cached 2d ago');
  });

  it('caches route snapshots and retrieves the most recent snapshot when offline', async () => {
    const snapshotId = await cacheRouteSnapshot({
      fromName: 'Shimla',
      fromDisplayName: 'Shimla, Himachal Pradesh',
      toName: 'Manali',
      toDisplayName: 'Manali, Himachal Pradesh',
      mode: 'drive',
      geometry: {
        type: 'LineString',
        coordinates: [
          [77.1734, 31.1048],
          [77.1892, 32.2432],
        ],
      },
      riskScore: {
        score: 34,
        level: 'Moderate',
        isBlocked: false,
        maxSegmentScore: 42,
        meanSegmentScore: 30,
        segments: [
          {
            sampleIndex: 0,
            distanceKm: 2.0,
            segmentGeometry: { type: 'LineString', coordinates: [] },
            score: 34,
            level: 'Moderate',
            isBlocked: false,
            coordinates: [77.1734, 31.1048],
            factors: {
              rain: 0.3,
              terrain: 0.4,
              reports: 0.1,
              history: 0.2,
              soil: 0.25,
              seismic: 0.05,
              historyHasNoRecords: false,
              rawMetrics: {
                accumRainMm: 12,
                maxHourlyRainMm: 2,
                slopeDeg: 14,
                elevationM: 1800,
                soilMoistureM3: 0.28,
                historyNearCount: 1,
                activeReportsCount: 0,
                nearbyQuakesCount: 0,
              },
            },
          },
        ],
        factorBars: [
          {
            id: 'terrain',
            name: 'Slope & Terrain',
            weight: 20,
            value: 0.4,
            weightedScore: 8,
            source: 'Open-Meteo Elevation',
            timestamp: '14:00',
            description: 'Moderate slope angles',
          },
        ],
        hazardsOnRoute: [],
        summary: 'Moderate route risk driven by mountain slope steepness.',
        timestamp: '14:00',
        disclaimer: 'RouteX gives risk estimates.',
      },
      lastKnownLocation: [77.1734, 31.1048],
    });

    expect(snapshotId).toBe('shimla-manali-drive');

    const last = await getLastCachedRouteSnapshot();
    expect(last).not.toBeNull();
    expect(last?.id).toBe('shimla-manali-drive');
    expect(last?.fromLabel).toBe('Shimla, Himachal Pradesh');
    expect(last?.score).toBe(34);
    expect(last?.level).toBe('Moderate');
    expect(last?.geometry.coordinates).toHaveLength(2);
  });

  it('reads byte ranges from Blob-backed PMTiles Source for offline map rendering', async () => {
    // Construct a test Blob with known 16 bytes: 0..15
    const testData = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    const blob = new Blob([testData], { type: 'application/octet-stream' });

    const source = new BlobPmtilesSource(blob, 'test-key');
    expect(source.getKey()).toBe('test-key');

    // Fetch range [4..7] (offset 4, length 4)
    const range = await source.getBytes(4, 4);
    const rangeView = new Uint8Array(range.data);

    expect(rangeView.length).toBe(4);
    expect(Array.from(rangeView)).toEqual([4, 5, 6, 7]);
  });
});
