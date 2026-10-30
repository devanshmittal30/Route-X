import { fetchLocationWeather } from '../weather/openMeteoClient';
import { fetchNearbyEarthquakes } from '../quakes/usgsClient';
import { supabase } from '../../lib/supabase';
import type { RouteXAlert } from './types';
import type { SavedRoute } from '../routing/savedRoutesService';
import { scoreFullRoute } from '../risk/dataAdapters';
import { levelFor } from '../risk';

/**
 * Parses point coordinates from PostGIS GeoJSON or EWKT.
 */
function parseCoords(geom: unknown): [number, number] | null {
  if (!geom) return null;
  if (typeof geom === 'object' && 'coordinates' in (geom as { coordinates?: unknown })) {
    const coords = (geom as { coordinates: [number, number] }).coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      return [coords[0], coords[1]];
    }
  }
  if (typeof geom === 'string') {
    const match = geom.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      return [parseFloat(match[1]), parseFloat(match[2])];
    }
  }
  return null;
}

/**
 * Fetches real-time disaster, weather, and seismic alerts for a single location.
 * Implements Doc 03 section 6.4 formulas and IMD criteria.
 */
export async function fetchCurrentLocationAlerts(
  coords: [number, number], // [lng, lat]
  locationName: string,
  demoMode: boolean = false
): Promise<RouteXAlert[]> {
  const [lng, lat] = coords;
  const alerts: RouteXAlert[] = [];
  const nowIso = new Date().toISOString();

  // 1. Weather alerts from Open-Meteo
  try {
    const weather = await fetchLocationWeather(lat, lng);
    if (weather) {
      const rain24h = weather.precipitation24hMm || 0;
      const snowfall = weather.snowfallCm || 0;
      const windGusts = weather.windGustsKmh || 0;

      // IMD Rain Categories
      if (rain24h > 204.4) {
        alerts.push({
          id: `weather-rain-crit-${lat.toFixed(2)}-${lng.toFixed(2)}`,
          category: 'weather',
          severity: 'critical',
          title: 'Extremely Heavy Rainfall Warning',
          description: `IMD alert: ${rain24h.toFixed(1)} mm rainfall expected in next 24 h. Severe flash flood and slope failure risk.`,
          source: 'IMD / Open-Meteo',
          timestamp: 'Live forecast',
          targetType: 'current_location',
          targetLabel: locationName,
          metadata: { rainAccumMm: rain24h },
        });
      } else if (rain24h >= 115.6) {
        alerts.push({
          id: `weather-rain-sev-${lat.toFixed(2)}-${lng.toFixed(2)}`,
          category: 'weather',
          severity: 'severe',
          title: 'Very Heavy Rainfall Warning',
          description: `IMD alert: ${rain24h.toFixed(1)} mm rainfall expected in next 24 h. High landslide vulnerability in valleys.`,
          source: 'IMD / Open-Meteo',
          timestamp: 'Live forecast',
          targetType: 'current_location',
          targetLabel: locationName,
          metadata: { rainAccumMm: rain24h },
        });
      } else if (rain24h >= 64.5) {
        alerts.push({
          id: `weather-rain-high-${lat.toFixed(2)}-${lng.toFixed(2)}`,
          category: 'weather',
          severity: 'high',
          title: 'Heavy Rainfall Advisory',
          description: `IMD alert: ${rain24h.toFixed(1)} mm rainfall forecast in 24 h. Watch for water accumulation on roads.`,
          source: 'IMD / Open-Meteo',
          timestamp: 'Live forecast',
          targetType: 'current_location',
          targetLabel: locationName,
          metadata: { rainAccumMm: rain24h },
        });
      }

      // Wind gusts >= 50 km/h
      if (windGusts >= 50) {
        alerts.push({
          id: `weather-wind-${lat.toFixed(2)}-${lng.toFixed(2)}`,
          category: 'weather',
          severity: windGusts >= 75 ? 'severe' : 'moderate',
          title: `Strong Wind Gusts (${Math.round(windGusts)} km/h)`,
          description: `Peak wind gusts of ${Math.round(windGusts)} km/h forecast. Risk of fallen trees and flying debris on exposed mountain passes.`,
          source: 'Open-Meteo Forecast',
          timestamp: 'Live forecast',
          targetType: 'current_location',
          targetLabel: locationName,
        });
      }

      // Snowfall >= 5 cm
      if (snowfall >= 5) {
        alerts.push({
          id: `weather-snow-${lat.toFixed(2)}-${lng.toFixed(2)}`,
          category: 'weather',
          severity: 'high',
          title: `High Mountain Snowfall (${snowfall.toFixed(1)} cm)`,
          description: `${snowfall.toFixed(1)} cm snowfall accumulation expected. High-altitude passes may experience severe icing and closure.`,
          source: 'Open-Meteo Forecast',
          timestamp: 'Live forecast',
          targetType: 'current_location',
          targetLabel: locationName,
        });
      }
    }
  } catch (err) {
    console.warn('[alertsService] Weather fetch failed:', err);
  }

  // 2. Earthquakes from USGS (M4.5+ within 300 km in 72h)
  try {
    const quakes = await fetchNearbyEarthquakes(lat, lng);
    if (quakes?.events) {
      for (const q of quakes.events) {
        const dist = q.distanceKm ?? 0;
        if (dist <= 300) {
          alerts.push({
            id: `quake-${q.id}`,
            category: 'quake',
            severity: q.magnitude >= 5.5 || dist < 80 ? 'critical' : 'high',
            title: `M${q.magnitude.toFixed(1)} Earthquake (${Math.round(dist)} km away)`,
            description: `${q.place} at focal depth. Heightened rockfall and slope instability along steep corridors.`,
            source: 'USGS Earthquake Program',
            timestamp: q.timeAgo || 'Recently',
            targetType: 'current_location',
            targetLabel: locationName,
            metadata: { magnitude: q.magnitude, coordinates: [q.coordinates[0], q.coordinates[1]] },
          });
        }
      }
    }
  } catch (err) {
    console.warn('[alertsService] Quakes fetch failed:', err);
  }

  // 3. Verified hazard reports within 15 km of current location
  try {
    const { data } = await supabase.rpc('reports_near', {
      lat,
      lng,
      radius_m: 15000,
      include_test: demoMode,
    });

    if (data && Array.isArray(data)) {
      for (const rep of data) {
        if (rep.status === 'verified') {
          const coords = parseCoords(rep.geom);
          alerts.push({
            id: `hazard-report-${rep.id}`,
            category: 'hazard_report',
            severity: rep.type === 'landslide' || rep.type === 'road_blocked' ? 'severe' : 'high',
            title: `Verified ${rep.type.replace('_', ' ').toUpperCase()} Ahead`,
            description: rep.description || `Verified road hazard reported within 15 km of your location.`,
            source: 'Verified Community Report',
            timestamp: new Date(rep.created_at || nowIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            targetType: 'current_location',
            targetLabel: locationName,
            metadata: {
              reportType: rep.type,
              coordinates: coords || undefined,
            },
          });
        }
      }
    }
  } catch (err) {
    console.warn('[alertsService] Reports near query failed:', err);
  }

  return alerts;
}

/**
 * Inspects all saved routes for:
 * 1. Verified hazards within 5 km buffer (reports_along_route RPC)
 * 2. Risk level increased since snapshot
 * 3. Re-scores routes to determine active mountain corridor hazards
 */
export async function fetchSavedRouteAlerts(
  savedRoutes: SavedRoute[],
  demoMode: boolean = false
): Promise<RouteXAlert[]> {
  const alerts: RouteXAlert[] = [];
  const nowIso = new Date().toISOString();

  for (const route of savedRoutes) {
    const routeLabel = `${route.from_label} → ${route.to_label}`;

    // 1. Check verified hazards within 5 km of the saved route line
    try {
      const { data: routeReports } = await supabase.rpc('reports_along_route', {
        route_geojson: JSON.stringify(route.geometry),
        buffer_m: 5000,
        include_test: demoMode,
      });

      if (routeReports && Array.isArray(routeReports)) {
        for (const r of routeReports) {
          if (r.status === 'verified') {
            const isBlockedOrLandslide = r.type === 'road_blocked' || r.type === 'landslide';
            alerts.push({
              id: `route-hazard-${route.id}-${r.id}`,
              category: 'hazard_report',
              severity: isBlockedOrLandslide ? 'critical' : 'severe',
              title: `${isBlockedOrLandslide ? 'CRITICAL OBSTACLE' : 'HAZARD'} on ${route.to_label} Corridor`,
              description: `Verified ${r.type.replace('_', ' ')} within 5 km of route: "${r.description || 'Road condition warning'}".`,
              source: 'Verified Community Report',
              timestamp: new Date(r.created_at || nowIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              targetType: 'saved_route',
              targetId: route.id,
              targetLabel: routeLabel,
              metadata: {
                reportType: r.type,
                coordinates: parseCoords(r.geom) || undefined,
              },
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[alertsService] reports_along_route failed for route ${route.id}:`, err);
    }

    // 2. Re-score the route live to detect if the risk level has increased
    try {
      const liveRisk = await scoreFullRoute(route.geometry, demoMode);
      const prevLevel = levelFor(route.risk_score || 0);
      const currentLevel = liveRisk.level;

      const levelsOrder = ['Low', 'Moderate', 'High', 'Severe', 'Blocked'];
      const prevIndex = levelsOrder.indexOf(prevLevel);
      const currIndex = levelsOrder.indexOf(currentLevel);

      // Trigger alert if level has increased (e.g. Moderate -> High, or High -> Severe/Blocked)
      if (currIndex > prevIndex && liveRisk.score > (route.risk_score || 0)) {
        alerts.push({
          id: `route-risk-increase-${route.id}-${currentLevel}`,
          category: 'risk_increased',
          severity: currentLevel === 'Blocked' || currentLevel === 'Severe' ? 'critical' : 'high',
          title: `Risk Increased to ${currentLevel} on ${route.to_label} Route`,
          description: `Corridor risk level escalated from ${prevLevel} (${route.risk_score}) to ${currentLevel} (${Math.round(liveRisk.score)}). ${liveRisk.summary || ''}`,
          source: 'RouteX Risk Engine',
          timestamp: 'Just now',
          targetType: 'saved_route',
          targetId: route.id,
          targetLabel: routeLabel,
          metadata: {
            previousScore: route.risk_score,
            newScore: liveRisk.score,
          },
        });
      }
    } catch (err) {
      console.warn(`[alertsService] Live re-scoring failed for route ${route.id}:`, err);
    }
  }

  return alerts;
}
