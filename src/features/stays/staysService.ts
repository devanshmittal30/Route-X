import * as turf from '@turf/turf';
import { db } from '../../lib/db';
import { rankStays, generateWhyThisStay, StayCandidate } from '../rewards/ranking';
import { fetchRankedSponsoredStays } from '../rewards/rewardsService';
import { scoreSingleLocation } from '../risk/dataAdapters';
import type { OverpassResponse, StayCategory } from './types';
import { useDemoStore } from '../../lib/demoStore';

export const STAYS_ATTRIBUTION = 'Data © OpenStreetMap contributors, ODbL 1.0';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours per Doc 03 Section 4

// In-memory cache
const memoryStaysCache = new Map<string, { data: StayCandidate[]; cachedAt: number }>();

/**
 * Capitalizes category for readable labels
 */
function formatCategoryLabel(cat: string): string {
  switch (cat) {
    case 'hotel':
      return 'Hotel';
    case 'guest_house':
      return 'Guest House';
    case 'hostel':
      return 'Hostel';
    case 'chalet':
      return 'Mountain Chalet';
    case 'shelter':
      return 'Emergency Shelter';
    case 'hospital':
      return 'Hospital';
    case 'clinic':
      return 'Medical Clinic';
    default:
      return 'Stay';
  }
}

/**
 * Builds Overpass QL query for hotels, guest houses, hostels, chalets, shelters, hospitals, clinics
 */
function buildOverpassQuery(lat: number, lon: number, radiusMeters: number): string {
  return `[out:json][timeout:10];
(
  node["tourism"~"^(hotel|guest_house|hostel|chalet)$"](around:${radiusMeters},${lat},${lon});
  way["tourism"~"^(hotel|guest_house|hostel|chalet)$"](around:${radiusMeters},${lat},${lon});
  node["amenity"~"^(shelter|hospital|clinic)$"](around:${radiusMeters},${lat},${lon});
  way["amenity"~"^(shelter|hospital|clinic)$"](around:${radiusMeters},${lat},${lon});
);
out center 45;`;
}

/**
 * Fetch helper with 8 s timeout and 1 retry
 */
async function fetchWithRetry(url: string, options?: RequestInit, timeoutMs = 8000): Promise<Response> {
  const attempt = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await attempt();
  } catch {
    return await attempt();
  }
}

/**
 * Fetches OpenStreetMap stays and shelters from Overpass API (with fallback mirror)
 */
async function fetchOverpassElements(lat: number, lon: number, radiusKm: number): Promise<OverpassResponse> {
  const radiusMeters = Math.round(radiusKm * 1000);
  const query = buildOverpassQuery(lat, lon, radiusMeters);

  const primaryUrl = 'https://overpass-api.de/api/interpreter';
  const mirrorUrl = 'https://overpass.private.coffee/api/interpreter';

  try {
    const res = await fetchWithRetry(primaryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: `data=${encodeURIComponent(query)}`,
    });
    return (await res.json()) as OverpassResponse;
  } catch (errPrimary) {
    try {
      const resMirror = await fetchWithRetry(mirrorUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: `data=${encodeURIComponent(query)}`,
      });
      return (await resMirror.json()) as OverpassResponse;
    } catch {
      throw errPrimary;
    }
  }
}

/**
 * Fetches regional weather snapshot for single point evaluation
 */
async function fetchRegionalWeather(lat: number, lon: number) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,precipitation&hourly=precipitation,soil_moisture_0_to_1cm&past_days=3&forecast_days=3&timezone=auto`;
    const res = await fetchWithRetry(url, undefined, 6000);
    const data = await res.json();
    const precip: number[] = data?.hourly?.precipitation || [];
    const pastSum = precip.slice(0, 72).reduce((a, b) => a + b, 0);
    const nextSum = precip.slice(72, 120).reduce((a, b) => a + b, 0);
    const maxHourly = Math.max(0, ...precip.slice(72, 96));
    const soil = data?.hourly?.soil_moisture_0_to_1cm?.[72] ?? 0.25;

    return {
      accumRain72h: Number((pastSum + 0.5 * nextSum).toFixed(1)),
      maxHourly24h: Number(maxHourly.toFixed(1)),
      soilMoisture: Number(soil.toFixed(2)),
    };
  } catch {
    return {
      accumRain72h: 0,
      maxHourly24h: 0,
      soilMoisture: 0.25,
    };
  }
}

/**
 * Parses raw Overpass elements into typed StayCandidate array
 */
export function parseOverpassElements(
  elements: OverpassResponse['elements'],
  userCoords: [number, number]
): StayCandidate[] {
  const candidates: StayCandidate[] = [];

  for (const el of elements) {
    let lat: number | undefined;
    let lon: number | undefined;

    if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
      lat = el.lat;
      lon = el.lon;
    } else if (el.type === 'way' && el.center) {
      lat = el.center.lat;
      lon = el.center.lon;
    }

    if (lat === undefined || lon === undefined) continue;

    const tags = el.tags || {};
    const rawCategory = (tags.tourism || tags.amenity || 'stay') as StayCategory;
    const typeLabel = formatCategoryLabel(rawCategory);

    const name =
      tags.name ||
      tags['name:en'] ||
      tags['name:hi'] ||
      `${typeLabel} (${tags['addr:street'] || 'Nearby'})`;

    // Extract useful amenity tags
    const amenityTags: string[] = [typeLabel];
    if (tags['addr:city']) amenityTags.push(tags['addr:city']);
    if (tags.phone) amenityTags.push('Phone listed');
    if (tags.wheelchair === 'yes') amenityTags.push('Wheelchair accessible');
    if (tags.emergency === 'yes') amenityTags.push('Emergency facility');
    if (tags.stars) amenityTags.push(`${tags.stars}★`);

    // Distance in km
    let distanceKm = 999;
    try {
      const from = turf.point(userCoords);
      const to = turf.point([lon, lat]);
      distanceKm = Number(turf.distance(from, to, { units: 'kilometers' }).toFixed(1));
    } catch {
      // Ignore
    }

    candidates.push({
      id: `osm-${el.type}-${el.id}`,
      name,
      category: rawCategory,
      description: tags.description || tags['addr:street'] || null,
      city: tags['addr:city'],
      coordinates: [lon, lat],
      riskLevel: 'Low', // Will be scored for top 15
      riskScore: 20,
      isSponsored: false,
      distanceKm,
      amenityTags: amenityTags.slice(0, 3),
    });
  }

  return candidates;
}

/**
 * Main service to fetch nearby stays with 24-hour caching and single-point risk scoring.
 */
export async function fetchNearbyStays(
  lat: number,
  lon: number,
  radiusKm = 15,
  includeSponsored = true
): Promise<{ stays: StayCandidate[]; attribution: string; fromCache: boolean }> {
  const cacheKey = `stays_${lat.toFixed(2)}_${lon.toFixed(2)}_${radiusKm}`;
  const now = Date.now();

  // 1. Check in-memory cache
  const mem = memoryStaysCache.get(cacheKey);
  if (mem && now - mem.cachedAt < CACHE_TTL_MS) {
    return { stays: mem.data, attribution: STAYS_ATTRIBUTION, fromCache: true };
  }

  // 2. Check Dexie persistent cache
  try {
    const dbRecord = await db.staysCache.get(cacheKey);
    if (dbRecord && now - dbRecord.cachedAt < CACHE_TTL_MS) {
      memoryStaysCache.set(cacheKey, { data: dbRecord.data, cachedAt: dbRecord.cachedAt });
      return { stays: dbRecord.data, attribution: STAYS_ATTRIBUTION, fromCache: true };
    }
  } catch {
    // Non-fatal Dexie error
  }

  // 3. Fetch fresh from Overpass API
  let rawCandidates: StayCandidate[] = [];
  try {
    const overpassRes = await fetchOverpassElements(lat, lon, radiusKm);
    if (overpassRes?.elements) {
      rawCandidates = parseOverpassElements(overpassRes.elements, [lon, lat]);
    }
  } catch {
    // If Overpass fails and offline, try stale Dexie cache
    try {
      const stale = await db.staysCache.get(cacheKey);
      if (stale && stale.data.length > 0) {
        return { stays: stale.data, attribution: STAYS_ATTRIBUTION, fromCache: true };
      }
    } catch {
      // Ignore
    }
  }

  // 4. Sort by distance so we score the nearest 15 places per limits
  rawCandidates.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  const top15ToScore = rawCandidates.slice(0, 15);
  const remaining = rawCandidates.slice(15);

  // 5. Evaluate single-point safety level for the top 15
  const isDemo = useDemoStore.getState().demoMode;
  const regionalWeather = await fetchRegionalWeather(lat, lon);

  const scoredTop15 = await Promise.all(
    top15ToScore.map(async (stay) => {
      try {
        const scoreRes = await scoreSingleLocation(
          stay.coordinates[1],
          stay.coordinates[0],
          regionalWeather,
          isDemo
        );
        return {
          ...stay,
          riskLevel: scoreRes.level,
          riskScore: scoreRes.score,
        };
      } catch {
        return stay;
      }
    })
  );

  let allStayCandidates = [...scoredTop15, ...remaining];

  // 6. Include sponsored demo stays if requested
  if (includeSponsored) {
    try {
      const sponsoredStays = await fetchRankedSponsoredStays([lon, lat]);
      // Only keep sponsored stays within reasonable radius
      const relevantSponsored = sponsoredStays.filter((s) => (s.distanceKm ?? 0) <= radiusKm * 2);
      allStayCandidates = [...allStayCandidates, ...relevantSponsored];
    } catch {
      // Non-fatal
    }
  }

  // 7. Rank strictly per Doc 03 Section 9:
  //    (a) Hide Severe
  //    (b) Safety level first (Low before Moderate before High)
  //    (c) Sponsored demo partner first within the same level
  //    (d) Distance (closest first)
  const ranked = rankStays(allStayCandidates, [lon, lat]);

  // 8. Attach real "Why this stay" explanation line
  const finalStays = ranked.map((s) => ({
    ...s,
    whyThisStay: generateWhyThisStay(s),
  }));

  // 9. Cache in memory and Dexie for 24 hours
  memoryStaysCache.set(cacheKey, { data: finalStays, cachedAt: now });
  try {
    await db.staysCache.put({
      cacheKey,
      data: finalStays,
      cachedAt: now,
      lat,
      lon,
      radiusKm,
    });
  } catch {
    // Non-fatal
  }

  return {
    stays: finalStays,
    attribution: STAYS_ATTRIBUTION,
    fromCache: false,
  };
}
