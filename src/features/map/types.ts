import type { GeoJSON } from 'geojson';
import type { LngLatBoundsLike, LngLatLike, StyleSpecification } from 'maplibre-gl';
import type { LucideIcon } from 'lucide-react';

export type PmtilesRegionId = 'himalaya' | 'northeast' | 'india-overview';

export interface PmtilesFileInfo {
  id: PmtilesRegionId;
  name: string;
  filename: string;
  url: string;
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  minZoom?: number;
  maxZoom?: number;
}

export interface MapLayerStyle {
  type?: 'line' | 'fill' | 'circle';
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  beforeId?: string;
}

export interface MapLayerItem {
  id: string;
  name: string;
  icon?: LucideIcon;
  visible: boolean;
  count?: number;
}

export interface MarkerOptions {
  lngLat: [number, number];
  icon?: string; // lucide icon name e.g. 'shield-check', 'triangle-alert', 'map-pin'
  color?: string; // Hex color from tokens e.g. #15803D
  bgSoftColor?: string; // Soft background hex
  shape?: 'pin' | 'hollow-triangle' | 'ring';
  magnitude?: number; // for earthquake ring sizing
  popup?: string | HTMLElement | { title: string; description?: string; badge?: string };
  isTest?: boolean; // diagonal stripe styling
  className?: string;
  size?: number; // default 34px
  onClick?: () => void;
}

export interface MarkerHandle {
  id: string;
  remove: () => void;
  updateLngLat: (coords: [number, number]) => void;
  togglePopup: () => void;
}

export interface LayerManagerAPI {
  addGeoJSONLayer: (
    id: string,
    data: GeoJSON | string,
    style?: MapLayerStyle,
    name?: string
  ) => void;
  removeLayer: (id: string) => void;
  toggleLayer: (id: string, visible: boolean) => void;
  fitToBounds: (
    bounds: LngLatBoundsLike,
    options?: { padding?: number | { top: number; bottom: number; left: number; right: number }; maxZoom?: number }
  ) => void;
  flyTo: (
    center: LngLatLike,
    zoom?: number,
    options?: { duration?: number; essential?: boolean }
  ) => void;
  addMarker: (options: MarkerOptions) => MarkerHandle;
  clearMarkers: () => void;
  getLayers: () => MapLayerItem[];
  getZoom: () => number;
  onZoom?: (callback: (zoom: number) => void) => () => void;
}

export interface RouteXMapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  className?: string;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  onMapReady?: (api: LayerManagerAPI) => void;
  interactive?: boolean;
  showControls?: boolean;
  showLayerPanel?: boolean;
  showLegend?: boolean;
  customStyle?: StyleSpecification;
}

