import type { GeocodingResultItem, SelectedLocation } from './types';

const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * Searches places via Open-Meteo Geocoding API with India priority.
 */
export async function searchPlaces(query: string): Promise<SelectedLocation[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = `${GEOCODING_BASE_URL}?name=${encodeURIComponent(trimmed)}&count=10&language=en&format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const results: GeocodingResultItem[] = data.results || [];

    // Prioritize India (country_code === 'IN' or lat between 6 and 38, lon between 68 and 98)
    const sorted = [...results].sort((a, b) => {
      const aIsIndia = a.country_code === 'IN' || (a.latitude >= 6 && a.latitude <= 38 && a.longitude >= 68 && a.longitude <= 98);
      const bIsIndia = b.country_code === 'IN' || (b.latitude >= 6 && b.latitude <= 38 && b.longitude >= 68 && b.longitude <= 98);

      if (aIsIndia && !bIsIndia) return -1;
      if (!aIsIndia && bIsIndia) return 1;
      return 0;
    });

    return sorted.map((item) => {
      const labelParts = [item.name];
      if (item.admin1) labelParts.push(item.admin1);
      if (item.country && item.country !== 'India') labelParts.push(item.country);

      return {
        name: labelParts.join(', '),
        admin1: item.admin1,
        country: item.country,
        latitude: item.latitude,
        longitude: item.longitude,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Reverse geocodes coordinates to city/region name via BigDataCloud client API with fallback.
 */
export async function reverseGeocodeLocation(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality;
      const state = data.principalSubdivision;
      const country = data.countryName || 'India';
      if (city && state) return `${city}, ${state}`;
      if (city) return `${city}, ${country}`;
      if (state) return `${state}, ${country}`;
    }
  } catch {
    // Non-fatal, fallback to formatted coordinates
  }

  return `Current Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
}


