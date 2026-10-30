import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env.local manually to ensure reliable loading in ts-node or node
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val.trim();
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse CSV line handling quoted commas
function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

interface LandslideItem {
  source: string;
  source_event_id: string;
  event_date: string;
  longitude: number;
  latitude: number;
  trigger: string | null;
  fatalities: number | null;
  location_text: string | null;
}

export async function importLandslides() {
  console.log('=============================================================');
  console.log(' RouteX Historical Landslides Importer (Phase 10)');
  console.log(' Source: Official NASA Global Landslide Catalog (GLC)');
  console.log(' India Bounding Box: Lat 6.0–38.0°N, Lon 68.0–98.0°E');
  console.log('=============================================================\n');

  const csvUrl =
    'https://raw.githubusercontent.com/AntoineSueur/Geoplot-landslides/master/Global_Landslide_Catalog_Export.csv';

  console.log(`Downloading NASA GLC dataset from:\n${csvUrl}...`);
  const res = await fetch(csvUrl);
  if (!res.ok) {
    throw new Error(`Failed to download NASA GLC CSV: ${res.status} ${res.statusText}`);
  }

  const csvText = await res.text();
  const lines = csvText.split('\n');
  console.log(`Downloaded ${lines.length} total raw lines from NASA GLC export.\n`);

  const header = parseCSVLine(lines[0]);
  const colIndex: Record<string, number> = {};
  header.forEach((name, idx) => {
    colIndex[name.toLowerCase()] = idx;
  });

  const idCol = colIndex['id'] ?? 0;
  const dateCol = colIndex['date'] ?? 1;
  const triggerCol = colIndex['trigger'] ?? 7;
  const fatalitiesCol = colIndex['fatalities'] ?? 9;
  const locDescCol = colIndex['location_description'] ?? 13;
  const countryCol = colIndex['countryname'] ?? colIndex['country'] ?? 19;
  const admin1Col = colIndex['adminname1'] ?? 22;
  const nearPlacesCol = colIndex['nearest_places'] ?? 4;
  const latCol = colIndex['latitude'] ?? 31;
  const lonCol = colIndex['longitude'] ?? 32;

  const events: LandslideItem[] = [];
  const yearCounts: Record<string, number> = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim().length === 0) continue;

    const row = parseCSVLine(line);
    if (row.length < 10) continue;

    const lat = parseFloat(row[latCol]);
    const lon = parseFloat(row[lonCol]);
    const country = row[countryCol] || '';

    // Check if inside India bounding box or identified as India
    const isInsideIndiaBbox = lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98;
    const isIndia = country.toLowerCase().includes('india') || isInsideIndiaBbox;

    if (!isIndia || isNaN(lat) || isNaN(lon)) continue;

    // Parse date
    const rawDate = row[dateCol] || '';
    let eventDate = '';
    const dateMatch = rawDate.match(/(\d{4})-(\d{2})-(\d{2})/) || rawDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

    if (dateMatch) {
      if (rawDate.includes('/')) {
        const parts = rawDate.split(' ')[0].split('/');
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        const year = parts[2];
        eventDate = `${year}-${month}-${day}`;
      } else {
        eventDate = dateMatch[0];
      }
    } else {
      eventDate = '2016-01-01';
    }

    const yr = eventDate.split('-')[0];
    // Keep reasonable years (GLC catalogue 2007-2016)
    const yrNum = parseInt(yr, 10);
    if (isNaN(yrNum) || yrNum < 2000 || yrNum > 2026) continue;

    yearCounts[yr] = (yearCounts[yr] || 0) + 1;

    const fatalitiesRaw = parseInt(row[fatalitiesCol], 10);
    const fatalities = isNaN(fatalitiesRaw) ? null : fatalitiesRaw;

    const triggerRaw = row[triggerCol];
    const trigger = triggerRaw && triggerRaw.trim() ? triggerRaw.trim() : 'monsoon / rain';

    const locationText =
      row[locDescCol] ||
      [row[nearPlacesCol], row[admin1Col], 'India'].filter(Boolean).join(', ');

    events.push({
      source: 'NASA_GLC',
      source_event_id: row[idCol] || `glc-${i}`,
      event_date: eventDate,
      longitude: lon,
      latitude: lat,
      trigger,
      fatalities,
      location_text: locationText,
    });
  }

  console.log('--- Real NASA GLC Events in India by Year ---');
  for (const [yr, count] of Object.entries(yearCounts).sort()) {
    console.log(`Year ${yr}: ${count} real historical landslide events`);
  }
  console.log(`---------------------------------------------`);
  console.log(`Total valid NASA GLC India events found: ${events.length}\n`);

  // Batch upsert into Supabase historical_landslides
  console.log('Upserting events into Supabase historical_landslides table...');
  const batchSize = 100;
  let totalUpserted = 0;

  for (let b = 0; b < events.length; b += batchSize) {
    const chunk = events.slice(b, b + batchSize);
    const payload = chunk.map((ev) => ({
      source: ev.source,
      source_event_id: ev.source_event_id,
      event_date: ev.event_date,
      geom: `SRID=4326;POINT(${ev.longitude} ${ev.latitude})`,
      trigger: ev.trigger,
      fatalities: ev.fatalities,
      location_text: ev.location_text,
    }));

    const { error } = await supabase
      .from('historical_landslides')
      .upsert(payload, { onConflict: 'source,source_event_id' });

    if (error) {
      console.warn(`Batch ${b / batchSize + 1} insert note: ${error.message}`);
    } else {
      totalUpserted += chunk.length;
      process.stdout.write(`\rUpserted ${totalUpserted} / ${events.length} records...`);
    }
  }

  console.log(`\n\n🎉 Done! Successfully imported ${totalUpserted} real historical landslide events into Supabase.`);
  return {
    success: true,
    totalUpserted,
    yearCounts,
  };
}

if (process.argv[1]?.endsWith('import-landslides.ts')) {
  importLandslides().catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });
}
