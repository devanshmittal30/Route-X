import { describe, it, expect } from 'vitest';
import { buildSosMessage, DEFAULT_EMERGENCY_CONTACTS } from './sosService';
import offlineGuideJson from '../../../public/offline-guide.json';

describe('SOS Feature & SMS Simulation', () => {
  it('generates the exact required SMS message format per Doc 01 / Doc 03', () => {
    const userName = 'Aarav Sharma';
    const condition = 'Trapped by Landslide';
    const lat = 31.1048;
    const lon = 77.1734;
    const fixedTime = '02:30 PM';

    const message = buildSosMessage(userName, condition, lat, lon, fixedTime);

    // Exact structure: "RouteX SOS: <name> needs help. Condition: <condition>. Location: <lat,lng> <maps link>. Time: <time>."
    expect(message).toBe(
      'RouteX SOS: Aarav Sharma needs help. Condition: Trapped by Landslide. Location: 31.1048,77.1734 https://maps.google.com/?q=31.1048,77.1734. Time: 02:30 PM.'
    );
  });

  it('provides default demo emergency contacts when unconfigured', () => {
    expect(DEFAULT_EMERGENCY_CONTACTS.length).toBeGreaterThanOrEqual(2);
    expect(DEFAULT_EMERGENCY_CONTACTS[0].name).toContain('Primary Contact');
    expect(DEFAULT_EMERGENCY_CONTACTS[0].phone).toBeTruthy();
  });

  it('contains valid offline-guide.json with required scenarios and human review notice', () => {
    expect(offlineGuideJson._comment).toContain('needs human review');
    expect(offlineGuideJson.scenarios).toBeInstanceOf(Array);
    expect(offlineGuideJson.scenarios.length).toBeGreaterThanOrEqual(6);

    const scenarioIds = offlineGuideJson.scenarios.map((s) => s.id);
    expect(scenarioIds).toContain('trapped_landslide');
    expect(scenarioIds).toContain('road_blocked');
    expect(scenarioIds).toContain('injured');
    expect(scenarioIds).toContain('lost_trail');
    expect(scenarioIds).toContain('flood_water');
    expect(scenarioIds).toContain('earthquake');

    offlineGuideJson.scenarios.forEach((scenario) => {
      expect(scenario.title).toBeTruthy();
      expect(scenario.steps.length).toBeGreaterThanOrEqual(3);
      expect(scenario.whenToCall112).toBeTruthy();
      expect(scenario.safeActions.length).toBeGreaterThanOrEqual(2);
    });
  });
});

