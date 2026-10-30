import { describe, it, expect } from 'vitest';
import {
  buildOsrmUrl,
  formatDistance,
  formatDuration,
  formatManeuverInstruction,
} from './osrmClient';
import type { RouteStep } from './types';

describe('OSRM Routing Client Helpers', () => {
  it('builds OSRM URL using routed-car prefix for driving mode', () => {
    const url = buildOsrmUrl(77.1734, 31.1048, 77.1892, 32.2432, 'drive');

    expect(url).toContain('/routed-car/route/v1/driving/');
    expect(url).toContain('77.173400,31.104800;77.189200,32.243200');
    expect(url).toContain('alternatives=true');
    expect(url).toContain('overview=full');
    expect(url).toContain('geometries=geojson');
    expect(url).toContain('steps=true');
  });

  it('builds OSRM URL using routed-foot prefix for walking mode', () => {
    const url = buildOsrmUrl(91.8667, 27.5833, 91.88, 27.59, 'walk');

    expect(url).toContain('/routed-foot/route/v1/foot/');
    expect(url).toContain('91.866700,27.583300;91.880000,27.590000');
    expect(url).toContain('alternatives=true');
  });

  it('formats metric distances accurately', () => {
    expect(formatDistance(450)).toBe('450 m');
    expect(formatDistance(1200)).toBe('1.2 km');
    expect(formatDistance(244200)).toBe('244 km');
    expect(formatDistance(8650)).toBe('8.7 km');
  });

  it('formats duration in hours and minutes accurately', () => {
    expect(formatDuration(45 * 60)).toBe('45 min');
    expect(formatDuration(2 * 3600)).toBe('2 hr');
    expect(formatDuration(3 * 3600 + 25 * 60)).toBe('3 hr 25 min');
    expect(formatDuration(120)).toBe('2 min');
  });

  it('formats turn-by-turn maneuver instructions when missing text', () => {
    const departStep: RouteStep = {
      name: 'Mall Road',
      distance: 500,
      duration: 60,
      maneuver: { type: 'depart', modifier: 'right', location: [77.17, 31.1] },
    };
    expect(formatManeuverInstruction(departStep)).toBe('Head right onto Mall Road');

    const turnStep: RouteStep = {
      name: 'NH5',
      distance: 1200,
      duration: 120,
      maneuver: { type: 'turn', modifier: 'left', location: [77.18, 31.12] },
    };
    expect(formatManeuverInstruction(turnStep)).toBe('Turn left onto NH5');

    const arriveStep: RouteStep = {
      name: '',
      distance: 0,
      duration: 0,
      maneuver: { type: 'arrive', location: [77.19, 32.2] },
    };
    expect(formatManeuverInstruction(arriveStep)).toBe('Arrive at your destination');
  });
});
