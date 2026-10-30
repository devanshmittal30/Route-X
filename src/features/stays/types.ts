import type { StayCandidate } from '../rewards/ranking';
import type { RiskLevel } from '../risk/types';

export type StayCategory =
  | 'hotel'
  | 'guest_house'
  | 'hostel'
  | 'chalet'
  | 'shelter'
  | 'hospital'
  | 'clinic'
  | 'stay'
  | 'gear';

export interface OverpassElement {
  type: 'node' | 'way';
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  version: number;
  generator: string;
  osm3s?: {
    timestamp_osm_base?: string;
  };
  elements: OverpassElement[];
}

export interface StayFilterOptions {
  safeOnly: boolean; // default true (Low and Moderate only)
  categories?: StayCategory[];
  radiusKm?: number;
  searchQuery?: string;
}

export type { StayCandidate, RiskLevel };
