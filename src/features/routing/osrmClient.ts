import type { LineString } from 'geojson';
import type { RouteMode, RouteOption, RoutingResult, RouteStep } from './types';

const OSRM_BASE_URL = 'https://routing.openstreetmap.de';
const TIMEOUT_MS = 8000;

/**
 * Format meters to km or m.
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format seconds to hours and minutes.
 */
export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMins} min`;
}

/**
 * Generate human-readable instruction from step maneuver if missing.
 */
export function formatManeuverInstruction(step: RouteStep): string {
  if (step.instruction) return step.instruction;

  const type = step.maneuver.type;
  const modifier = step.maneuver.modifier;
  const roadName = step.name ? ` onto ${step.name}` : '';

  switch (type) {
    case 'depart':
      return `Head ${modifier || 'forward'}${roadName}`;
    case 'arrive':
      return 'Arrive at your destination';
    case 'turn':
      return `Turn ${modifier || 'left'}${roadName}`;
    case 'continue':
      return `Continue${modifier ? ` ${modifier}` : ''}${roadName}`;
    case 'new name':
      return `Continue${roadName}`;
    case 'end of road':
      return `Turn ${modifier || 'left'} at the end of the road${roadName}`;
    case 'fork':
      return `Take the ${modifier || 'left'} fork${roadName}`;
    case 'roundabout':
      return `Enter roundabout and take exit${roadName}`;
    default:
      return `${type.charAt(0).toUpperCase() + type.slice(1)}${modifier ? ` ${modifier}` : ''}${roadName}`;
  }
}

/**
 * Builds the OSRM endpoint URL based on travel mode.
 */
export function buildOsrmUrl(
  fromLon: number,
  fromLat: number,
  toLon: number,
  toLat: number,
  mode: RouteMode
): string {
  // Use exact routed-car / routed-foot path prefixes per Doc 03 section 4
  const prefix = mode === 'walk' ? 'routed-foot/route/v1/foot' : 'routed-car/route/v1/driving';
  const coords = `${fromLon.toFixed(6)},${fromLat.toFixed(6)};${toLon.toFixed(6)},${toLat.toFixed(6)}`;

  return `${OSRM_BASE_URL}/${prefix}/${coords}?alternatives=true&overview=full&geometries=geojson&steps=true`;
}

/**
 * Fetch with 8 s timeout.
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

interface OsrmStep {
  name?: string;
  distance: number;
  duration: number;
  instruction?: string;
  maneuver?: {
    type?: string;
    modifier?: string;
    location?: [number, number];
  };
}

interface OsrmLeg {
  distance: number;
  duration: number;
  summary?: string;
  steps?: OsrmStep[];
}

interface OsrmRawRoute {
  distance: number;
  duration: number;
  geometry: LineString;
  legs?: OsrmLeg[];
}

/**
 * Fetch routes from OSRM with 8 s timeout and 1 automatic retry.
 */
export async function fetchOsrmRoutes(
  fromCoords: [number, number], // [lon, lat]
  toCoords: [number, number], // [lon, lat]
  mode: RouteMode = 'drive'
): Promise<RoutingResult> {
  const url = buildOsrmUrl(fromCoords[0], fromCoords[1], toCoords[0], toCoords[1], mode);

  let response: Response;
  try {
    response = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        throw new Error('Routing service is temporarily busy. Please retry shortly.');
      }
      throw new Error(`Routing request failed with HTTP ${response.status}`);
    }
  } catch (firstErr: unknown) {
    // Retry once
    try {
      response = await fetchWithTimeout(url, TIMEOUT_MS);
      if (!response.ok) {
        throw new Error(`Routing request failed with HTTP ${response.status}`);
      }
    } catch {
      const err = firstErr as Error;
      if (err.name === 'AbortError') {
        throw new Error(
          'Route calculation timed out (8 s). The points may be too far apart or network is slow.'
        );
      }
      throw new Error(err.message || 'Failed to connect to the routing service. Please retry.');
    }
  }

  const json = await response.json();

  if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) {
    if (json.code === 'NoRoute') {
      throw new Error('No navigable route found between these locations for the selected mode.');
    }
    throw new Error(json.message || 'No route could be found for these locations.');
  }

  const routes: RouteOption[] = (json.routes as OsrmRawRoute[]).map((rawRoute, idx) => {
    const legs = (rawRoute.legs || []).map((leg) => ({
      distance: leg.distance,
      duration: leg.duration,
      summary: leg.summary,
      steps: (leg.steps || []).map((step) => ({
        name: step.name || '',
        distance: step.distance,
        duration: step.duration,
        instruction: step.maneuver ? formatManeuverInstruction(step as RouteStep) : '',
        maneuver: {
          type: step.maneuver?.type || 'turn',
          modifier: step.maneuver?.modifier,
          location: step.maneuver?.location || [0, 0],
        },
      })),
    }));

    const isPrimary = idx === 0;
    const name = rawRoute.legs?.[0]?.summary
      ? `Via ${rawRoute.legs[0].summary}`
      : isPrimary
        ? 'Primary Route'
        : `Alternative ${idx}`;

    return {
      id: `route-${idx}`,
      name,
      distanceMeters: rawRoute.distance,
      durationSeconds: rawRoute.duration,
      geometry: rawRoute.geometry,
      legs,
      isRecommended: isPrimary,
    };
  });

  return {
    routes,
    waypoints: json.waypoints || [],
  };
}
