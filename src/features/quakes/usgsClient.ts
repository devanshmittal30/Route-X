import type { EarthquakeEvent, EarthquakeSummary, UsgsFeature } from './types';

// India bounding box (Doc 03 section 4)
const INDIA_BBOX = {
  minLat: 6,
  maxLat: 38,
  minLon: 68,
  maxLon: 98,
};

const USGS_BASE_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

/**
 * Calculates distance between two coordinates in kilometers using the Haversine formula.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats epoch ms into relative time ("3h ago", "1d ago").
 */
function formatTimeAgo(epoch: number): string {
  const diffHours = Math.floor((Date.now() - epoch) / (1000 * 60 * 60));
  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

/**
 * Fetch M4.5+ earthquakes in India bounding box within the past 72 hours.
 */
export async function fetchNearbyEarthquakes(
  centerLat?: number,
  centerLon?: number
): Promise<EarthquakeSummary> {
  const startTime = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    format: 'geojson',
    minmagnitude: '4.5',
    starttime: startTime,
    minlatitude: INDIA_BBOX.minLat.toString(),
    maxlatitude: INDIA_BBOX.maxLat.toString(),
    minlongitude: INDIA_BBOX.minLon.toString(),
    maxlongitude: INDIA_BBOX.maxLon.toString(),
  });

  const url = `${USGS_BASE_URL}?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`USGS Earthquakes request failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const features = json.features || [];

  const events: EarthquakeEvent[] = features.map((f: UsgsFeature) => {
    const coords: [number, number, number] = f.geometry.coordinates; // [lon, lat, depth]
    let distanceKm: number | undefined;

    if (centerLat !== undefined && centerLon !== undefined) {
      distanceKm = calculateHaversineDistanceKm(centerLat, centerLon, coords[1], coords[0]);
    }

    return {
      id: f.id,
      magnitude: f.properties.mag,
      place: f.properties.place || 'Unknown Location',
      timeEpoch: f.properties.time,
      timeFormatted: new Date(f.properties.time).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      timeAgo: formatTimeAgo(f.properties.time),
      coordinates: coords,
      distanceKm,
    };
  });

  // Sort events by distance if center was provided, otherwise by time
  if (centerLat !== undefined && centerLon !== undefined) {
    events.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  } else {
    events.sort((a, b) => b.timeEpoch - a.timeEpoch);
  }

  return {
    count72h: events.length,
    events,
    nearest: events[0],
    source: 'USGS Hazards',
    fetchedAt: new Date().toISOString(),
  };
}
