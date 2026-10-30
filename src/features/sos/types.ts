export type SosConditionId =
  | 'trapped_landslide'
  | 'road_blocked'
  | 'injured'
  | 'lost_trail'
  | 'flood_water'
  | 'earthquake'
  | 'heavy_rain'
  | 'no_signal'
  | 'night_stop';

export interface SosScenario {
  id: SosConditionId;
  title: string;
  summary: string;
  steps: string[];
  whenToCall112: string;
  safeActions: string[];
}

export interface OfflineGuideData {
  _comment: string;
  version: string;
  scenarios: SosScenario[];
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation?: string | null;
}

export interface SosDispatchResult {
  success: boolean;
  isQueued: boolean;
  message: string;
  recipients: EmergencyContact[];
  sentAt: string;
  eventId?: string;
  error?: string;
}
