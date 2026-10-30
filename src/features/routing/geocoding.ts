import type { GeocodedPlace } from './types';

const OPEN_METEO_GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const PHOTON_GEOCODE_URL = 'https://photon.komoot.io/api';

interface OpenMeteoGeocodeItem {
  name: string;
  country_code?: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

interface PhotonFeature {
  properties?: {
    name?: string;
    state?: string;
    country?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
}

/**
 * Checks if coordinates fall within India's bounding box.
 */
function isWithinIndia(lat: number, lon: number): boolean {
  return lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98;
}

/**
 * Primary geocoder using Open-Meteo with India priority.
 */
async function searchOpenMeteo(query: string): Promise<GeocodedPlace[]> {
  const url = `${OPEN_METEO_GEOCODE_URL}?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const json = await res.json();
  const results: OpenMeteoGeocodeItem[] = json.results || [];

  // Sort India first
  results.sort((a, b) => {
    const aInIndia = a.country_code === 'IN' || isWithinIndia(a.latitude, a.longitude);
    const bInIndia = b.country_code === 'IN' || isWithinIndia(b.latitude, b.longitude);
    if (aInIndia && !bInIndia) return -1;
    if (!aInIndia && bInIndia) return 1;
    return 0;
  });

  return results.map((r) => {
    const parts = [r.name];
    if (r.admin1) parts.push(r.admin1);
    if (r.country && r.country !== 'India') parts.push(r.country);

    return {
      name: r.name,
      displayName: parts.join(', '),
      admin1: r.admin1,
      country: r.country,
      latitude: r.latitude,
      longitude: r.longitude,
    };
  });
}

/**
 * Fallback geocoder using Photon (Komoot).
 */
async function searchPhoton(query: string): Promise<GeocodedPlace[]> {
  // Center bias towards northern India / Himalayas
  const url = `${PHOTON_GEOCODE_URL}/?q=${encodeURIComponent(query)}&limit=8&lat=31.1&lon=77.1`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const json = await res.json();
  const features: PhotonFeature[] = json.features || [];

  return features.map((f) => {
    const props = f.properties || {};
    const coords = f.geometry?.coordinates || [0, 0]; // [lon, lat]

    const parts = [props.name];
    if (props.state) parts.push(props.state);
    if (props.country && props.country !== 'India') parts.push(props.country);

    return {
      name: props.name || 'Unknown',
      displayName: parts.filter(Boolean).join(', '),
      admin1: props.state,
      country: props.country,
      latitude: coords[1],
      longitude: coords[0],
    };
  });
}

/**
 * Autocomplete place search with fallback.
 */
export async function geocodePlace(query: string): Promise<GeocodedPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    const openMeteoResults = await searchOpenMeteo(trimmed);
    if (openMeteoResults.length > 0) {
      return openMeteoResults;
    }
  } catch {
    // Open-Meteo failed; proceed to Photon fallback
  }

  try {
    const photonResults = await searchPhoton(trimmed);
    return photonResults;
  } catch {
    return [];
  }
}
