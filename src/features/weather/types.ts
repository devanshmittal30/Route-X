import { z } from 'zod';

export const openMeteoHourlySchema = z.object({
  time: z.array(z.string()),
  temperature_2m: z.array(z.number().nullable()).optional(),
  relative_humidity_2m: z.array(z.number().nullable()).optional(),
  precipitation: z.array(z.number().nullable()).optional(),
  snowfall: z.array(z.number().nullable()).optional(),
  wind_gusts_10m: z.array(z.number().nullable()).optional(),
  soil_moisture_0_to_1cm: z.array(z.number().nullable()).optional(),
});

export const openMeteoCurrentSchema = z.object({
  time: z.string().optional(),
  temperature_2m: z.number().nullable().optional(),
  relative_humidity_2m: z.number().nullable().optional(),
  precipitation: z.number().nullable().optional(),
  wind_speed_10m: z.number().nullable().optional(),
  wind_gusts_10m: z.number().nullable().optional(),
});

export const openMeteoResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number().optional(),
  current: openMeteoCurrentSchema.optional(),
  hourly: openMeteoHourlySchema,
});

export type OpenMeteoHourly = z.infer<typeof openMeteoHourlySchema>;
export type OpenMeteoResponse = z.infer<typeof openMeteoResponseSchema>;

export interface WeatherSummary {
  temperatureC: number;
  humidityPct: number;
  precipitation24hMm: number;
  precipitationNext72hMm: number;
  windSpeedKmh: number;
  windGustsKmh: number;
  snowfallCm: number;
  soilMoistureM3: number;
  soilMoistureDesc: string;
  source: string;
  fetchedAt: string;
  isCached?: boolean;
  cachedAgeDesc?: string;
  raw?: OpenMeteoResponse;
}

export type AlertSeverity = 'info' | 'moderate' | 'high' | 'severe';

export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  source: string;
  timestamp: string;
}

export interface AreaRiskEstimate {
  score: number; // 0 - 100
  level: 'Low' | 'Moderate' | 'High' | 'Severe' | 'Blocked';
  label: string;
  factors: {
    rainScore: number;
    soilScore: number;
    seismicScore: number;
  };
}

