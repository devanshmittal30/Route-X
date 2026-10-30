export interface UsgsFeature {
  id: string;
  properties: {
    mag: number;
    place: string | null;
    time: number;
  };
  geometry: {
    coordinates: [number, number, number];
  };
}

export interface EarthquakeEvent {
  id: string;
  magnitude: number;
  place: string;
  timeEpoch: number;
  timeFormatted: string;
  timeAgo: string;
  coordinates: [number, number, number]; // [lon, lat, depthKm]
  distanceKm?: number;
}

export interface EarthquakeSummary {
  count72h: number;
  events: EarthquakeEvent[];
  nearest?: EarthquakeEvent;
  source: string;
  fetchedAt: string;
}
