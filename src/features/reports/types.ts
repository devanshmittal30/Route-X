export type ReportType =
  | 'landslide'
  | 'road_blocked'
  | 'flood'
  | 'snow'
  | 'rockfall'
  | 'bridge_damage'
  | 'all_clear';

export type ReportSeverity = 1 | 2 | 3;

export type ReportStatus = 'pending' | 'verified' | 'disputed' | 'resolved' | 'expired';

export interface HazardReport {
  id: string;
  user_id: string | null;
  type: ReportType;
  severity: ReportSeverity;
  description?: string | null;
  coordinates: [number, number]; // [longitude, latitude]
  photo_path?: string | null;
  photo_url?: string | null;
  status: ReportStatus;
  is_test: boolean;
  up_count: number;
  down_count: number;
  created_at: string;
  expires_at: string;
  resolved_at?: string | null;
  resolves_report_id?: string | null;
  distance_m?: number;
  user_vote?: 1 | -1 | null;
}

export interface CreateReportInput {
  type: ReportType;
  severity: ReportSeverity;
  description?: string;
  coordinates: [number, number]; // [longitude, latitude]
  photoFile?: File | null;
  is_test?: boolean;
}

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  duplicateReport: HazardReport | null;
  distanceMeters: number;
}

