import { supabase } from '../../lib/supabase';
import type { RouteMode } from './types';

export interface SavedRoute {
  id: string;
  user_id: string;
  from_label: string;
  to_label: string;
  mode: RouteMode;
  geometry: GeoJSON.LineString;
  risk_score: number;
  created_at: string;
}

export interface SaveRouteInput {
  fromLabel: string;
  toLabel: string;
  mode: RouteMode;
  geometry: GeoJSON.LineString;
  riskScore: number;
}

/**
 * Saves a route to Supabase for the authenticated user.
 */
export async function saveRoute(input: SaveRouteInput): Promise<SavedRoute> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Please sign in to save routes to your profile.');
  }

  const { data, error } = await supabase
    .from('saved_routes')
    .insert({
      user_id: user.id,
      from_label: input.fromLabel.trim(),
      to_label: input.toLabel.trim(),
      mode: input.mode,
      geometry: input.geometry,
      risk_score: Math.round(input.riskScore),
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to save route to database.');
  }

  return data as SavedRoute;
}

/**
 * Retrieves all saved routes for the authenticated user, newest first.
 */
export async function getSavedRoutes(): Promise<SavedRoute[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('saved_routes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[savedRoutesService] Error fetching saved routes:', error.message);
    return [];
  }

  return (data || []) as SavedRoute[];
}

/**
 * Retrieves a single saved route by ID.
 */
export async function getSavedRouteById(id: string): Promise<SavedRoute | null> {
  const { data, error } = await supabase
    .from('saved_routes')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as SavedRoute;
}

/**
 * Deletes a saved route by ID.
 */
export async function deleteSavedRoute(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('saved_routes')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'Failed to delete saved route.');
  }

  return true;
}

