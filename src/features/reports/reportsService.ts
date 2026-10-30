import * as turf from '@turf/turf';
import { supabase } from '../../lib/supabase';
import type {
  ReportType,
  HazardReport,
  CreateReportInput,
  DuplicateCheckResult,
} from './types';
import { createReportSchema, validatePhotoFile } from './schemas';
import { parseCoordinates } from '../risk/dataAdapters';

/**
 * Calculates default expiry timestamp based on hazard type per Doc 03 section 8:
 * - landslide / rockfall / bridge_damage: 72 hours
 * - road_blocked / flood: 48 hours
 * - snow / all_clear: 24 hours
 */
export function calculateReportExpiresAt(
  type: ReportType,
  fromDate: Date = new Date()
): string {
  const d = new Date(fromDate);
  if (type === 'landslide' || type === 'rockfall' || type === 'bridge_damage') {
    d.setHours(d.getHours() + 72);
  } else if (type === 'road_blocked' || type === 'flood') {
    d.setHours(d.getHours() + 48);
  } else {
    d.setHours(d.getHours() + 24);
  }
  return d.toISOString();
}

/**
 * Uploads an optional hazard report photo to the Supabase Storage bucket 'report-photos'.
 * Strict limits: <= 3 MB, jpeg/png/webp only.
 */
export async function uploadReportPhoto(
  file: File,
  userId: string
): Promise<{ path: string; url: string }> {
  const validation = validatePhotoFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid photo file');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;

  const { error } = await supabase.storage
    .from('report-photos')
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Photo upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('report-photos')
    .getPublicUrl(filePath);

  return {
    path: filePath,
    url: urlData.publicUrl,
  };
}

/**
 * Duplicate detection per Doc 03 section 8 & Doc 01 section 6.4:
 * Same type within 200 m within the last 2 hours.
 */
export async function checkDuplicateReport(
  type: ReportType,
  coordinates: [number, number]
): Promise<DuplicateCheckResult> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const [lng, lat] = coordinates;
  const currentPt = turf.point([lng, lat]);

  try {
    // 1. Try PostGIS RPC find_duplicate_report if available
    const { data: rpcData } = await supabase.rpc('find_duplicate_report', {
      p_type: type,
      p_lng: lng,
      p_lat: lat,
      p_distance_m: 200,
      p_lookback_hours: 2,
    });

    if (Array.isArray(rpcData) && rpcData.length > 0) {
      const match = rpcData[0];
      const matchCoords = parseCoordinates(match.geom) || [lng, lat];
      const dist = turf.distance(currentPt, turf.point(matchCoords), {
        units: 'meters',
      });

      return {
        hasDuplicate: true,
        duplicateReport: {
          id: match.id,
          user_id: match.user_id,
          type: match.type,
          severity: match.severity,
          description: match.description,
          coordinates: matchCoords,
          photo_path: match.photo_path,
          status: match.status,
          is_test: match.is_test,
          up_count: match.up_count || 0,
          down_count: match.down_count || 0,
          created_at: match.created_at,
          expires_at: match.expires_at,
        },
        distanceMeters: Math.round(dist),
      };
    }
  } catch {
    // Fallback to table query if RPC not yet deployed
  }

  // Fallback: Query active reports of same type created in last 2 hours
  try {
    const { data } = await supabase
      .from('hazard_reports')
      .select('*')
      .eq('type', type)
      .in('status', ['pending', 'verified'])
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      for (const row of data) {
        const rowCoords = parseCoordinates(row.geom);
        if (!rowCoords) continue;

        const distMeters = turf.distance(currentPt, turf.point(rowCoords), {
          units: 'meters',
        });

        if (distMeters <= 200) {
          return {
            hasDuplicate: true,
            duplicateReport: {
              id: row.id,
              user_id: row.user_id,
              type: row.type,
              severity: row.severity,
              description: row.description,
              coordinates: rowCoords,
              photo_path: row.photo_path,
              status: row.status,
              is_test: row.is_test,
              up_count: row.up_count || 0,
              down_count: row.down_count || 0,
              created_at: row.created_at,
              expires_at: row.expires_at,
            },
            distanceMeters: Math.round(distMeters),
          };
        }
      }
    }
  } catch {
    // Graceful
  }

  return {
    hasDuplicate: false,
    duplicateReport: null,
    distanceMeters: 0,
  };
}

/**
 * Creates a new hazard report.
 * - Login required
 * - Zod validation (type, severity, <=500 sanitized chars, India bounding box)
 * - Rate limit check (max 5 submissions per hour)
 * - Optional photo upload to Storage
 * - Expiry interval setting per Doc 03 section 8
 */
export async function createHazardReport(
  input: CreateReportInput,
  userId: string
): Promise<{ report: HazardReport; isOfflineQueued?: boolean }> {
  // 1. Validate inputs via Zod
  const validated = createReportSchema.parse({
    type: input.type,
    severity: input.severity,
    description: input.description,
    coordinates: input.coordinates,
    is_test: input.is_test ?? false,
  });

  // 2. Offline check
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const expiresAt = calculateReportExpiresAt(validated.type);
    const mockReport: HazardReport = {
      id: `offline-${Date.now()}`,
      user_id: userId,
      type: validated.type,
      severity: validated.severity,
      description: validated.description,
      coordinates: validated.coordinates,
      status: 'pending',
      is_test: validated.is_test,
      up_count: 0,
      down_count: 0,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    };

    // Store in offline queue placeholder (Dexie integration in P13)
    try {
      const queueKey = 'routex_offline_reports_queue';
      const existingQueue = JSON.parse(localStorage.getItem(queueKey) || '[]');
      existingQueue.push({
        input: validated,
        userId,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(queueKey, JSON.stringify(existingQueue));
    } catch {
      // ignore
    }

    return { report: mockReport, isOfflineQueued: true };
  }

  // 3. Client-side Rate limit check: max 5 reports/hour/user
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('hazard_reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo);

  if (count !== null && count >= 5) {
    throw new Error(
      'Rate limit exceeded: You can submit at most 5 reports per hour. Please wait before reporting another hazard.'
    );
  }

  // 4. Optional Photo Upload
  let photoPath: string | null = null;
  let photoUrl: string | null = null;

  if (input.photoFile) {
    const uploadRes = await uploadReportPhoto(input.photoFile, userId);
    photoPath = uploadRes.path;
    photoUrl = uploadRes.url;
  }

  // 5. Expiry calculation per Doc 03 section 8
  const expiresAt = calculateReportExpiresAt(validated.type);
  const [lng, lat] = validated.coordinates;

  // 6. Insert into Supabase hazard_reports table
  // PostGIS point format: POINT(lng lat)
  const geomWkt = `POINT(${lng} ${lat})`;

  const { data, error } = await supabase
    .from('hazard_reports')
    .insert({
      user_id: userId,
      type: validated.type,
      severity: validated.severity,
      description: validated.description || null,
      geom: geomWkt,
      photo_path: photoPath,
      status: 'pending',
      is_test: validated.is_test,
      up_count: 0,
      down_count: 0,
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  if (error) {
    // If database trigger threw rate limit or restriction error
    if (error.message.includes('Rate limit exceeded')) {
      throw new Error(
        'Rate limit exceeded: You can submit at most 5 reports per hour. Please wait before reporting another hazard.'
      );
    }
    throw new Error(error.message);
  }

  const createdReport: HazardReport = {
    id: data.id,
    user_id: data.user_id,
    type: data.type,
    severity: data.severity,
    description: data.description,
    coordinates: [lng, lat],
    photo_path: data.photo_path,
    photo_url: photoUrl,
    status: data.status,
    is_test: data.is_test,
    up_count: data.up_count || 0,
    down_count: data.down_count || 0,
    created_at: data.created_at,
    expires_at: data.expires_at,
  };

  return { report: createdReport, isOfflineQueued: false };
}

/**
 * Fetch hazard reports with filtering, distance sorting, and real-time compatibility.
 */
export async function fetchHazardReports(options?: {
  includeTest?: boolean;
  statusFilter?: 'all' | 'verified' | 'pending';
  sortBy?: 'newest' | 'distance';
  userCoords?: [number, number]; // [lng, lat]
  limit?: number;
}): Promise<HazardReport[]> {
  const {
    includeTest = true,
    statusFilter = 'all',
    sortBy = 'newest',
    userCoords,
    limit = 50,
  } = options || {};

  let query = supabase
    .from('hazard_reports')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .neq('status', 'expired')
    .limit(limit);

  if (!includeTest) {
    query = query.eq('is_test', false);
  }

  if (statusFilter === 'verified') {
    query = query.eq('status', 'verified');
  } else if (statusFilter === 'pending') {
    query = query.eq('status', 'pending');
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  const currentPt = userCoords ? turf.point(userCoords) : null;

  const reports: HazardReport[] = data.map((row) => {
    const coords = parseCoordinates(row.geom) || [0, 0];
    let distM: number | undefined;

    if (currentPt && coords[0] !== 0 && coords[1] !== 0) {
      distM = Math.round(
        turf.distance(currentPt, turf.point(coords), { units: 'meters' })
      );
    }

    let photoUrl: string | null = null;
    if (row.photo_path) {
      const { data: urlData } = supabase.storage
        .from('report-photos')
        .getPublicUrl(row.photo_path);
      photoUrl = urlData.publicUrl;
    }

    return {
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      severity: row.severity,
      description: row.description,
      coordinates: coords,
      photo_path: row.photo_path,
      photo_url: photoUrl,
      status: row.status,
      is_test: row.is_test,
      up_count: row.up_count || 0,
      down_count: row.down_count || 0,
      created_at: row.created_at,
      expires_at: row.expires_at,
      distance_m: distM,
    };
  });

  // Sort by distance if requested and user coordinates provided
  if (sortBy === 'distance' && userCoords) {
    reports.sort((a, b) => (a.distance_m ?? 999999) - (b.distance_m ?? 999999));
  }

  return reports;
}

/**
 * Casts a vote on a report (1 for thumbs up, -1 for thumbs down).
 * Uses Supabase RPC cast_vote.
 */
export async function castVote(
  reportId: string,
  vote: 1 | -1
): Promise<{ success: boolean; newStatus?: string; upCount?: number; downCount?: number }> {
  const { data, error } = await supabase.rpc('cast_vote', {
    p_report_id: reportId,
    p_vote: vote,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    success: true,
    newStatus: data?.status,
    upCount: data?.up_count,
    downCount: data?.down_count,
  };
}

/**
 * Subscribes to Supabase Realtime channel for live updates to hazard_reports table.
 */
export function subscribeToHazardReports(
  onEvent: (payload: { eventType: string; newReport: HazardReport | null }) => void
) {
  const channel = supabase
    .channel('hazard_reports_live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hazard_reports' },
      (payload) => {
        let newReport: HazardReport | null = null;
        if (payload.new && typeof payload.new === 'object') {
          const row = payload.new as Record<string, unknown>;
          const coords = parseCoordinates(row.geom) || [0, 0];
          newReport = {
            id: String(row.id),
            user_id: row.user_id ? String(row.user_id) : null,
            type: row.type as ReportType,
            severity: Number(row.severity) as 1 | 2 | 3,
            description: row.description ? String(row.description) : null,
            coordinates: coords,
            photo_path: row.photo_path ? String(row.photo_path) : null,
            status: row.status as HazardReport['status'],
            is_test: Boolean(row.is_test),
            up_count: Number(row.up_count) || 0,
            down_count: Number(row.down_count) || 0,
            created_at: String(row.created_at),
            expires_at: String(row.expires_at),
          };
        }

        onEvent({
          eventType: payload.eventType,
          newReport,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
