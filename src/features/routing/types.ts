import type { LineString } from 'geojson';

export type RouteMode = 'drive' | 'walk';

export interface RouteStep {
  name: string;
  distance: number; // in meters
  duration: number; // in seconds
  instruction?: string;
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number];
  };
}

export interface RouteLeg {
  distance: number;
  duration: number;
  summary?: string;
  steps: RouteStep[];
}

export interface RouteOption {
  id: string;
  name: string;
  distanceMeters: number;
  durationSeconds: number;
  geometry: LineString;
  legs: RouteLeg[];
  isRecommended?: boolean;
}

export interface RoutingResult {
  routes: RouteOption[];
  waypoints: Array<{
    name: string;
    location: [number, number]; // [lon, lat]
  }>;
}

export interface GeocodedPlace {
  name: string;
  displayName: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

