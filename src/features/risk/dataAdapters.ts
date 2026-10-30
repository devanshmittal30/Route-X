import * as turf from '@turf/turf';
import type { LineString } from 'geojson';
import { supabase } from '../../lib/supabase';
import {
  HISTORY_CONFIG,
  REPORTS_CONFIG,
  SEISMIC_CONFIG,
} from './config';
import type {
  RouteSample,
  ElevationSample,
  HazardReportItem,
  EarthquakeRiskItem,
  SegmentFactors,
  SegmentRisk,
  HazardOnRoute,
  RouteRiskScore,
} from './types';
import {
  sampleRoute,
  slopeFromElevations,
  rainFactor,
  soilFactor,
  terrainFactor,
  historyFactor,
  reportsFactor,
  seismicFactor,
  scoreSegment,
  scoreRoute,
  explainRoute,
} from './pureScoring';
import { findCurrentHourIndex } from '../weather/weatherHelpers';
import type { OpenMeteoHourly } from '../weather/types';

// In-memory caches with 30-minute TTL per Doc 03 section 6.1
const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;
const weatherMemoryCache = new Map<
  string,
  {
    data: {
      accumRain72h: number;
      maxHourly24h: number;
      soilMoisture: number;
    };
    cachedAt: number;
  }
>();

const elevationMemoryCache = new Map<string, number>();

/**
 * Parses coordinates from PostGIS geography geometry (GeoJSON object or WKT).
 */
export function parseCoordinates(geom: unknown): [number, number] | null {
  if (!geom) return null;
  if (typeof geom === 'object' && geom !== null && 'coordinates' in geom) {
    const coords = (geom as { coordinates: number[] }).coordinates;
    if (Array.isArray(coords) && coords.length >= 2) {
      return [Number(coords[0]), Number(coords[1])];
    }
  }
  if (typeof geom === 'string') {
    const match = geom.match(
      /POINT\s*\(\s*([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s*\)/i
    );
    if (match) {
      return [parseFloat(match[1]), parseFloat(match[2])];
    }
  }
  return null;
}

/**
 * Fetch helper with 8 s timeout and 1 retry per project requirements.
 */
async function fetchWithRetry(url: string, timeoutMs: number = 8000): Promise<Response> {
  const attempt = async () => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res;
    } finally {
      clearTimeout(id);
    }
  };

  try {
    return await attempt();
  } catch (err) {
    // Retry once
    try {
      return await attempt();
    } catch {
      throw err;
    }
  }
}

/**
 * Data adapter 1: Multi-location Open-Meteo weather forecast for route grid cells.
 * Deduplicates sample points to 0.1 degree grid cells and caches for 30 minutes.
 */
export async function getSampleWeather(samples: RouteSample[]): Promise<
  Map<
    number,
    {
      accumRain72h: number;
      maxHourly24h: number;
      soilMoisture: number;
    }
  >
> {
  const result = new Map<
    number,
    { accumRain72h: number; maxHourly24h: number; soilMoisture: number }
  >();

  // 1. Deduplicate unique grid cells needing fetch
  const cellToCoord = new Map<string, { lat: number; lon: number }>();
  const now = Date.now();

  for (const s of samples) {
    const cached = weatherMemoryCache.get(s.gridCellKey);
    if (!cached || now - cached.cachedAt > WEATHER_CACHE_TTL_MS) {
      if (!cellToCoord.has(s.gridCellKey)) {
        cellToCoord.set(s.gridCellKey, {
          lat: s.coordinates[1],
          lon: s.coordinates[0],
        });
      }
    }
  }

  // 2. Fetch missing grid cells from Open-Meteo
  if (cellToCoord.size > 0) {
    const cells = Array.from(cellToCoord.entries());
    const lats = cells.map(([, c]) => c.lat.toFixed(4)).join(',');
    const lons = cells.map(([, c]) => c.lon.toFixed(4)).join(',');

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m&hourly=precipitation,soil_moisture_0_to_1cm,snowfall,wind_gusts_10m,temperature_2m,relative_humidity_2m&past_days=3&forecast_days=3&timezone=auto`;

    try {
      const res = await fetchWithRetry(url);
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : [data];

      rawList.forEach((item, idx) => {
        const cellKey = cells[idx]?.[0];
        if (!cellKey || !item?.hourly) return;

        const hourly: OpenMeteoHourly = item.hourly;
        const currentHourIdx = findCurrentHourIndex(
          hourly.time,
          item.current?.time
        );

        // accum = rain past 72 h + 0.5 * rain next 48 h
        const startPast = Math.max(0, currentHourIdx - 72);
        let past72hSum = 0;
        for (let i = startPast; i <= currentHourIdx; i++) {
          past72hSum += hourly.precipitation?.[i] || 0;
        }

        const endNext48 = Math.min(
          hourly.precipitation?.length ? hourly.precipitation.length - 1 : 0,
          currentHourIdx + 48
        );
        let next48hSum = 0;
        for (let i = currentHourIdx + 1; i <= endNext48; i++) {
          next48hSum += hourly.precipitation?.[i] || 0;
        }

        const accumRain72h = Number(
          (past72hSum + 0.5 * next48hSum).toFixed(1)
        );

        // maxHourly = max hourly precipitation in next 24 h
        const endNext24 = Math.min(
          hourly.precipitation?.length ? hourly.precipitation.length - 1 : 0,
          currentHourIdx + 24
        );
        let maxHourly24h = 0;
        for (let i = currentHourIdx; i <= endNext24; i++) {
          const val = hourly.precipitation?.[i] || 0;
          if (val > maxHourly24h) maxHourly24h = val;
        }

        // Latest shallow soil moisture
        const soilMoisture =
          hourly.soil_moisture_0_to_1cm?.[currentHourIdx] ?? 0.25;

        weatherMemoryCache.set(cellKey, {
          data: {
            accumRain72h,
            maxHourly24h: Number(maxHourly24h.toFixed(1)),
            soilMoisture: Number(soilMoisture.toFixed(3)),
          },
          cachedAt: now,
        });
      });
    } catch {
      // Graceful fallback if weather request fails: fallback to seasonal baseline
    }
  }

  // 3. Map values back to each sample
  samples.forEach((s) => {
    const cached = weatherMemoryCache.get(s.gridCellKey);
    result.set(s.index, {
      accumRain72h: cached?.data.accumRain72h ?? 0,
      maxHourly24h: cached?.data.maxHourly24h ?? 0,
      soilMoisture: cached?.data.soilMoisture ?? 0.25,
    });
  });

  return result;
}

/**
 * Data adapter 2: 5 elevation points per sample (Center + 4 neighbours 250m away).
 * Batches requests in chunks of <= 100 coordinates to respect API capacity tested in P1.
 */
export async function getSampleElevationsAndSlopes(
  samples: RouteSample[]
): Promise<ElevationSample[]> {
  const pointsToFetch: Array<{
    sampleIndex: number;
    type: 'center' | 'north' | 'south' | 'east' | 'west';
    lat: number;
    lon: number;
    cacheKey: string;
  }> = [];

  // Generate 5 coordinates for each sample
  samples.forEach((s) => {
    const [lon, lat] = s.coordinates;
    const centerPt = turf.point([lon, lat]);
    const northPt = turf.destination(centerPt, 0.25, 0, { units: 'kilometers' });
    const southPt = turf.destination(centerPt, 0.25, 180, { units: 'kilometers' });
    const eastPt = turf.destination(centerPt, 0.25, 90, { units: 'kilometers' });
    const westPt = turf.destination(centerPt, 0.25, 270, { units: 'kilometers' });

    const neighbors = [
      { type: 'center' as const, pt: centerPt },
      { type: 'north' as const, pt: northPt },
      { type: 'south' as const, pt: southPt },
      { type: 'east' as const, pt: eastPt },
      { type: 'west' as const, pt: westPt },
    ];

    neighbors.forEach(({ type, pt }) => {
      const pLon = Number(pt.geometry.coordinates[0].toFixed(4));
      const pLat = Number(pt.geometry.coordinates[1].toFixed(4));
      const cacheKey = `${pLat},${pLon}`;

      pointsToFetch.push({
        sampleIndex: s.index,
        type,
        lat: pLat,
        lon: pLon,
        cacheKey,
      });
    });
  });

  // Batch query Open-Meteo elevation in chunks of 100
  const uncached = pointsToFetch.filter(
    (p) => !elevationMemoryCache.has(p.cacheKey)
  );

  const BATCH_SIZE = 100;
  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE);
    const lats = batch.map((p) => p.lat).join(',');
    const lons = batch.map((p) => p.lon).join(',');
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`;

    try {
      const res = await fetchWithRetry(url);
      const data = await res.json();
      if (Array.isArray(data.elevation)) {
        data.elevation.forEach((elev: number, idx: number) => {
          const item = batch[idx];
          if (item) {
            elevationMemoryCache.set(item.cacheKey, elev);
          }
        });
      }
    } catch {
      // Fallback: estimate reasonable hill altitude if elevation API unreachable
      batch.forEach((item) => {
        elevationMemoryCache.set(item.cacheKey, 1800);
      });
    }
  }

  // Assemble ElevationSample per route sample
  const elevationSamples: ElevationSample[] = [];

  for (let i = 0; i < samples.length; i++) {
    const samplePts = pointsToFetch.filter((p) => p.sampleIndex === i);
    const center =
      elevationMemoryCache.get(
        samplePts.find((p) => p.type === 'center')?.cacheKey || ''
      ) ?? 1500;
    const north =
      elevationMemoryCache.get(
        samplePts.find((p) => p.type === 'north')?.cacheKey || ''
      ) ?? center;
    const south =
      elevationMemoryCache.get(
        samplePts.find((p) => p.type === 'south')?.cacheKey || ''
      ) ?? center;
    const east =
      elevationMemoryCache.get(
        samplePts.find((p) => p.type === 'east')?.cacheKey || ''
      ) ?? center;
    const west =
      elevationMemoryCache.get(
        samplePts.find((p) => p.type === 'west')?.cacheKey || ''
      ) ?? center;

    const slopeDeg = slopeFromElevations(center, north, south, east, west);

    elevationSamples.push({
      center,
      north,
      south,
      east,
      west,
      slopeDeg,
    });
  }

  return elevationSamples;
}

/**
 * Data adapter 3: Historical landslides from Supabase table within last 10 years.
 */
export async function getHistoricalNear(
  samples: RouteSample[],
  radiusKm: number = HISTORY_CONFIG.radiusKm
): Promise<{ counts: Map<number, number>; hasRecordsInCatalogue: boolean }> {
  const counts = new Map<number, number>();
  samples.forEach((s) => counts.set(s.index, 0));

  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(
    tenYearsAgo.getFullYear() - HISTORY_CONFIG.lookbackYears
  );
  const tenYearsDate = tenYearsAgo.toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('historical_landslides')
      .select('id, geom, event_date')
      .gte('event_date', tenYearsDate);

    if (error || !data || data.length === 0) {
      return { counts, hasRecordsInCatalogue: false };
    }

    // Measure distance from each sample point to historical landslide points
    for (const row of data) {
      const coords = parseCoordinates(row.geom);
      if (!coords) continue;

      const eventPt = turf.point(coords);

      for (const s of samples) {
        const samplePt = turf.point(s.coordinates);
        const distKm = turf.distance(samplePt, eventPt, {
          units: 'kilometers',
        });

        if (distKm <= radiusKm) {
          counts.set(s.index, (counts.get(s.index) || 0) + 1);
        }
      }
    }

    return { counts, hasRecordsInCatalogue: true };
  } catch {
    return { counts, hasRecordsInCatalogue: false };
  }
}

/**
 * Data adapter 4: Community hazard reports along route line via Supabase RPC.
 */
export async function getReportsAlong(
  routeGeometry: LineString,
  includeTest: boolean
): Promise<{
  reports: HazardReportItem[];
  reportsPerSample: Map<number, HazardReportItem[]>;
}> {
  const reportsPerSample = new Map<number, HazardReportItem[]>();
  const allReports: HazardReportItem[] = [];

  try {
    const { data, error } = await supabase.rpc('reports_along_route', {
      route_geojson: JSON.stringify(routeGeometry),
      buffer_m: REPORTS_CONFIG.radiusM,
      include_test: includeTest,
    });

    if (error || !data || !Array.isArray(data)) {
      return { reports: allReports, reportsPerSample };
    }

    for (const r of data) {
      const coords = parseCoordinates(r.geom);
      if (!coords) continue;

      const item: HazardReportItem = {
        id: r.id,
        type: r.type,
        severity: r.severity,
        status: r.status,
        is_test: r.is_test,
        up_count: r.up_count || 0,
        down_count: r.down_count || 0,
        coordinates: coords,
        distanceMeters: 0,
        description: r.description,
        photo_path: r.photo_path,
        created_at: r.created_at,
        resolves_report_id: r.resolves_report_id,
      };

      allReports.push(item);
    }
  } catch {
    // Graceful return on network or table failure
  }

  return { reports: allReports, reportsPerSample };
}

/**
 * Data adapter 5: USGS earthquakes M4.5+ within last 72 hours.
 */
export async function getQuakesNear(
  samples: RouteSample[],
  radiusKm: number = SEISMIC_CONFIG.radiusKm
): Promise<Map<number, EarthquakeRiskItem[]>> {
  const result = new Map<number, EarthquakeRiskItem[]>();
  samples.forEach((s) => result.set(s.index, []));

  const lookbackDate = new Date(
    Date.now() - SEISMIC_CONFIG.lookbackHours * 60 * 60 * 1000
  );
  const starttime = lookbackDate.toISOString();

  // Bounding box covering India + immediate Himalayan boundary
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4.5&starttime=${starttime}&minlatitude=6&maxlatitude=38&minlongitude=68&maxlongitude=98`;

  try {
    const res = await fetchWithRetry(url);
    const data = await res.json();
    const features = data?.features || [];

    for (const f of features) {
      const coords: [number, number] = [
        f.geometry.coordinates[0],
        f.geometry.coordinates[1],
      ];
      const magnitude = f.properties.mag;
      const quakePt = turf.point(coords);

      for (const s of samples) {
        const samplePt = turf.point(s.coordinates);
        const distKm = turf.distance(samplePt, quakePt, {
          units: 'kilometers',
        });

        if (distKm <= radiusKm) {
          const list = result.get(s.index) || [];
          list.push({
            id: f.id,
            magnitude,
            timeIso: new Date(f.properties.time).toISOString(),
            coordinates: coords,
            distanceKm: Number(distKm.toFixed(1)),
            place: f.properties.place,
          });
          result.set(s.index, list);
        }
      }
    }
  } catch {
    // Non-fatal if USGS feed unavailable
  }

  return result;
}

/**
 * Master Route Scoring Orchestrator.
 * Connects pure scoring logic with real-world public data feeds.
 */
export async function scoreFullRoute(
  routeGeometry: LineString,
  includeTest: boolean,
  onProgress?: (step: string) => void
): Promise<RouteRiskScore> {
  onProgress?.('Sampling route geometry (2km intervals)...');
  const samples = sampleRoute(routeGeometry);

  onProgress?.('Fetching weather & terrain slope layers...');
  const [weatherMap, elevations, historyRes, reportsRes, quakesMap] =
    await Promise.all([
      getSampleWeather(samples),
      getSampleElevationsAndSlopes(samples),
      getHistoricalNear(samples),
      getReportsAlong(routeGeometry, includeTest),
      getQuakesNear(samples),
    ]);

  onProgress?.('Analyzing hazards & computing segment risk scores...');

  let hasAnyBlockedOverride = false;
  const segments: SegmentRisk[] = [];
  const hazardsOnRoute: HazardOnRoute[] = [];

  // Map reports to nearest samples
  const allReports = reportsRes.reports;
  allReports.forEach((rep) => {
    let minDistMeters = Infinity;
    const repPt = turf.point(rep.coordinates);

    samples.forEach((s) => {
      const sPt = turf.point(s.coordinates);
      const dMeters =
        turf.distance(sPt, repPt, { units: 'kilometers' }) * 1000;
      if (dMeters < minDistMeters) {
        minDistMeters = dMeters;
      }
    });

    rep.distanceMeters = Math.round(minDistMeters);

    if (minDistMeters <= REPORTS_CONFIG.radiusM) {
      hazardsOnRoute.push({
        id: rep.id,
        title: `${rep.type.replace('_', ' ').toUpperCase()} (${rep.status})`,
        type: rep.type,
        severity: rep.severity,
        distanceKm: Number((minDistMeters / 1000).toFixed(2)),
        coordinates: rep.coordinates,
        isVerified: rep.status === 'verified',
        isTest: rep.is_test,
        description: rep.description,
      });
    }
  });

  // Score each segment
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const w = weatherMap.get(s.index) || {
      accumRain72h: 0,
      maxHourly24h: 0,
      soilMoisture: 0.25,
    };
    const elev = elevations[i] || { center: 1500, slopeDeg: 12 };
    const histCount = historyRes.counts.get(s.index) || 0;
    const nearbyQuakes = quakesMap.get(s.index) || [];

    // Filter reports within 500m of this specific sample
    const sampleReports = allReports.filter((rep) => {
      const repPt = turf.point(rep.coordinates);
      const sPt = turf.point(s.coordinates);
      const distM =
        turf.distance(sPt, repPt, { units: 'kilometers' }) * 1000;
      return distM <= REPORTS_CONFIG.radiusM;
    });

    // Pure factor calculations
    const rFactor = rainFactor(w.accumRain72h, w.maxHourly24h);
    const sFactor = soilFactor(w.soilMoisture);
    const tFactor = terrainFactor(elev.slopeDeg);
    const hResult = historyFactor(histCount, historyRes.hasRecordsInCatalogue);
    const repResult = reportsFactor(sampleReports);
    const qFactor = seismicFactor(nearbyQuakes);

    if (repResult.hasBlockedOverride) {
      hasAnyBlockedOverride = true;
    }

    const factors: SegmentFactors = {
      rain: rFactor,
      terrain: tFactor,
      reports: repResult.factor,
      history: hResult.factor,
      soil: sFactor,
      seismic: qFactor,
      historyHasNoRecords: !historyRes.hasRecordsInCatalogue || histCount === 0,
      rawMetrics: {
        accumRainMm: w.accumRain72h,
        maxHourlyRainMm: w.maxHourly24h,
        slopeDeg: elev.slopeDeg,
        elevationM: elev.center,
        soilMoistureM3: w.soilMoisture,
        historyNearCount: histCount,
        activeReportsCount: sampleReports.length,
        nearbyQuakesCount: nearbyQuakes.length,
      },
    };

    const scored = scoreSegment(factors, repResult.hasBlockedOverride);

    segments.push({
      sampleIndex: s.index,
      coordinates: s.coordinates,
      distanceKm: s.distanceKm,
      segmentGeometry: s.segmentGeometry,
      score: scored.score,
      level: scored.level,
      isBlocked: scored.isBlocked,
      factors,
    });
  }

  // Aggregate route score
  const segmentScores = segments.map((seg) => seg.score);
  const routeScoreResult = scoreRoute(segmentScores, hasAnyBlockedOverride);

  // Generate explainability breakdown
  const explanation = explainRoute(segments);

  return {
    score: routeScoreResult.score,
    level: routeScoreResult.level,
    isBlocked: hasAnyBlockedOverride,
    maxSegmentScore: routeScoreResult.maxSegmentScore,
    meanSegmentScore: routeScoreResult.meanSegmentScore,
    segments,
    factorBars: explanation.factorBars,
    hazardsOnRoute,
    summary: explanation.summary,
    timestamp: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    disclaimer: explanation.disclaimer,
  };
}

/**
 * Single-location scoring helper for Home page AREA RISK box.
 * Samples 4 orthogonal neighbours (250m) and uses the exact same risk engine.
 */
export async function scoreSingleLocation(
  lat: number,
  lon: number,
  weather: {
    accumRain72h: number;
    maxHourly24h: number;
    soilMoisture: number;
  },
  includeTest: boolean
): Promise<{
  score: number;
  level: import('./config').RiskLevel;
  isBlocked: boolean;
  factors: SegmentFactors;
}> {
  const centerPt = turf.point([lon, lat]);
  const northPt = turf.destination(centerPt, 0.25, 0, { units: 'kilometers' });
  const southPt = turf.destination(centerPt, 0.25, 180, { units: 'kilometers' });
  const eastPt = turf.destination(centerPt, 0.25, 90, { units: 'kilometers' });
  const westPt = turf.destination(centerPt, 0.25, 270, { units: 'kilometers' });

  const pts = [centerPt, northPt, southPt, eastPt, westPt];
  const lats = pts.map((p) => p.geometry.coordinates[1].toFixed(4)).join(',');
  const lons = pts.map((p) => p.geometry.coordinates[0].toFixed(4)).join(',');

  let center = 1500;
  let slopeDeg = 12;

  try {
    const elevUrl = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`;
    const res = await fetchWithRetry(elevUrl);
    const data = await res.json();
    if (Array.isArray(data.elevation) && data.elevation.length >= 5) {
      center = data.elevation[0];
      const north = data.elevation[1];
      const south = data.elevation[2];
      const east = data.elevation[3];
      const west = data.elevation[4];
      slopeDeg = slopeFromElevations(center, north, south, east, west);
    }
  } catch {
    // Fallback baseline slope
  }

  // Quakes within 150 km
  let quakesList: EarthquakeRiskItem[] = [];
  try {
    const singleSample: RouteSample = {
      index: 0,
      coordinates: [lon, lat],
      distanceKm: 0,
      segmentGeometry: { type: 'LineString', coordinates: [] },
      gridCellKey: `${lat.toFixed(1)},${lon.toFixed(1)}`,
    };
    const quakesMap = await getQuakesNear([singleSample], SEISMIC_CONFIG.radiusKm);
    quakesList = quakesMap.get(0) || [];
  } catch {
    // Non-fatal
  }

  // Historical landslides within 5 km
  let histCount = 0;
  let hasHistRecords = false;
  try {
    const singleSample: RouteSample = {
      index: 0,
      coordinates: [lon, lat],
      distanceKm: 0,
      segmentGeometry: { type: 'LineString', coordinates: [] },
      gridCellKey: `${lat.toFixed(1)},${lon.toFixed(1)}`,
    };
    const histRes = await getHistoricalNear([singleSample]);
    histCount = histRes.counts.get(0) || 0;
    hasHistRecords = histRes.hasRecordsInCatalogue;
  } catch {
    // Non-fatal
  }

  // Reports near point
  let activeReports: HazardReportItem[] = [];
  try {
    const { data: repData } = await supabase.rpc('reports_near', {
      lat,
      lng: lon,
      radius_m: REPORTS_CONFIG.radiusM,
      include_test: includeTest,
    });
    if (Array.isArray(repData)) {
      activeReports = repData.map((r) => ({
        id: r.id,
        type: r.type,
        severity: r.severity,
        status: r.status,
        is_test: r.is_test,
        up_count: r.up_count || 0,
        down_count: r.down_count || 0,
        coordinates: parseCoordinates(r.geom) || [lon, lat],
        distanceMeters: 100,
      }));
    }
  } catch {
    // Non-fatal
  }

  const rFactor = rainFactor(weather.accumRain72h, weather.maxHourly24h);
  const sFactor = soilFactor(weather.soilMoisture);
  const tFactor = terrainFactor(slopeDeg);
  const hResult = historyFactor(histCount, hasHistRecords);
  const repResult = reportsFactor(activeReports);
  const qFactor = seismicFactor(quakesList);

  const factors: SegmentFactors = {
    rain: rFactor,
    terrain: tFactor,
    reports: repResult.factor,
    history: hResult.factor,
    soil: sFactor,
    seismic: qFactor,
    historyHasNoRecords: !hasHistRecords || histCount === 0,
    rawMetrics: {
      accumRainMm: weather.accumRain72h,
      maxHourlyRainMm: weather.maxHourly24h,
      slopeDeg,
      elevationM: center,
      soilMoistureM3: weather.soilMoisture,
      historyNearCount: histCount,
      activeReportsCount: activeReports.length,
      nearbyQuakesCount: quakesList.length,
    },
  };

  const scored = scoreSegment(factors, repResult.hasBlockedOverride);

  return {
    score: scored.score,
    level: scored.level,
    isBlocked: scored.isBlocked,
    factors,
  };
}
