import { supabase } from '../../lib/supabase';
import { fetchNearbyEarthquakes } from '../quakes/usgsClient';
import type { EarthquakeEvent } from '../quakes/types';
import { fetchRankedSponsoredStays } from '../rewards/rewardsService';
import type { StayCandidate } from '../rewards/ranking';
import { parseCoordinates } from '../risk/dataAdapters';

export interface HistoricalLandslideEvent {
  id: number;
  source: string;
  source_event_id: string | null;
  event_date: string;
  coordinates: [number, number]; // [lng, lat]
  trigger: string | null;
  fatalities: number | null;
  location_text: string | null;
}

/**
 * Fetches real historical landslide records from Supabase.
 */
export async function fetchHistoricalLandslides(): Promise<HistoricalLandslideEvent[]> {
  const { data, error } = await supabase
    .from('historical_landslides')
    .select('*')
    .order('event_date', { ascending: false })
    .limit(500);

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const coords = parseCoordinates(row.geom) || [77.1734, 31.1048];
    return {
      id: row.id,
      source: row.source || 'NASA Global Landslide Catalog / GSI',
      source_event_id: row.source_event_id,
      event_date: row.event_date,
      coordinates: coords,
      trigger: row.trigger,
      fatalities: row.fatalities,
      location_text: row.location_text,
    };
  });
}

/**
 * Fetches M4.5+ earthquakes within India region over the last 7 days from USGS.
 */
export async function fetchMapEarthquakes(
  center: [number, number] = [77.1734, 31.1048]
): Promise<EarthquakeEvent[]> {
  try {
    const summary = await fetchNearbyEarthquakes(center[1], center[0], 2500, 7);
    return summary.events;
  } catch {
    return [];
  }
}

/**
 * Fetches stay candidates for the stays layer on the map.
 */
export async function fetchMapStays(
  center?: [number, number]
): Promise<StayCandidate[]> {
  try {
    return await fetchRankedSponsoredStays(center);
  } catch {
    return [];
  }
}
