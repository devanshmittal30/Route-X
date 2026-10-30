import type { LineString } from 'geojson';
import type { RiskLevel } from './config';

export type { RiskLevel };

export interface RouteSample {
  index: number;
  coordinates: [number, number]; // [longitude, latitude]
  distanceKm: number;
  segmentGeometry: LineString;
  gridCellKey: string; // e.g. "31.1,77.2"
}

export interface ElevationSample {
  center: number;
  north: number;
  south: number;
  east: number;
  west: number;
  slopeDeg: number;
}

export type HazardReportType =
  | 'landslide'
  | 'road_blocked'
  | 'flood'
  | 'snow'
  | 'rockfall'
  | 'bridge_damage'
  | 'all_clear';

export type HazardReportStatus = 'pending' | 'verified' | 'disputed' | 'resolved' | 'expired';

export interface HazardReportItem {
  id: string;
  type: HazardReportType;
  severity: 1 | 2 | 3;
  status: HazardReportStatus;
  is_test: boolean;
  up_count: number;
  down_count: number;
  coordinates: [number, number]; // [lng, lat]
  distanceMeters: number;
  description?: string;
  photo_path?: string;
  created_at?: string;
  resolves_report_id?: string | null;
}

export interface HistoricalLandslideItem {
  id: number | string;
  source: string;
  event_date: string;
  coordinates: [number, number];
  distanceKm: number;
  location_text?: string;
}

export interface EarthquakeRiskItem {
  id: string;
  magnitude: number;
  timeIso: string;
  coordinates: [number, number];
  distanceKm: number;
  place?: string;
}

export interface SegmentRawMetrics {
  accumRainMm: number;
  maxHourlyRainMm: number;
  slopeDeg: number;
  elevationM: number;
  soilMoistureM3: number;
  historyNearCount: number;
  activeReportsCount: number;
  nearbyQuakesCount: number;
}

export interface SegmentFactors {
  rain: number; // 0..1
  terrain: number; // 0..1
  reports: number; // 0..1
  history: number; // 0..1
  soil: number; // 0..1
  seismic: number; // 0..1
  historyHasNoRecords: boolean;
  rawMetrics: SegmentRawMetrics;
}

export interface SegmentRisk {
  sampleIndex: number;
  coordinates: [number, number];
  distanceKm: number;
  segmentGeometry: LineString;
  score: number; // 0..100
  level: RiskLevel;
  isBlocked: boolean;
  factors: SegmentFactors;
}

export type FactorId = 'rain' | 'terrain' | 'reports' | 'history' | 'soil' | 'seismic';

export interface FactorBar {
  id: FactorId;
  name: string;
  weight: number; // 0..100
  value: number; // 0..1
  weightedScore: number; // weight * value * 100
  source: string;
  timestamp: string;
  description: string;
}

export interface HazardOnRoute {
  id: string;
  title: string;
  type: HazardReportType;
  severity: number;
  distanceKm: number;
  coordinates: [number, number];
  isVerified: boolean;
  isTest: boolean;
  description?: string;
}

export interface RouteRiskScore {
  score: number; // 0..100
  level: RiskLevel;
  isBlocked: boolean;
  maxSegmentScore: number;
  meanSegmentScore: number;
  segments: SegmentRisk[];
  factorBars: FactorBar[];
  hazardsOnRoute: HazardOnRoute[];
  summary: string;
  timestamp: string;
  disclaimer: string;
}

