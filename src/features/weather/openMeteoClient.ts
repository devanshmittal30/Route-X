import { openMeteoResponseSchema, type OpenMeteoResponse, type WeatherSummary } from './types';
import {
  calculateRainPast24h,
  calculateRainNext72h,
  calculateSnowfallNext24h,
  findCurrentHourIndex,
  getSoilMoistureDescription,
} from './weatherHelpers';
import { getCachedWeather, setCachedWeather } from './weatherCache';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 8000; // 8 seconds per Doc 03 section 7

/**
 * Fetch helper with timeout via AbortController.
 */
async function fetchWithTimeout(url: string, timeoutMs: number = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Fetch with 8 s timeout + 1 automatic retry.
 */
async function fetchWithRetry(url: string): Promise<Response> {
  try {
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    if (res.ok) return res;
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  } catch (firstError) {
    // Retry once
    try {
      const resRetry = await fetchWithTimeout(url, TIMEOUT_MS);
      if (resRetry.ok) return resRetry;
      throw new Error(`HTTP ${resRetry.status}: ${resRetry.statusText}`);
    } catch {
      throw firstError;
    }
  }
}

/**
 * Builds the standard Open-Meteo query URL.
 */
function buildForecastUrl(lat: number | number[], lon: number | number[]): string {
  const lats = Array.isArray(lat) ? lat.join(',') : lat.toString();
  const lons = Array.isArray(lon) ? lon.join(',') : lon.toString();

  const params = new URLSearchParams({
    latitude: lats,
    longitude: lons,
    current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m',
    hourly: 'precipitation,soil_moisture_0_to_1cm,snowfall,wind_gusts_10m,temperature_2m,relative_humidity_2m',
    past_days: '3',
    forecast_days: '3',
    timezone: 'auto',
  });

  return `${OPEN_METEO_BASE_URL}?${params.toString()}`;
}

/**
 * Parses raw Open-Meteo response into clean WeatherSummary.
 */
export function parseWeatherSummary(data: OpenMeteoResponse): WeatherSummary {
  const hourly = data.hourly;
  const current = data.current;

  const currentHourIdx = findCurrentHourIndex(hourly.time, current?.time);

  // Temperature
  const temp = current?.temperature_2m ?? hourly.temperature_2m?.[currentHourIdx] ?? 0;

  // Humidity
  const humidity = current?.relative_humidity_2m ?? hourly.relative_humidity_2m?.[currentHourIdx] ?? 50;

  // Wind & Gusts
  const windSpeed = current?.wind_speed_10m ?? 0;
  const windGusts = current?.wind_gusts_10m ?? hourly.wind_gusts_10m?.[currentHourIdx] ?? 0;

  // Rain Accumulations
  const rain24h = calculateRainPast24h(hourly, current?.time);
  const rainNext72h = calculateRainNext72h(hourly, current?.time);

  // Snowfall
  const snowfall = calculateSnowfallNext24h(hourly, current?.time);

  // Shallow Soil Moisture (0-1cm)
  const soilMoisture = hourly.soil_moisture_0_to_1cm?.[currentHourIdx] ?? 0.25;

  return {
    temperatureC: Number(temp.toFixed(1)),
    humidityPct: Math.round(humidity),
    precipitation24hMm: rain24h,
    precipitationNext72hMm: rainNext72h,
    windSpeedKmh: Number(windSpeed.toFixed(1)),
    windGustsKmh: Number(windGusts.toFixed(1)),
    snowfallCm: Number(snowfall.toFixed(1)),
    soilMoistureM3: Number(soilMoisture.toFixed(3)),
    soilMoistureDesc: getSoilMoistureDescription(soilMoisture),
    source: 'Open-Meteo',
    fetchedAt: new Date().toISOString(),
    raw: data,
  };
}

/**
 * Fetch weather for a single location with caching (30m).
 */
export async function fetchLocationWeather(
  lat: number,
  lon: number,
  skipCache = false
): Promise<WeatherSummary> {
  // 1. Check cache unless explicitly skipped
  if (!skipCache) {
    const cached = await getCachedWeather(lat, lon);
    if (cached) return cached;
  }

  // 2. Fetch fresh data
  const url = buildForecastUrl(lat, lon);
  const response = await fetchWithRetry(url);
  const json = await response.json();

  // 3. Validate with Zod
  const parsed = openMeteoResponseSchema.parse(json);
  const summary = parseWeatherSummary(parsed);

  // 4. Update cache
  await setCachedWeather(lat, lon, summary);

  return summary;
}

/**
 * Multi-location batch fetch (used by route segment weather sampling).
 */
export async function fetchMultiLocationWeather(
  points: Array<{ lat: number; lon: number }>
): Promise<WeatherSummary[]> {
  if (points.length === 0) return [];
  if (points.length === 1) {
    const single = await fetchLocationWeather(points[0].lat, points[0].lon);
    return [single];
  }

  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);

  const url = buildForecastUrl(lats, lons);
  const response = await fetchWithRetry(url);
  const json = await response.json();

  if (Array.isArray(json)) {
    return json.map((item) => {
      const parsed = openMeteoResponseSchema.parse(item);
      return parseWeatherSummary(parsed);
    });
  }

  // If Open-Meteo returned a single object despite multiple coordinates
  const single = openMeteoResponseSchema.parse(json);
  return [parseWeatherSummary(single)];
}
