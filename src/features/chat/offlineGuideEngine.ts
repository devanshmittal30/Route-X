import type { ContextPacket, StructuredChatMessage } from './types';
import type { SosScenario } from '../sos/types';
import { fetchOfflineGuide, EMERGENCY_NUMBERS } from '../sos/sosService';

export interface ScoredIntent {
  intentId: string;
  scenarioId?: string;
  score: number;
  matchedKeywords: string[];
}

interface IntentPattern {
  id: string;
  scenarioId?: string;
  exactPhrases: string[];
  keywords: string[];
  weight: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    id: 'stays',
    exactPhrases: ['where can i stay', 'where to stay', 'safe place to sleep', 'safe stays nearby'],
    keywords: ['stay', 'stays', 'hotel', 'hostel', 'shelter', 'guesthouse', 'guest house', 'lodge', 'sleep', 'room', 'haven', 'homestay'],
    weight: 3,
  },
  {
    id: 'trapped_landslide',
    scenarioId: 'trapped_landslide',
    exactPhrases: ['landslide ahead', 'rockfall on road', 'path blocked by rocks', 'debris falling'],
    keywords: ['landslide', 'rockfall', 'rock fall', 'debris', 'slide', 'boulder', 'falling rocks', 'scree', 'mudslide'],
    weight: 3,
  },
  {
    id: 'road_blocked',
    scenarioId: 'road_blocked',
    exactPhrases: ['i am stuck', 'road is blocked', 'car is stuck', 'road closed ahead'],
    keywords: ['stuck', 'blocked', 'closed', 'stranded', 'obstruction', 'halted', 'tree fallen', 'barrier'],
    weight: 3,
  },
  {
    id: 'injured',
    scenarioId: 'injured',
    exactPhrases: ['someone is hurt', 'medical emergency', 'help i am injured'],
    keywords: ['injured', 'injury', 'hurt', 'bleeding', 'fracture', 'wound', 'hypothermia', 'unconscious', 'pain', 'ams', 'altitude'],
    weight: 3,
  },
  {
    id: 'lost_trail',
    scenarioId: 'lost_trail',
    exactPhrases: ['lost on trail', 'lost on trek', 'cannot find path', 'lost in fog'],
    keywords: ['lost', 'disoriented', 'trail', 'trek', 'fog', 'path', 'off route', 'directions'],
    weight: 3,
  },
  {
    id: 'flood_water',
    scenarioId: 'flood_water',
    exactPhrases: ['rising water', 'flood ahead', 'river overflowing', 'flash flood'],
    keywords: ['flood', 'water', 'river', 'stream', 'torrent', 'nullah', 'overflow', 'rising water'],
    weight: 3,
  },
  {
    id: 'earthquake',
    scenarioId: 'earthquake',
    exactPhrases: ['ground shaking', 'earthquake tremor', 'felt earthquake'],
    keywords: ['earthquake', 'quake', 'tremor', 'aftershock', 'shaking', 'seismic'],
    weight: 3,
  },
];

/**
 * Matches user text against intent patterns and scores them
 */
export function scoreUserIntent(input: string): ScoredIntent {
  const normalized = input.toLowerCase().trim();
  let topMatch: ScoredIntent = {
    intentId: 'general_safety',
    score: 0,
    matchedKeywords: [],
  };

  for (const pattern of INTENT_PATTERNS) {
    let score = 0;
    const matches: string[] = [];

    // Check exact phrases first (highest weight)
    for (const phrase of pattern.exactPhrases) {
      if (normalized.includes(phrase)) {
        score += 10;
        matches.push(phrase);
      }
    }

    // Check individual keywords
    for (const kw of pattern.keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(normalized)) {
        score += pattern.weight;
        matches.push(kw);
      }
    }

    if (score > topMatch.score) {
      topMatch = {
        intentId: pattern.id,
        scenarioId: pattern.scenarioId,
        score,
        matchedKeywords: matches,
      };
    }
  }

  return topMatch;
}

/**
 * Generates structured offline assistant response following the strict 4-block order:
 * 1. Do now
 * 2. Call
 * 3. What RouteX data shows
 * 4. Safe stays
 */
export async function generateOfflineGuideResponse(
  userQuery: string,
  cachedContext: ContextPacket = {}
): Promise<StructuredChatMessage> {
  const guide = await fetchOfflineGuide();
  const intent = scoreUserIntent(userQuery);

  let doNowSteps: string[] = [];
  let callAdvisory: string = 'Dial 112 if you or your companions face immediate bodily peril.';
  let followUps: string[] = [];
  let summaryText = '';

  // 1. Where can I stay?
  if (intent.intentId === 'stays') {
    summaryText = 'Here are verified safe havens from your cached RouteX database.';
    doNowSteps = [
      'Choose a verified safe shelter situated on stable bedrock away from steep runoff gullies.',
      'Call ahead or navigate directly while daylight and battery power remain.',
      'Avoid parking or resting near steep cliff excavations during rain.',
    ];
    callAdvisory = 'Dial 112 or local administration if isolated without shelter in sub-zero temperatures.';
    followUps = [
      'Filter safe only (Low risk)',
      'Find medical centers / clinics',
      'What is my route risk?',
    ];
  } else {
    // 2. Scenario match from offline guide
    const targetScenarioId = intent.scenarioId || 'trapped_landslide';
    const scenario: SosScenario | undefined = guide.scenarios.find(
      (s) => s.id === targetScenarioId
    );

    if (scenario && intent.score >= 2) {
      summaryText = `${scenario.title}: ${scenario.summary}`;
      doNowSteps = scenario.steps.slice(0, 4);
      callAdvisory = scenario.whenToCall112;

      if (targetScenarioId === 'trapped_landslide') {
        followUps = ['Is anyone injured?', 'Where can I stay?', 'Send SOS dispatch'];
      } else if (targetScenarioId === 'road_blocked') {
        followUps = ['Turn back to nearest town', 'Where can I stay?', 'Report blockage on map'];
      } else if (targetScenarioId === 'injured') {
        followUps = ['Dial 112 immediately', 'Send SOS coordinates', 'Check nearest clinic'];
      } else {
        followUps = ['Where can I stay?', 'Check weather alerts', 'Send Emergency SOS'];
      }
    } else {
      // Generic mountain safety fallback
      summaryText = 'RouteX Safety Assistant (Offline Guide): Follow conservative mountain protocols.';
      doNowSteps = [
        'Move to solid bedrock ground away from steep cliff cuts and flowing water.',
        'Never cross active landslide debris or murky stream floods.',
        'Stay visible with reflective clothing, whistle, or flashing light.',
        'Conserve battery: switch phone to Low Power Mode.',
      ];
      followUps = ['Landslide ahead', 'I am stuck', 'Where can I stay?', 'Emergency SOS'];
    }
  }

  // 3. What RouteX data shows
  let dataHazards = 'No active hazards recorded near cached route.';
  if (cachedContext.nearbyReports && cachedContext.nearbyReports.length > 0) {
    dataHazards = cachedContext.nearbyReports
      .map((r) => `${r.type} (${r.distanceKm} km away, ${r.upCount} verifications)`)
      .join('; ');
  }

  let dataWeather = 'No severe weather alerts active in cached forecast.';
  if (cachedContext.weatherSummary) {
    const w = cachedContext.weatherSummary;
    dataWeather = `72h Rain Accum: ${w.accumRain72h} mm | Max Hourly: ${w.maxHourly24h} mm/h | Soil: ${w.soilMoisture}`;
    if (w.alerts && w.alerts.length > 0) {
      dataWeather += ` | Alerts: ${w.alerts.join(', ')}`;
    }
  }

  // 4. Safe stays (ranked safer first, sponsored labelled "Sponsored (Demo)")
  const staysList = (cachedContext.safeStays || [])
    .filter((s) => s.safetyLevel === 'Low' || s.safetyLevel === 'Moderate')
    .slice(0, 4)
    .map((s) => ({
      name: s.name,
      safetyLevel: s.safetyLevel,
      distanceKm: s.distanceKm,
      isSponsored: s.isSponsored,
      whyThisStay: `${s.safetyLevel} Risk · ${s.distanceKm} km away${s.isSponsored ? ' · Sponsored (Demo)' : ''}`,
    }));

  // Build clean text representation for fallback or copy
  const fullText = [
    summaryText,
    '',
    `**Do now**:`,
    ...doNowSteps.map((s, i) => `${i + 1}. ${s}`),
    `\n**Call**: ${callAdvisory} (Dial ${EMERGENCY_NUMBERS.national.number} or NDMA ${EMERGENCY_NUMBERS.ndma.number})`,
    `\n**What RouteX data shows**: Risk Level ${cachedContext.routeRisk?.level || 'Moderate'} (Score ${cachedContext.routeRisk?.score ?? 28}). Hazards: ${dataHazards}. Weather: ${dataWeather}.`,
    staysList.length > 0
      ? `\n**Safe stays**: ${staysList.map((s) => `${s.name} (${s.safetyLevel} risk, ${s.distanceKm} km${s.isSponsored ? ', Sponsored (Demo)' : ''})`).join('; ')}`
      : `\n**Safe stays**: No shelters cached nearby. Stay on high solid bedrock.`,
  ].join('\n');

  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sender: 'assistant',
    text: fullText,
    timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    source: 'offline_guide',
    structuredBlocks: {
      doNow: doNowSteps,
      call: {
        number: EMERGENCY_NUMBERS.national.number,
        label: EMERGENCY_NUMBERS.national.label,
        actionUrl: EMERGENCY_NUMBERS.national.tel,
      },
      routeData: {
        score: cachedContext.routeRisk?.score,
        level: cachedContext.routeRisk?.level,
        hazardsText: dataHazards,
        weatherText: dataWeather,
      },
      safeStays: staysList,
    },
    suggestedFollowUps: followUps,
  };
}
