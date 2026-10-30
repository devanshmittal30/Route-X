import { describe, it, expect, vi } from 'vitest';
import { HttpPmtilesSource, BlobPmtilesSource } from './pmtilesSources';
import { selectPmtilesFile } from './pmtilesManager';
import { buildPopupHtml } from './markerUtils';

describe('PMTiles Custom Source Abstraction', () => {
  it('BlobPmtilesSource slices bytes correctly from in-memory Blob', async () => {
    const rawData = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
    const blob = new Blob([rawData]);
    const source = new BlobPmtilesSource(blob, 'test-blob-key');

    expect(source.getKey()).toBe('test-blob-key');

    // Fetch slice [offset=2, length=4] => [30, 40, 50, 60]
    const res = await source.getBytes(2, 4);
    const resultView = new Uint8Array(res.data);

    expect(resultView.length).toBe(4);
    expect(Array.from(resultView)).toEqual([30, 40, 50, 60]);
  });

  it('HttpPmtilesSource sends correct Range header and handles response', async () => {
    const dummyBuffer = new ArrayBuffer(8);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 206,
      arrayBuffer: () => Promise.resolve(dummyBuffer),
      headers: {
        get: (name: string) => (name.toLowerCase() === 'etag' ? '"abc123etag"' : null),
      },
    });

    vi.stubGlobal('fetch', mockFetch);

    const source = new HttpPmtilesSource('/maps/himalaya.pmtiles');
    expect(source.getKey()).toBe('/maps/himalaya.pmtiles');

    const res = await source.getBytes(100, 50);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe('/maps/himalaya.pmtiles');
    expect(calledOptions.headers).toEqual({ Range: 'bytes=100-149' });
    expect(res.etag).toBe('"abc123etag"');
    expect(res.data).toBe(dummyBuffer);

    vi.unstubAllGlobals();
  });
});

describe('Viewport-Based PMTiles Selection', () => {
  it('selects india-overview when zoomed out (zoom < 7)', () => {
    const file = selectPmtilesFile(77.1734, 31.1048, 5);
    expect(file.id).toBe('india-overview');
    expect(file.filename).toBe('india-overview.pmtiles');
  });

  it('selects himalaya.pmtiles when inside Himalayan bounding box at zoom >= 7', () => {
    // Shimla: lon 77.1734, lat 31.1048
    const shimla = selectPmtilesFile(77.1734, 31.1048, 9);
    expect(shimla.id).toBe('himalaya');
    expect(shimla.filename).toBe('himalaya.pmtiles');

    // Manali: lon 77.1892, lat 32.2432
    const manali = selectPmtilesFile(77.1892, 32.2432, 10);
    expect(manali.id).toBe('himalaya');
  });

  it('selects northeast.pmtiles when inside Northeast bounding box at zoom >= 7', () => {
    // Guwahati: lon 91.7362, lat 26.1445
    const guwahati = selectPmtilesFile(91.7362, 26.1445, 9);
    expect(guwahati.id).toBe('northeast');
    expect(guwahati.filename).toBe('northeast.pmtiles');

    // Tawang: lon 91.8667, lat 27.5833
    const tawang = selectPmtilesFile(91.8667, 27.5833, 11);
    expect(tawang.id).toBe('northeast');
  });

  it('falls back to india-overview when outside regional boxes at zoom >= 7', () => {
    // Bengaluru: lon 77.5946, lat 12.9716 (outside Himalaya and Northeast)
    const bengaluru = selectPmtilesFile(77.5946, 12.9716, 9);
    expect(bengaluru.id).toBe('india-overview');
  });
});

describe('Marker Popup Formatting', () => {
  it('formats structured popup object with title, description, and badge', () => {
    const html = buildPopupHtml({
      title: 'NH5 Landslide',
      description: 'Road partially blocked',
      badge: 'High Risk',
    });

    expect(html).toContain('NH5 Landslide');
    expect(html).toContain('Road partially blocked');
    expect(html).toContain('High Risk');
  });
});
