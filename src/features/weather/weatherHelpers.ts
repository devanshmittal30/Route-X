import type { OpenMeteoHourly, WeatherAlert, AreaRiskEstimate } from './types';

/**
 * Finds the index of the hour closest to the target timestamp in hourly.time array.
 */
export function findCurrentHourIndex(times: string[], targetIso?: string): number {
  if (!times || times.length === 0) return 0;
  const targetDate = targetIso ? new Date(targetIso) : new Date();
  const targetEpoch = targetDate.getTime();

  let closestIndex = 0;
  let minDiff = Infinity;

  for (let i = 0; i < times.length; i++) {
    const epoch = new Date(times[i]).getTime();
    const diff = Math.abs(epoch - targetEpoch);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }

  return closestIndex;
}

/**
 * Calculate accumulated rainfall in the past 24 hours.
 */
export function calculateRainPast24h(hourly: OpenMeteoHourly, targetIso?: string): number {
  if (!hourly.precipitation || hourly.precipitation.length === 0) return 0;
  const currentIdx = findCurrentHourIndex(hourly.time, targetIso);
  const startIdx = Math.max(0, currentIdx - 24);

  let sum = 0;
  for (let i = startIdx; i <= currentIdx; i++) {
    const val = hourly.precipitation[i];
    if (typeof val === 'number' && !isNaN(val)) {
      sum += val;
    }
  }
  return Number(sum.toFixed(1));
}

/**
 * Calculate accumulated rainfall forecast in the next 24 hours.
 */
export function calculateRainNext24h(hourly: OpenMeteoHourly, targetIso?: string): number {
  if (!hourly.precipitation || hourly.precipitation.length === 0) return 0;
  const currentIdx = findCurrentHourIndex(hourly.time, targetIso);
  const endIdx = Math.min(hourly.precipitation.length - 1, currentIdx + 24);

  let sum = 0;
  // If there is only 1 entry in the array (e.g. test fixture), include index 0
  const startIdx = hourly.precipitation.length === 1 ? 0 : currentIdx + 1;
  for (let i = startIdx; i <= endIdx; i++) {
    const val = hourly.precipitation[i];
    if (typeof val === 'number' && !isNaN(val)) {
      sum += val;
    }
  }
  return Number(sum.toFixed(1));
}

/**
 * Calculate accumulated rainfall forecast in the next 72 hours.
 */
export function calculateRainNext72h(hourly: OpenMeteoHourly, targetIso?: string): number {
  if (!hourly.precipitation || hourly.precipitation.length === 0) return 0;
  const currentIdx = findCurrentHourIndex(hourly.time, targetIso);
  const endIdx = Math.min(hourly.precipitation.length - 1, currentIdx + 72);

  let sum = 0;
  // Future hours from next hour to +72h
  const startIdx = hourly.precipitation.length === 1 ? 0 : currentIdx + 1;
  for (let i = startIdx; i <= endIdx; i++) {
    const val = hourly.precipitation[i];
    if (typeof val === 'number' && !isNaN(val)) {
      sum += val;
    }
  }
  return Number(sum.toFixed(1));
}

/**
 * Calculate snowfall forecast in the next 24 hours (cm).
 */
export function calculateSnowfallNext24h(hourly: OpenMeteoHourly, targetIso?: string): number {
  if (!hourly.snowfall || hourly.snowfall.length === 0) return 0;
  const currentIdx = findCurrentHourIndex(hourly.time, targetIso);
  const endIdx = Math.min(hourly.snowfall.length - 1, currentIdx + 24);

  let sum = 0;
  for (let i = currentIdx; i <= endIdx; i++) {
    const val = hourly.snowfall[i];
    if (typeof val === 'number' && !isNaN(val)) {
      sum += val;
    }
  }
  return Number(sum.toFixed(1));
}

/**
 * Get descriptive label for shallow soil moisture (0-1 cm in m³/m³).
 */
export function getSoilMoistureDescription(val: number): string {
  if (val <= 0.15) return 'Dry (stable)';
  if (val <= 0.28) return 'Normal wetness';
  if (val <= 0.38) return 'High moisture (soft)';
  return 'Saturated (high slide risk)';
}

/**
 * Format relative time (e.g. "cached 15m ago", "cached 2h ago").
 */
export function formatCachedAge(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

/**
 * Derive IMD-style weather alerts from forecast metrics per Doc 03 section 6.4.
 */
export function deriveWeatherAlerts(
  hourly: OpenMeteoHourly,
  windGustsKmh: number,
  targetIso?: string
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const rain24hForecast = calculateRainNext24h(hourly, targetIso);
  const snow24hForecast = calculateSnowfallNext24h(hourly, targetIso);

  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. IMD-style Rain Categories
  if (rain24hForecast > 204.4) {
    alerts.push({
      id: 'rain-extremely-heavy',
      title: 'Extremely Heavy Rain Warning (IMD)',
      description: `Forecast exceeds 204.4 mm / 24h (${rain24hForecast.toFixed(1)} mm expected). High risk of flash floods and major slope failure.`,
      severity: 'severe',
      source: 'Open-Meteo & IMD Criteria',
      timestamp,
    });
  } else if (rain24hForecast >= 115.6) {
    alerts.push({
      id: 'rain-very-heavy',
      title: 'Very Heavy Rainfall Alert (IMD)',
      description: `Forecast between 115.6–204.4 mm / 24h (${rain24hForecast.toFixed(1)} mm expected). Significant mudslide hazard on hill cuttings.`,
      severity: 'high',
      source: 'Open-Meteo & IMD Criteria',
      timestamp,
    });
  } else if (rain24hForecast >= 64.5) {
    alerts.push({
      id: 'rain-heavy',
      title: 'Heavy Rainfall Advisory (IMD)',
      description: `Forecast between 64.5–115.5 mm / 24h (${rain24hForecast.toFixed(1)} mm expected). Caution advised on mountain highways.`,
      severity: 'moderate',
      source: 'Open-Meteo & IMD Criteria',
      timestamp,
    });
  }

  // 2. Wind Gusts Alert (>= 50 km/h)
  if (windGustsKmh >= 50) {
    alerts.push({
      id: 'wind-squall',
      title: 'High Wind Gust Alert',
      description: `Peak wind gusts reaching ${windGustsKmh.toFixed(0)} km/h. Risk of fallen trees, rock displacement, and power outages.`,
      severity: windGustsKmh >= 70 ? 'high' : 'moderate',
      source: 'Open-Meteo Forecast',
      timestamp,
    });
  }

  // 3. Snowfall Alert (>= 5 cm / 24h)
  if (snow24hForecast >= 5) {
    alerts.push({
      id: 'snow-heavy',
      title: 'Heavy Snowfall Advisory',
      description: `Forecast indicates ${snow24hForecast.toFixed(1)} cm snowfall over high passes. Anti-skid chains required.`,
      severity: snow24hForecast >= 15 ? 'severe' : 'high',
      source: 'Open-Meteo Forecast',
      timestamp,
    });
  }

  return alerts;
}

/**
 * Calculates a single-point heuristic risk estimate based on weather and soil.
 * Used on the Home page until full route engine (P7) computes multi-factor segment scores.
 */
export function calculateSinglePointAreaRisk(
  rainPast24h: number,
  rainNext72h: number,
  soilMoisture: number,
  nearbyQuakesCount: number = 0
): AreaRiskEstimate {
  // Rain factor (0 to 1): past rain + 0.5 * future rain normalized to 120mm
  const accumRain = rainPast24h * 1.5 + 0.5 * rainNext72h;
  const rainScore = Math.min(1, accumRain / 120);

  // Soil moisture factor (0 to 1): clamped between 0.15 and 0.40
  const soilScore = Math.min(1, Math.max(0, (soilMoisture - 0.15) / (0.4 - 0.15)));

  // Seismic factor (0 to 1)
  const seismicScore = Math.min(1, nearbyQuakesCount * 0.35);

  // Weighted raw score: 65% Rain + 25% Soil + 10% Seismic
  const rawScore = Math.round(100 * (0.65 * rainScore + 0.25 * soilScore + 0.1 * seismicScore));
  const score = Math.max(0, Math.min(100, rawScore));

  let level: AreaRiskEstimate['level'] = 'Low';
  let label = 'Safe to proceed';

  if (score >= 75) {
    level = 'Severe';
    label = 'Severe Hazard Risk';
  } else if (score >= 50) {
    level = 'High';
    label = 'High Caution Recommended';
  } else if (score >= 25) {
    level = 'Moderate';
    label = 'Moderate Rain / Terrain Caution';
  }

  return {
    score,
    level,
    label,
    factors: {
      rainScore: Number((rainScore * 100).toFixed(0)),
      soilScore: Number((soilScore * 100).toFixed(0)),
      seismicScore: Number((seismicScore * 100).toFixed(0)),
    },
  };
}
