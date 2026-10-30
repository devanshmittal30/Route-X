import { supabase } from '../../lib/supabase';
import type { WeatherSummary } from './types';
import { formatCachedAge } from './weatherHelpers';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes per Doc 03 section 6.1

interface MemoryCacheEntry {
  summary: WeatherSummary;
  fetchedAt: number;
}

const memoryCache = new Map<string, MemoryCacheEntry>();

export function getCoordinatesCacheKey(lat: number, lon: number): string {
  // Round to 2 decimal places (~1.1 km) for efficient weather grid caching
  return `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
}

/**
 * Retrieve cached weather summary from in-memory cache or Supabase weather_cache table.
 */
export async function getCachedWeather(
  lat: number,
  lon: number
): Promise<WeatherSummary | null> {
  const cacheKey = getCoordinatesCacheKey(lat, lon);
  const now = Date.now();

  // 1. Check in-memory cache
  const memEntry = memoryCache.get(cacheKey);
  if (memEntry && now - memEntry.fetchedAt < CACHE_TTL_MS) {
    return {
      ...memEntry.summary,
      isCached: true,
      cachedAgeDesc: formatCachedAge(new Date(memEntry.fetchedAt).toISOString()),
    };
  }

  // 2. Check Supabase weather_cache table (if online)
  try {
    const { data, error } = await supabase
      .from('weather_cache')
      .select('payload, fetched_at')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (!error && data && data.payload) {
      const fetchedEpoch = new Date(data.fetched_at).getTime();
      if (now - fetchedEpoch < CACHE_TTL_MS) {
        const summary = data.payload as WeatherSummary;
        // Populate memory cache
        memoryCache.set(cacheKey, { summary, fetchedAt: fetchedEpoch });
        return {
          ...summary,
          isCached: true,
          cachedAgeDesc: formatCachedAge(data.fetched_at),
        };
      }
    }
  } catch {
    // Ignore network / offline errors and continue to fetch fresh data
  }

  return null;
}

/**
 * Save weather summary to in-memory cache and asynchronously to Supabase weather_cache table.
 */
export async function setCachedWeather(
  lat: number,
  lon: number,
  summary: WeatherSummary
): Promise<void> {
  const cacheKey = getCoordinatesCacheKey(lat, lon);
  const now = Date.now();

  // 1. Save to in-memory cache
  memoryCache.set(cacheKey, { summary, fetchedAt: now });

  // 2. Save to Supabase weather_cache table (fire-and-forget, gracefully handles offline/RLS)
  try {
    await supabase.from('weather_cache').upsert(
      {
        cache_key: cacheKey,
        payload: summary,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'cache_key' }
    );
  } catch {
    // Graceful fallback for offline or restricted environment
  }
}
