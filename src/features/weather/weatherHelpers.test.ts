import { describe, it, expect } from 'vitest';
import {
  calculateRainPast24h,
  calculateRainNext72h,
  calculateSnowfallNext24h,
  getSoilMoistureDescription,
  deriveWeatherAlerts,
  calculateSinglePointAreaRisk,
  formatCachedAge,
} from './weatherHelpers';
import type { OpenMeteoHourly } from './types';

describe('Weather Helpers: Rain and Snow Accumulations', () => {
  // Generate dummy 144 hours (6 days: 3 past days + 3 forecast days)
  const baseDate = new Date('2026-10-30T12:00:00Z');
  const times: string[] = [];
  const precipitation: number[] = [];
  const snowfall: number[] = [];

  for (let i = -72; i <= 72; i++) {
    const t = new Date(baseDate.getTime() + i * 3600 * 1000).toISOString();
    times.push(t);
    // 2 mm/h for the past 24 hours (-24 to 0) -> total 50 mm (25 samples)
    if (i >= -24 && i <= 0) {
      precipitation.push(2);
    }
    // 1 mm/h for future 72 hours (1 to 72) -> total 72 mm
    else if (i > 0) {
      precipitation.push(1);
    } else {
      precipitation.push(0);
    }

    // 0.5 cm/h snow for future 10 hours
    if (i >= 0 && i < 10) {
      snowfall.push(0.5);
    } else {
      snowfall.push(0);
    }
  }

  const dummyHourly: OpenMeteoHourly = {
    time: times,
    precipitation,
    snowfall,
  };

  it('calculateRainPast24h sums rainfall over past 24 hours correctly', () => {
    const rainPast = calculateRainPast24h(dummyHourly, baseDate.toISOString());
    // 25 hours * 2 mm = 50 mm
    expect(rainPast).toBe(50);
  });

  it('calculateRainNext72h sums forecast rainfall over next 72 hours correctly', () => {
    const rainNext = calculateRainNext72h(dummyHourly, baseDate.toISOString());
    // 72 hours * 1 mm = 72 mm
    expect(rainNext).toBe(72);
  });

  it('calculateSnowfallNext24h sums forecast snowfall in cm correctly', () => {
    const snow = calculateSnowfallNext24h(dummyHourly, baseDate.toISOString());
    // 10 hours * 0.5 cm = 5 cm
    expect(snow).toBe(5);
  });
});

describe('Weather Helpers: Soil Moisture and Unit Formatting', () => {
  it('correctly categorizes soil moisture values', () => {
    expect(getSoilMoistureDescription(0.12)).toBe('Dry (stable)');
    expect(getSoilMoistureDescription(0.22)).toBe('Normal wetness');
    expect(getSoilMoistureDescription(0.33)).toBe('High moisture (soft)');
    expect(getSoilMoistureDescription(0.42)).toBe('Saturated (high slide risk)');
  });

  it('formats cached relative age correctly', () => {
    const now = Date.now();
    const tenMinsAgo = new Date(now - 10 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(now - 2 * 3600 * 1000).toISOString();

    expect(formatCachedAge(tenMinsAgo)).toBe('10m ago');
    expect(formatCachedAge(twoHoursAgo)).toBe('2h ago');
  });
});

describe('Weather Helpers: IMD Alerts and Area Risk', () => {
  it('derives IMD-style heavy rainfall alert when precipitation is elevated', () => {
    // Construct hourly with heavy rainfall
    const times = ['2026-10-30T12:00:00Z'];
    const dummyHourly: OpenMeteoHourly = {
      time: times,
      precipitation: [100], // 100 mm
      snowfall: [0],
    };

    const alerts = deriveWeatherAlerts(dummyHourly, 35, times[0]);
    expect(alerts.some((a) => a.id.startsWith('rain-'))).toBe(true);
  });

  it('derives wind gust alert when gusts >= 50 km/h', () => {
    const times = ['2026-10-30T12:00:00Z'];
    const dummyHourly: OpenMeteoHourly = {
      time: times,
      precipitation: [0],
      snowfall: [0],
    };

    const alerts = deriveWeatherAlerts(dummyHourly, 65, times[0]);
    const windAlert = alerts.find((a) => a.id === 'wind-squall');
    expect(windAlert).toBeDefined();
    expect(windAlert?.severity).toBe('moderate');
  });

  it('calculates single-point area risk score and levels accurately', () => {
    // Calm weather
    const calm = calculateSinglePointAreaRisk(0, 5, 0.18, 0);
    expect(calm.level).toBe('Low');
    expect(calm.score).toBeLessThan(25);

    // Severe conditions: high rain + high soil saturation + recent quakes
    const severe = calculateSinglePointAreaRisk(80, 150, 0.42, 2);
    expect(severe.level).toBe('Severe');
    expect(severe.score).toBeGreaterThanOrEqual(75);
  });
});
