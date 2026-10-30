import { describe, it, expect } from 'vitest';
import { scoreUserIntent, generateOfflineGuideResponse } from './offlineGuideEngine';
import { buildContextPacket } from './contextPacket';
import type { ContextPacket } from './types';

describe('Safety Chat Feature - Intent Matching & Offline Guide', () => {
  // Test 1: Match "landslide ahead"
  it('correctly scores and matches "landslide ahead" to trapped_landslide intent', () => {
    const intent = scoreUserIntent('There is a landslide ahead and rocks are falling');
    expect(intent.intentId).toBe('trapped_landslide');
    expect(intent.scenarioId).toBe('trapped_landslide');
    expect(intent.score).toBeGreaterThanOrEqual(10);
    expect(intent.matchedKeywords).toContain('landslide ahead');
  });

  // Test 2: Match "I am stuck"
  it('correctly scores and matches "I am stuck" to road_blocked intent', () => {
    const intent = scoreUserIntent('I am stuck behind a collapsed tree and cannot move');
    expect(intent.intentId).toBe('road_blocked');
    expect(intent.scenarioId).toBe('road_blocked');
    expect(intent.score).toBeGreaterThanOrEqual(10);
    expect(intent.matchedKeywords).toContain('i am stuck');
  });

  // Test 3: Match "where can I stay"
  it('correctly scores and matches "where can I stay" to stays intent', () => {
    const intent = scoreUserIntent('Where can I stay tonight safely?');
    expect(intent.intentId).toBe('stays');
    expect(intent.score).toBeGreaterThanOrEqual(10);
    expect(intent.matchedKeywords).toContain('where can i stay');
  });

  // Test 4: Match "lost on trail"
  it('correctly scores and matches "lost on trail" to lost_trail intent', () => {
    const intent = scoreUserIntent('We are lost on trail in dense mountain fog');
    expect(intent.intentId).toBe('lost_trail');
    expect(intent.scenarioId).toBe('lost_trail');
    expect(intent.score).toBeGreaterThanOrEqual(10);
  });

  // Test 5: Match "flash flood" / "rising water"
  it('correctly scores and matches "rising water" / flood to flood_water intent', () => {
    const intent = scoreUserIntent('The river has flash flood and rising water');
    expect(intent.intentId).toBe('flood_water');
    expect(intent.scenarioId).toBe('flood_water');
    expect(intent.score).toBeGreaterThanOrEqual(10);
  });

  // Test 6: Verify offline guide response order & structure (Do now -> Call -> Data -> Stays)
  it('generates offline guide answer following exact Do now -> Call -> data -> stays order', async () => {
    const cachedContext: ContextPacket = {
      location: [77.17, 31.10],
      mode: 'drive',
      routeRisk: {
        score: 32,
        level: 'Moderate',
        topFactors: ['Slope: 15°'],
      },
      nearbyReports: [
        {
          type: 'rockfall',
          distanceKm: 1.2,
          upCount: 4,
          timeAgo: '1h ago',
        },
      ],
      weatherSummary: {
        accumRain72h: 22,
        maxHourly24h: 4,
        soilMoisture: 0.3,
        alerts: ['Rain alert'],
      },
      safeStays: [
        {
          name: 'Pine Ridge Guesthouse',
          category: 'guest_house',
          distanceKm: 1.8,
          safetyLevel: 'Low',
          isSponsored: false,
        },
        {
          name: 'Demo Cedar Lodge',
          category: 'hotel',
          distanceKm: 2.5,
          safetyLevel: 'Low',
          isSponsored: true,
        },
      ],
    };

    const response = await generateOfflineGuideResponse('Landslide ahead', cachedContext);

    expect(response.source).toBe('offline_guide');
    expect(response.structuredBlocks).toBeDefined();

    // 1. Do now
    expect(response.structuredBlocks?.doNow.length).toBeGreaterThanOrEqual(3);
    // 2. Call
    expect(response.structuredBlocks?.call?.number).toBe('112');
    // 3. What RouteX data shows
    expect(response.structuredBlocks?.routeData?.score).toBe(32);
    expect(response.structuredBlocks?.routeData?.level).toBe('Moderate');
    // 4. Safe stays (safer first, sponsored labelled "Sponsored (Demo)")
    expect(response.structuredBlocks?.safeStays?.length).toBe(2);
    expect(response.structuredBlocks?.safeStays?.[1].isSponsored).toBe(true);

    // Text representation order check
    const text = response.text;
    const doNowIdx = text.indexOf('**Do now**:');
    const callIdx = text.indexOf('**Call**:');
    const dataIdx = text.indexOf('**What RouteX data shows**:');
    const staysIdx = text.indexOf('**Safe stays**:');

    expect(doNowIdx).toBeGreaterThanOrEqual(0);
    expect(callIdx).toBeGreaterThan(doNowIdx);
    expect(dataIdx).toBeGreaterThan(callIdx);
    expect(staysIdx).toBeGreaterThan(dataIdx);
  });

  // Test 7: Privacy check for buildContextPacket
  it('buildContextPacket rounds coordinates to 2 decimals and excludes personal data', () => {
    const packet = buildContextPacket({
      coordinates: [77.1734567, 31.1048123],
      mode: 'walk',
      routeRisk: { score: 20, level: 'Low' },
    });

    expect(packet.location).toEqual([77.17, 31.10]);
    // Ensure no names, phone numbers or raw objects
    const jsonStr = JSON.stringify(packet);
    expect(jsonStr).not.toContain('77.1734567');
    expect(jsonStr).not.toContain('31.1048123');
  });
});

