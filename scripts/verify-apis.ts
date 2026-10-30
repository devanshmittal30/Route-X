import fs from 'fs';
import path from 'path';

// Helper to read .env.local without external deps
function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        env[key] = val;
      }
    }
  }
  return env;
}

const localEnv = loadEnvLocal();
const ORS_API_KEY = process.env.VITE_ORS_API_KEY || localEnv.VITE_ORS_API_KEY || '';

interface CheckResult {
  api: string;
  endpoint: string;
  status: number | string;
  latencyMs: number;
  success: boolean;
  fieldsOrCount?: string;
  notes: string;
}

const results: CheckResult[] = [];

async function timedFetch(url: string, options?: RequestInit): Promise<{ res: Response; latencyMs: number }> {
  const start = performance.now();
  const res = await fetch(url, options);
  const latencyMs = Math.round(performance.now() - start);
  return { res, latencyMs };
}

// 1. Open-Meteo forecast (Single location & Multi-location)
async function verifyOpenMeteoForecast() {
  console.log('--- 1. Open-Meteo Forecast & Multi-location ---');
  // Single location: Shimla
  const singleUrl =
    'https://api.open-meteo.com/v1/forecast?latitude=31.1048&longitude=77.1734&hourly=precipitation,soil_moisture_0_to_1cm,snowfall,wind_gusts_10m,temperature_2m,relative_humidity_2m&past_days=3&forecast_days=3';

  try {
    const { res, latencyMs } = await timedFetch(singleUrl);
    const data = await res.json();
    const hourlyKeys = data.hourly ? Object.keys(data.hourly) : [];
    const smAccepted = hourlyKeys.includes('soil_moisture_0_to_1cm');
    const smValues = smAccepted ? data.hourly.soil_moisture_0_to_1cm.filter((v: unknown) => v !== null).slice(0, 5) : [];

    console.log(`Open-Meteo Single status: ${res.status}, latency: ${latencyMs}ms`);
    console.log(`Fields present: ${hourlyKeys.join(', ')}`);
    console.log(`soil_moisture_0_to_1cm accepted: ${smAccepted}, sample values: ${JSON.stringify(smValues)}`);

    // Multi-location: Shimla, Guwahati, Manali
    const multiUrl =
      'https://api.open-meteo.com/v1/forecast?latitude=31.1048,26.1445,32.2432&longitude=77.1734,91.7362,77.1892&hourly=precipitation,soil_moisture_0_to_1cm,snowfall,wind_gusts_10m,temperature_2m,relative_humidity_2m&past_days=3&forecast_days=3';
    const multiFetch = await timedFetch(multiUrl);
    const multiData = await multiFetch.res.json();
    const isMultiArray = Array.isArray(multiData);
    console.log(`Open-Meteo Multi status: ${multiFetch.res.status}, latency: ${multiFetch.latencyMs}ms, returns array: ${isMultiArray} (length: ${isMultiArray ? multiData.length : 1})`);

    results.push({
      api: 'Open-Meteo Forecast',
      endpoint: singleUrl,
      status: res.status,
      latencyMs,
      success: res.ok && smAccepted,
      fieldsOrCount: `Hourly fields: ${hourlyKeys.join(', ')}`,
      notes: `soil_moisture_0_to_1cm accepted=${smAccepted} (sample values: ${JSON.stringify(smValues)} m³/m³). Multi-location returned ${isMultiArray ? multiData.length : 'non-'}array in ${multiFetch.latencyMs}ms.`,
    });
  } catch (err: any) {
    console.error('Open-Meteo forecast error:', err.message);
    results.push({
      api: 'Open-Meteo Forecast',
      endpoint: singleUrl,
      status: 'Error',
      latencyMs: 0,
      success: false,
      notes: `Failed: ${err.message}`,
    });
  }
}

// 2. Open-Meteo Elevation (5 points & max coordinates test)
async function verifyOpenMeteoElevation() {
  console.log('\n--- 2. Open-Meteo Elevation ---');
  const fiveLats = [31.1048, 31.11, 31.12, 31.13, 31.14];
  const fiveLons = [77.1734, 77.18, 77.19, 77.2, 77.21];
  const fiveUrl = `https://api.open-meteo.com/v1/elevation?latitude=${fiveLats.join(',')}&longitude=${fiveLons.join(',')}`;

  try {
    const { res, latencyMs } = await timedFetch(fiveUrl);
    const data = await res.json();
    console.log(`Elevation 5 points status: ${res.status}, latency: ${latencyMs}ms, elevation count: ${data.elevation?.length}`);

    // Test max coordinates capacity
    let maxAccepted = 5;
    for (const testCount of [50, 100, 500, 1000]) {
      const lats = Array.from({ length: testCount }, (_, i) => (31.1048 + i * 0.001).toFixed(4)).join(',');
      const lons = Array.from({ length: testCount }, (_, i) => (77.1734 + i * 0.001).toFixed(4)).join(',');
      const testUrl = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`;
      const probe = await timedFetch(testUrl);
      if (probe.res.ok) {
        maxAccepted = testCount;
      } else {
        break;
      }
    }
    console.log(`Max coordinates tested and accepted: >= ${maxAccepted}`);

    results.push({
      api: 'Open-Meteo Elevation',
      endpoint: fiveUrl,
      status: res.status,
      latencyMs,
      success: res.ok,
      fieldsOrCount: `Returned ${data.elevation?.length} elevations`,
      notes: `5 points succeeded. Max tested coordinates accepted per call: >= ${maxAccepted}.`,
    });
  } catch (err: any) {
    console.error('Open-Meteo Elevation error:', err.message);
    results.push({
      api: 'Open-Meteo Elevation',
      endpoint: fiveUrl,
      status: 'Error',
      latencyMs: 0,
      success: false,
      notes: err.message,
    });
  }
}

// 3. Open-Meteo Geocoding
async function verifyOpenMeteoGeocoding() {
  console.log('\n--- 3. Open-Meteo Geocoding ---');
  for (const name of ['Manali', 'Tawang']) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5`;
    try {
      const { res, latencyMs } = await timedFetch(url);
      const data = await res.json();
      const first = data.results?.[0];
      console.log(`Geocoding "${name}" status: ${res.status}, latency: ${latencyMs}ms, found: ${data.results?.length}`);
      if (first) {
        console.log(` -> Match: ${first.name}, ${first.admin1}, ${first.country} (lat: ${first.latitude}, lon: ${first.longitude})`);
      }
      results.push({
        api: `Open-Meteo Geocoding (${name})`,
        endpoint: url,
        status: res.status,
        latencyMs,
        success: res.ok && !!data.results?.length,
        fieldsOrCount: `${data.results?.length || 0} matches`,
        notes: first ? `Top match: ${first.name}, ${first.admin1 || ''}, ${first.country} (${first.latitude}, ${first.longitude})` : 'No results',
      });
    } catch (err: any) {
      console.error(`Geocoding error for ${name}:`, err.message);
    }
  }
}

// 4. OSRM FOSSGIS (routed-car & routed-foot)
async function verifyOSRM() {
  console.log('\n--- 4. OSRM FOSSGIS (Shimla to Manali) ---');
  // Shimla: 77.1734, 31.1048; Manali: 77.1892, 32.2432
  const coords = '77.1734,31.1048;77.1892,32.2432';

  for (const profile of ['routed-car', 'routed-foot']) {
    const mode = profile === 'routed-car' ? 'driving' : 'foot';
    const url = `https://routing.openstreetmap.de/${profile}/route/v1/${mode}/${coords}?alternatives=true&overview=full&geometries=geojson&steps=true`;
    try {
      const { res, latencyMs } = await timedFetch(url);
      const data = await res.json();
      const routesCount = data.routes ? data.routes.length : 0;
      console.log(`OSRM ${profile} status: ${res.status}, latency: ${latencyMs}ms, routes returned: ${routesCount}`);
      results.push({
        api: `OSRM (${profile})`,
        endpoint: url,
        status: res.status,
        latencyMs,
        success: res.ok && routesCount > 0,
        fieldsOrCount: `${routesCount} route(s)`,
        notes: `Returned ${routesCount} route(s). Code: ${data.code}. Distance: ${data.routes?.[0]?.distance ? Math.round(data.routes[0].distance / 1000) + ' km' : 'N/A'}.`,
      });
    } catch (err: any) {
      console.error(`OSRM error for ${profile}:`, err.message);
    }
  }
}

// 5. OpenRouteService Directions
async function verifyOpenRouteService() {
  console.log('\n--- 5. OpenRouteService Directions ---');
  if (!ORS_API_KEY) {
    console.warn('⚠️ VITE_ORS_API_KEY is not set in .env.local or environment. Skipping live ORS call.');
    results.push({
      api: 'OpenRouteService Directions',
      endpoint: 'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      status: 'Skipped',
      latencyMs: 0,
      success: false,
      notes: 'VITE_ORS_API_KEY missing in .env.local. Please create an ORS account and set this key.',
    });
    return;
  }

  for (const profile of ['driving-car', 'foot-hiking']) {
    const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;
    const body = {
      coordinates: [
        [77.1734, 31.1048],
        [77.1892, 32.2432],
      ],
      alternative_routes: { target_count: 2 },
      options: {
        avoid_polygons: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [77.17, 31.5],
                [77.19, 31.5],
                [77.19, 31.52],
                [77.17, 31.52],
                [77.17, 31.5],
              ],
            ],
          ],
        },
      },
    };

    try {
      const { res, latencyMs } = await timedFetch(url, {
        method: 'POST',
        headers: {
          Authorization: ORS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const featuresCount = data.features ? data.features.length : 0;
      console.log(`ORS ${profile} status: ${res.status}, latency: ${latencyMs}ms, features count: ${featuresCount}`);
      results.push({
        api: `OpenRouteService (${profile})`,
        endpoint: url,
        status: res.status,
        latencyMs,
        success: res.ok,
        fieldsOrCount: `${featuresCount} feature(s)`,
        notes: res.ok
          ? `Returned ${featuresCount} route(s) with avoid_polygons.`
          : `Error response: ${data.error?.message || JSON.stringify(data)}`,
      });
    } catch (err: any) {
      console.error(`ORS error for ${profile}:`, err.message);
    }
  }
}

// 6. USGS Earthquakes (last 7 days, M4.5+, India bbox)
async function verifyUSGSEarthquakes() {
  console.log('\n--- 6. USGS Earthquakes ---');
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const starttime = d.toISOString().split('T')[0];
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4.5&starttime=${starttime}&minlatitude=6&maxlatitude=38&minlongitude=68&maxlongitude=98`;

  try {
    const { res, latencyMs } = await timedFetch(url);
    const data = await res.json();
    const count = data.features ? data.features.length : 0;
    console.log(`USGS Earthquakes status: ${res.status}, latency: ${latencyMs}ms, count: ${count}`);
    results.push({
      api: 'USGS Earthquakes (M4.5+, 7 days)',
      endpoint: url,
      status: res.status,
      latencyMs,
      success: res.ok,
      fieldsOrCount: `${count} earthquake(s)`,
      notes: `Found ${count} earthquakes in India bbox in the last 7 days. Sample title: ${data.features?.[0]?.properties?.title || 'None'}.`,
    });
  } catch (err: any) {
    console.error('USGS Earthquakes error:', err.message);
  }
}

// 7. Overpass (hotels/stays near Shimla within 10 km)
async function verifyOverpass() {
  console.log('\n--- 7. Overpass API Stays ---');
  const query = `[out:json][timeout:25];(node["tourism"~"hotel|guest_house|hostel"](around:10000,31.1048,77.1734);way["tourism"~"hotel|guest_house|hostel"](around:10000,31.1048,77.1734););out tags 10;`;

  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
  ];

  let success = false;
  for (const endpoint of mirrors) {
    try {
      const { res, latencyMs } = await timedFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.startsWith('<')) continue;
      const data = JSON.parse(text);
      const count = data.elements ? data.elements.length : 0;
      const sampleTags = data.elements?.[0]?.tags ? Object.keys(data.elements[0].tags) : [];
      console.log(`Overpass (${endpoint}) status: ${res.status}, latency: ${latencyMs}ms, sample count: ${count}`);
      console.log(`Sample tags present: ${sampleTags.join(', ')}`);
      results.push({
        api: 'Overpass OSM Stays',
        endpoint,
        status: res.status,
        latencyMs,
        success: count > 0,
        fieldsOrCount: `${count} stay elements sampled`,
        notes: `Sample tags: ${sampleTags.join(', ')}. Sample name: ${data.elements?.[0]?.tags?.name || 'N/A'}.`,
      });
      success = true;
      break;
    } catch {
      // try next mirror
    }
  }

  if (!success) {
    results.push({
      api: 'Overpass OSM Stays',
      endpoint: mirrors[0],
      status: 'Busy/HTML',
      latencyMs: 0,
      success: false,
      notes: 'Overpass public instances were busy or returned HTML gateway errors. Recommend mirror caching in production.',
    });
  }
}

// 8. NASA Global Landslide Catalog FeatureServer
async function verifyNASALandslides() {
  console.log('\n--- 8. NASA Global Landslide Catalog FeatureServer ---');
  const baseService = 'https://maps.nccs.nasa.gov/server/rest/services/global_landslide_catalog/glc_viewer_service/FeatureServer/0';

  try {
    // Fetch layer metadata and fields
    const metaUrl = `${baseService}?f=json`;
    const { res: metaRes, latencyMs: metaLatency } = await timedFetch(metaUrl);
    const metaData = await metaRes.json();
    const fields = metaData.fields ? metaData.fields.map((f: any) => f.name) : [];

    console.log(`NASA GLC metadata status: ${metaRes.status}, latency: ${metaLatency}ms`);
    console.log(`Available fields (${fields.length}): ${fields.slice(0, 10).join(', ')}...`);

    // Query total count for India
    const indiaCountUrl = `${baseService}/query?where=countryname='India'&returnCountOnly=true&f=json`;
    const { res: cRes } = await timedFetch(indiaCountUrl);
    const cData = await cRes.json();
    const totalIndiaCount = cData.count ?? 0;

    // Check events by year or in the last 10 years (2016 - 2026)
    // Note: event_date in GLC is often an epoch or date field
    const recentUrl = `${baseService}/query?where=countryname='India'+AND+event_date>=timestamp+'2016-01-01+00:00:00'&returnCountOnly=true&f=json`;
    const { res: recRes } = await timedFetch(recentUrl);
    const recData = await recRes.json();
    const recentCount = recData.count ?? 0;

    console.log(`Total NASA GLC events in India: ${totalIndiaCount}`);
    console.log(`Events in India in last 10 years (2016-2026): ${recentCount}`);

    results.push({
      api: 'NASA GLC FeatureServer',
      endpoint: baseService,
      status: metaRes.status,
      latencyMs: metaLatency,
      success: metaRes.ok,
      fieldsOrCount: `Total India: ${totalIndiaCount}, 2016-2026: ${recentCount}`,
      notes: `CRITICAL FINDING: NASA GLC has ${totalIndiaCount} historical events in India, but only ${recentCount} records in the last 10 years (dataset was discontinued around March 2016). Rule 8 requires flagging this to user.`,
    });
  } catch (err: any) {
    console.error('NASA GLC FeatureServer error:', err.message);
    results.push({
      api: 'NASA GLC FeatureServer',
      endpoint: baseService,
      status: 'Error',
      latencyMs: 0,
      success: false,
      notes: `Failed to query: ${err.message}`,
    });
  }
}

// 9. Open-Meteo Flood API
async function verifyOpenMeteoFlood() {
  console.log('\n--- 9. Open-Meteo Flood API ---');
  // Check Shimla and Guwahati
  for (const [place, lat, lon] of [
    ['Shimla', 31.1048, 77.1734],
    ['Guwahati', 26.1445, 91.7362],
  ] as const) {
    const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}&daily=river_discharge`;
    try {
      const { res, latencyMs } = await timedFetch(url);
      const data = await res.json();
      const hasDischarge = !!data.daily?.river_discharge;
      const sampleVals = hasDischarge ? data.daily.river_discharge.filter((v: unknown) => v !== null).slice(0, 3) : [];
      console.log(`Flood API (${place}) status: ${res.status}, latency: ${latencyMs}ms, has river_discharge: ${hasDischarge}`);
      results.push({
        api: `Open-Meteo Flood (${place})`,
        endpoint: url,
        status: res.status,
        latencyMs,
        success: res.ok && hasDischarge,
        fieldsOrCount: hasDischarge ? `river_discharge present (${data.daily.river_discharge.length} days)` : 'No discharge',
        notes: hasDischarge
          ? `Discharge units: ${data.daily_units?.river_discharge || 'm³/s'}. Sample: ${JSON.stringify(sampleVals)}.`
          : 'river_discharge not available for this location.',
      });
    } catch (err: any) {
      console.error(`Flood API error for ${place}:`, err.message);
    }
  }
}

async function main() {
  console.log('=============================================');
  console.log(' RouteX External API Verification (Phase 1)');
  console.log('=============================================\n');

  await verifyOpenMeteoForecast();
  await verifyOpenMeteoElevation();
  await verifyOpenMeteoGeocoding();
  await verifyOSRM();
  await verifyOpenRouteService();
  await verifyUSGSEarthquakes();
  await verifyOverpass();
  await verifyNASALandslides();
  await verifyOpenMeteoFlood();

  console.log('\n=============================================');
  console.log(' Verification Summary Table');
  console.log('=============================================');
  console.table(
    results.map((r) => ({
      API: r.api,
      Status: r.status,
      'Latency (ms)': r.latencyMs,
      Success: r.success ? '✅' : '❌',
      Notes: r.notes.slice(0, 60) + (r.notes.length > 60 ? '...' : ''),
    }))
  );

  // Output markdown table for PROGRESS.md
  console.log('\nMarkdown Output for PROGRESS.md:\n');
  console.log('| API | Status | Latency | Result | Notes |');
  console.log('|---|---|---|---|---|');
  for (const r of results) {
    console.log(`| ${r.api} | ${r.status} | ${r.latencyMs} ms | ${r.success ? '✅ Success' : '⚠️ Warning/Check'} | ${r.notes.replace(/\|/g, '-')} |`);
  }
}

main().catch((e) => {
  console.error('Fatal verification error:', e);
  process.exit(1);
});

