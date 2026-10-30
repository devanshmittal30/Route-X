export interface ContextPacket {
  location?: [number, number]; // [lon, lat] rounded to 2 decimals
  mode?: 'drive' | 'walk' | 'trek';
  routeRisk?: {
    score: number;
    level: string;
    topFactors: string[];
  };
  nearbyReports?: Array<{
    type: string;
    distanceKm: number;
    upCount: number;
    timeAgo?: string;
  }>;
  weatherSummary?: {
    accumRain72h: number;
    maxHourly24h: number;
    soilMoisture: number;
    alerts?: string[];
  };
  safeStays?: Array<{
    name: string;
    category: string;
    distanceKm: number;
    safetyLevel: string;
    isSponsored: boolean;
  }>;
}

export interface StructuredChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source: 'online_ai' | 'offline_guide';
  structuredBlocks?: {
    doNow: string[];
    call?: {
      number: string;
      label: string;
      actionUrl: string;
    };
    routeData?: {
      score?: number;
      level?: string;
      hazardsText?: string;
      weatherText?: string;
    };
    safeStays?: Array<{
      name: string;
      safetyLevel: string;
      distanceKm: number;
      isSponsored: boolean;
      whyThisStay?: string;
    }>;
  };
  suggestedFollowUps?: string[];
}
