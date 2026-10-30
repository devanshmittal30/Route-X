import { describe, it, expect } from 'vitest';
import { parseOverpassElements } from './staysService';
import { rankStays, generateWhyThisStay, StayCandidate } from '../rewards/ranking';
import type { OverpassElement } from './types';

describe('Stays Feature - Overpass Parsing & Ranking', () => {
  it('correctly parses Overpass node and way elements into StayCandidates', () => {
    const rawElements: OverpassElement[] = [
      {
        type: 'node',
        id: 101,
        lat: 31.105,
        lon: 77.175,
        tags: {
          tourism: 'hotel',
          name: 'Cedar Ridge Hotel',
          'addr:city': 'Shimla',
          phone: '+91 177 2812345',
          stars: '3',
        },
      },
      {
        type: 'way',
        id: 202,
        center: { lat: 31.108, lon: 77.172 },
        tags: {
          amenity: 'shelter',
          name: 'Pine Hill Community Shelter',
          emergency: 'yes',
        },
      },
      {
        type: 'node',
        id: 303,
        lat: 31.11,
        lon: 77.18,
        tags: {
          amenity: 'hospital',
          name: 'Indira Gandhi Medical Hospital',
          emergency: 'yes',
        },
      },
    ];

    const parsed = parseOverpassElements(rawElements, [77.1734, 31.1048]);

    expect(parsed).toHaveLength(3);

    // Node hotel
    expect(parsed[0].id).toBe('osm-node-101');
    expect(parsed[0].name).toBe('Cedar Ridge Hotel');
    expect(parsed[0].category).toBe('hotel');
    expect(parsed[0].isSponsored).toBe(false);
    expect(parsed[0].coordinates).toEqual([77.175, 31.105]);
    expect(parsed[0].amenityTags).toContain('Hotel');
    expect(parsed[0].amenityTags).toContain('Shimla');
    expect(parsed[0].distanceKm).toBeDefined();

    // Way shelter
    expect(parsed[1].id).toBe('osm-way-202');
    expect(parsed[1].name).toBe('Pine Hill Community Shelter');
    expect(parsed[1].category).toBe('shelter');
    expect(parsed[1].coordinates).toEqual([77.172, 31.108]);

    // Node hospital
    expect(parsed[2].id).toBe('osm-node-303');
    expect(parsed[2].name).toBe('Indira Gandhi Medical Hospital');
    expect(parsed[2].category).toBe('hospital');
  });

  it('hides Severe and Blocked stays from ranked output per Doc 03 Section 9', () => {
    const candidates: StayCandidate[] = [
      {
        id: '1',
        name: 'Safe Haven Lodge',
        category: 'hotel',
        coordinates: [77.17, 31.1],
        riskLevel: 'Low',
        riskScore: 15,
        isSponsored: false,
        distanceKm: 2.1,
      },
      {
        id: '2',
        name: 'Cliff Edge Inn (Severe Zone)',
        category: 'hotel',
        coordinates: [77.18, 31.12],
        riskLevel: 'Severe',
        riskScore: 82,
        isSponsored: true,
        distanceKm: 1.0,
      },
      {
        id: '3',
        name: 'Cut Off Shelter (Blocked)',
        category: 'shelter',
        coordinates: [77.19, 31.13],
        riskLevel: 'Blocked',
        riskScore: 100,
        isSponsored: false,
        distanceKm: 0.8,
      },
      {
        id: '4',
        name: 'Mid Slope Guesthouse',
        category: 'guest_house',
        coordinates: [77.175, 31.105],
        riskLevel: 'Moderate',
        riskScore: 38,
        isSponsored: false,
        distanceKm: 1.5,
      },
    ];

    const ranked = rankStays(candidates);

    expect(ranked.map((r) => r.id)).toEqual(['1', '4']);
    expect(ranked.some((r) => r.riskLevel === 'Severe')).toBe(false);
    expect(ranked.some((r) => r.riskLevel === 'Blocked')).toBe(false);
  });

  it('ranks safety level first: no sponsored stay appears above a safer non-sponsored stay', () => {
    const candidates: StayCandidate[] = [
      {
        id: 'sponsored-moderate',
        name: 'Sponsored Partner Lodge (Moderate)',
        category: 'hotel',
        coordinates: [77.17, 31.1],
        riskLevel: 'Moderate',
        riskScore: 35,
        isSponsored: true,
        distanceKm: 0.5, // Closer and sponsored, BUT Moderate risk
      },
      {
        id: 'real-low',
        name: 'OSM Mountain Hostel (Low)',
        category: 'hostel',
        coordinates: [77.175, 31.105],
        riskLevel: 'Low',
        riskScore: 18,
        isSponsored: false,
        distanceKm: 2.5, // Farther and non-sponsored, BUT Low risk
      },
    ];

    const ranked = rankStays(candidates);

    // Safer place MUST rank before less safe place, regardless of sponsored status
    expect(ranked[0].id).toBe('real-low');
    expect(ranked[1].id).toBe('sponsored-moderate');
  });

  it('ranks sponsored first within the SAME risk level, then sorts by distance', () => {
    const candidates: StayCandidate[] = [
      {
        id: 'regular-close',
        name: 'Regular Safe Hotel',
        category: 'hotel',
        coordinates: [77.17, 31.1],
        riskLevel: 'Low',
        riskScore: 18,
        isSponsored: false,
        distanceKm: 1.0,
      },
      {
        id: 'sponsored-equal',
        name: 'Sponsored Safe Resort',
        category: 'hotel',
        coordinates: [77.18, 31.11],
        riskLevel: 'Low',
        riskScore: 20,
        isSponsored: true,
        distanceKm: 1.8,
      },
      {
        id: 'regular-farther',
        name: 'Regular Far Hotel',
        category: 'hotel',
        coordinates: [77.19, 31.12],
        riskLevel: 'Low',
        riskScore: 22,
        isSponsored: false,
        distanceKm: 3.5,
      },
    ];

    const ranked = rankStays(candidates);

    // Both are Low risk -> sponsored ranks first, then non-sponsored by distance
    expect(ranked[0].id).toBe('sponsored-equal');
    expect(ranked[1].id).toBe('regular-close');
    expect(ranked[2].id).toBe('regular-farther');
  });

  it('generates an explainable "Why this stay" line using ONLY real fields', () => {
    const stay: StayCandidate = {
      id: 's1',
      name: 'Pine Haven Guest House',
      category: 'guest_house',
      coordinates: [77.17, 31.1],
      riskLevel: 'Low',
      riskScore: 16,
      isSponsored: false,
      distanceKm: 2.4,
      amenityTags: ['Bedrock base', 'First aid'],
    };

    const whyLine = generateWhyThisStay(stay);

    expect(whyLine).toContain('Low Risk (score 16)');
    expect(whyLine).toContain('2.4 km away');
    expect(whyLine).toContain('Bedrock base, First aid');
  });
});
