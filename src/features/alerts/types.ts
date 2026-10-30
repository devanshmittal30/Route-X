export type AlertSeverity = 'low' | 'moderate' | 'high' | 'severe' | 'critical';

export interface RouteXAlert {
  id: string;
  category: 'weather' | 'quake' | 'hazard_report' | 'risk_increased';
  severity: AlertSeverity;
  title: string;
  description: string;
  source: string; // e.g. 'IMD / Open-Meteo', 'USGS Earthquakes', 'Verified Report', 'RouteX Risk Engine'
  timestamp: string;
  targetType: 'current_location' | 'saved_route';
  targetId?: string; // route ID or location label
  targetLabel?: string; // e.g. "Shimla to Manali"
  metadata?: {
    coordinates?: [number, number];
    rainAccumMm?: number;
    magnitude?: number;
    reportType?: string;
    previousScore?: number;
    newScore?: number;
  };
}

export interface InAppToastNotification {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  source?: string;
  timestamp?: string;
  actionLabel?: string;
  onAction?: () => void;
}

