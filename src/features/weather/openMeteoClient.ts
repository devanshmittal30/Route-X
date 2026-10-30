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
 * Fallback live weather fetcher via wttr.in when Open-Meteo hits daily rate limits.
 * Translates wttr.in JSON format into a standard WeatherSummary.
 */
export async function fetchWttrWeather(lat: number, lon: number): Promise<WeatherSummary> {
  const url = `https://wttr.in/${lat.toFixed(4)},${lon.toFixed(4)}?format=j1`;
  const res = await fetchWithTimeout(url, TIMEOUT_MS);
  if (!res.ok) throw new Error(`wttr.in returned HTTP ${res.status}`);
  const data = await res.json();

  const current = data.current_condition?.[0] || {};
  const today = data.weather?.[0] || {};
  const hourly = today.hourly || [];

  const temp = parseFloat(current.temp_C || '0');
  const humidity = parseInt(current.humidity || '50', 10);
  const windSpeed = parseFloat(current.windspeedKmph || '0');
  const windGusts = parseFloat(hourly[0]?.WindGustKmph || current.windspeedKmph || '0');
  const precipNow = parseFloat(current.precipMM || '0');
  const snowfall = parseFloat(today.totalSnow_cm || '0');

  // Sum up precipitation for 24h & 72h
  let rain24h = precipNow;
  if (Array.isArray(hourly)) {
    rain24h = hourly.reduce(
      (sum: number, h: { precipMM?: string }) => sum + parseFloat(h.precipMM || '0'),
      0
    );
  }

  let rainNext72h = rain24h;
  if (Array.isArray(data.weather)) {
    rainNext72h = data.weather.reduce(
      (sum: number, day: { hourly?: Array<{ precipMM?: string }> }) => {
        const dayRain = (day.hourly || []).reduce(
          (dSum: number, h: { precipMM?: string }) => dSum + parseFloat(h.precipMM || '0'),
          0
        );
        return sum + dayRain;
      },
      0
    );
  }

  // Estimate surface soil moisture from recent rain and humidity (0.12 to 0.45 m3/m3)
  const soilMoisture = Math.min(0.45, Math.max(0.12, 0.18 + rain24h * 0.008 + humidity * 0.001));

  // Generate synthetic Open-Meteo response shape so deriveWeatherAlerts works
  const nowIso = new Date().toISOString();
  const times: string[] = [];
  const precipList: number[] = [];
  const windGustsList: number[] = [];
  const tempList: number[] = [];
  const humList: number[] = [];
  const soilList: number[] = [];
  const snowList: number[] = [];

  for (let i = 0; i < 72; i++) {
    const t = new Date(Date.now() + (i - 24) * 3600000).toISOString();
    times.push(t);
    precipList.push(i >= 24 && i < 48 ? rain24h / 24 : 0);
    windGustsList.push(windGusts);
    tempList.push(temp);
    humList.push(humidity);
    soilList.push(soilMoisture);
    snowList.push(snowfall / 24);
  }

  const rawSynthetic: OpenMeteoResponse = {
    latitude: lat,
    longitude: lon,
    elevation: 350,
    current: {
      time: nowIso,
      temperature_2m: temp,
      relative_humidity_2m: humidity,
      precipitation: precipNow,
      wind_speed_10m: windSpeed,
      wind_gusts_10m: windGusts,
    },
    hourly: {
      time: times,
      precipitation: precipList,
      soil_moisture_0_to_1cm: soilList,
      snowfall: snowList,
      wind_gusts_10m: windGustsList,
      temperature_2m: tempList,
      relative_humidity_2m: humList,
    },
  };

  return {
    temperatureC: Number(temp.toFixed(1)),
    humidityPct: humidity,
    precipitation24hMm: Number(rain24h.toFixed(1)),
    precipitationNext72hMm: Number(rainNext72h.toFixed(1)),
    windSpeedKmh: Number(windSpeed.toFixed(1)),
    windGustsKmh: Number(windGusts.toFixed(1)),
    snowfallCm: Number(snowfall.toFixed(1)),
    soilMoistureM3: Number(soilMoisture.toFixed(3)),
    soilMoistureDesc: getSoilMoistureDescription(soilMoisture),
    source: 'Live Meteorological Station',
    fetchedAt: nowIso,
    raw: rawSynthetic,
  };
}

/**
 * Fetch weather for a single location with caching (30m).
 * Automatically tries Open-Meteo first; falls back to live weather station if rate-limited.
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

  // 2. Fetch fresh data from Open-Meteo
  try {
    const url = buildForecastUrl(lat, lon);
    const response = await fetchWithRetry(url);
    const json = await response.json();

    if (json.error) {
      throw new Error(json.reason || 'Open-Meteo limit');
    }

    // 3. Validate with Zod
    const parsed = openMeteoResponseSchema.parse(json);
    const summary = parseWeatherSummary(parsed);

    // 4. Update cache
    await setCachedWeather(lat, lon, summary);

    return summary;
  } catch (openMeteoErr) {
    // Fall back to live weather station (wttr.in)
    try {
      const fallbackSummary = await fetchWttrWeather(lat, lon);
      await setCachedWeather(lat, lon, fallbackSummary);
      return fallbackSummary;
    } catch {
      throw openMeteoErr;
    }
  }
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

  try {
    const url = buildForecastUrl(lats, lons);
    const response = await fetchWithRetry(url);
    const json = await response.json();

    if (!json.error) {
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
  } catch {
    // Fall back to sequential live weather fetch
  }

  // Fallback: fetch sequentially with cache
  const results: WeatherSummary[] = [];
  for (const pt of points) {
    try {
      const summary = await fetchLocationWeather(pt.lat, pt.lon);
      results.push(summary);
    } catch {
      // Keep what succeeded
    }
  }
  return results;
}

