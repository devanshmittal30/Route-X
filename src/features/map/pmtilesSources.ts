import type { Source, RangeResponse } from 'pmtiles';

/**
 * Custom PMTiles Source that fetches byte ranges over standard HTTP(S).
 * Implements the pmtiles Source interface (getBytes, getKey).
 */
export class HttpPmtilesSource implements Source {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  getKey(): string {
    return this.url;
  }

  async getBytes(
    offset: number,
    length: number,
    signal?: AbortSignal,
    etag?: string
  ): Promise<RangeResponse> {
    const headers: Record<string, string> = {
      Range: `bytes=${offset}-${offset + length - 1}`,
    };

    if (etag) {
      headers['If-Match'] = etag;
    }

    const response = await fetch(this.url, {
      headers,
      signal,
    });

    if (response.status === 416) {
      throw new Error(`[HttpPmtilesSource] Requested range out of bounds: bytes=${offset}-${offset + length - 1}`);
    }

    if (!response.ok && response.status !== 206) {
      throw new Error(
        `[HttpPmtilesSource] Failed to fetch chunk from ${this.url}: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.arrayBuffer();

    return {
      data,
      etag: response.headers.get('ETag') || undefined,
      cacheControl: response.headers.get('Cache-Control') || undefined,
      expires: response.headers.get('Expires') || undefined,
    };
  }
}

/**
 * Custom PMTiles Source that reads byte ranges directly from a Blob.
 * Used for offline maps cached in IndexedDB / Dexie (P13).
 */
export class BlobPmtilesSource implements Source {
  private blob: Blob;
  private key: string;

  constructor(blob: Blob, key: string = 'indexeddb-pmtiles-blob') {
    this.blob = blob;
    this.key = key;
  }

  getKey(): string {
    return this.key;
  }

  async getBytes(
    offset: number,
    length: number,
    signal?: AbortSignal
  ): Promise<RangeResponse> {
    if (signal?.aborted) {
      throw new DOMException('PMTiles read aborted', 'AbortError');
    }

    const slice = this.blob.slice(offset, offset + length);
    const data = await slice.arrayBuffer();

    return {
      data,
    };
  }
}

