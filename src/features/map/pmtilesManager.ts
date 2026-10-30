import maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import { Protocol, PMTiles } from 'pmtiles';
import { layers as protomapsLayers, namedFlavor } from '@protomaps/basemaps';
import { HttpPmtilesSource, BlobPmtilesSource } from './pmtilesSources';
import { db } from '../../lib/db';
import type { PmtilesFileInfo, PmtilesRegionId } from './types';

// Regional file metadata from doc 03 sections 4 & 11
export const PMTILES_REGIONS: Record<PmtilesRegionId, PmtilesFileInfo> = {
  himalaya: {
    id: 'himalaya',
    name: 'Himalaya Regional (HP, UK, J&K)',
    filename: 'himalaya.pmtiles',
    url: '/maps/himalaya.pmtiles',
    bbox: [74, 28.5, 81, 37],
    minZoom: 7,
    maxZoom: 12,
  },
  northeast: {
    id: 'northeast',
    name: 'Northeast India Regional',
    filename: 'northeast.pmtiles',
    url: '/maps/northeast.pmtiles',
    bbox: [87.5, 21.5, 97.5, 29.5],
    minZoom: 7,
    maxZoom: 12,
  },
  'india-overview': {
    id: 'india-overview',
    name: 'India Overview',
    filename: 'india-overview.pmtiles',
    url: '/maps/india-overview.pmtiles',
    bbox: [68, 6, 98, 38],
    minZoom: 0,
    maxZoom: 8,
  },
};

let protocolInstance: Protocol | null = null;
const registeredPmtilesSources = new Map<string, PMTiles>();

/**
 * Register the pmtiles:// protocol once with MapLibre GL.
 */
export function registerPmtilesProtocol(): Protocol {
  if (!protocolInstance) {
    protocolInstance = new Protocol();
    maplibregl.addProtocol('pmtiles', protocolInstance.tile);
  }
  return protocolInstance;
}

/**
 * Get or register a custom PMTiles instance on the global protocol.
 */
export function getOrCreatePmtiles(url: string): PMTiles {
  const protocol = registerPmtilesProtocol();
  if (!registeredPmtilesSources.has(url)) {
    const source = new HttpPmtilesSource(url);
    const instance = new PMTiles(source);
    protocol.add(instance);
    registeredPmtilesSources.set(url, instance);
  }
  return registeredPmtilesSources.get(url)!;
}

/**
 * Registers a Blob-backed PMTiles instance on the global protocol.
 */
export function registerBlobPmtiles(url: string, blob: Blob): PMTiles {
  const protocol = registerPmtilesProtocol();
  const source = new BlobPmtilesSource(blob, url);
  const instance = new PMTiles(source);
  protocol.add(instance);
  registeredPmtilesSources.set(url, instance);
  return instance;
}

/**
 * Initializes PMTiles source from Dexie if available, otherwise HTTP.
 */
export async function initializePmtilesSource(url: string, regionId?: string): Promise<PMTiles> {
  const protocol = registerPmtilesProtocol();
  if (regionId) {
    try {
      const record = await db.tiles.get(regionId);
      if (record && record.blob) {
        const source = new BlobPmtilesSource(record.blob, url);
        const instance = new PMTiles(source);
        protocol.add(instance);
        registeredPmtilesSources.set(url, instance);
        return instance;
      }
    } catch {
      // Fall through to HTTP
    }
  }

  return getOrCreatePmtiles(url);
}

/**
 * Choose the appropriate PMTiles file based on center coordinates and zoom level.
 * Zoom < 7 uses overview. Regional bounding boxes pick regional extracts.
 */
export function selectPmtilesFile(centerLng: number, centerLat: number, zoom: number): PmtilesFileInfo {
  if (zoom < 7) {
    return PMTILES_REGIONS['india-overview'];
  }

  // Check Himalaya bounding box [74, 28.5, 81, 37]
  const [hMinLng, hMinLat, hMaxLng, hMaxLat] = PMTILES_REGIONS.himalaya.bbox;
  if (centerLng >= hMinLng && centerLng <= hMaxLng && centerLat >= hMinLat && centerLat <= hMaxLat) {
    return PMTILES_REGIONS.himalaya;
  }

  // Check Northeast bounding box [87.5, 21.5, 97.5, 29.5]
  const [neMinLng, neMinLat, neMaxLng, neMaxLat] = PMTILES_REGIONS.northeast.bbox;
  if (centerLng >= neMinLng && centerLng <= neMaxLng && centerLat >= neMinLat && centerLat <= neMaxLat) {
    return PMTILES_REGIONS.northeast;
  }

  // Fallback to overview
  return PMTILES_REGIONS['india-overview'];
}

/**
 * Check if a local PMTiles file exists on the server.
 */
export async function checkPmtilesAvailability(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok && res.status !== 404;
  } catch {
    return false;
  }
}

/**
 * Build MapLibre style using Protomaps "light" flavour from local PMTiles.
 */
export function buildPmtilesMapStyle(pmtilesUrl: string): StyleSpecification {
  // Ensure the PMTiles instance is registered with the protocol
  getOrCreatePmtiles(pmtilesUrl);

  const styleLayers = protomapsLayers('protomaps', namedFlavor('light'));

  return {
    version: 8,
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${pmtilesUrl}`,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      },
    },
    layers: styleLayers as unknown as StyleSpecification['layers'],
  };
}

/**
 * Fallback style when local PMTiles files have not been extracted into public/maps/ yet.
 * Uses high-performance OpenStreetMap CartoDB Voyager raster tiles so all roads,
 * terrain, towns, and mountains render smoothly with zero configuration.
 */
export function buildFallbackMapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      carto: {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
          'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
          'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
          'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>, © <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
      },
    },
    layers: [
      {
        id: 'carto-tiles',
        type: 'raster',
        source: 'carto',
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  };
}
