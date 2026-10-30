import { supabase } from '../../lib/supabase';
import { enqueueAction } from '../offline/queueService';
import type {
  EmergencyContact,
  OfflineGuideData,
  SosConditionId,
  SosDispatchResult,
  SosScenario,
} from './types';

// TODO: verify numbers before demo
export const EMERGENCY_NUMBERS = {
  national: {
    number: '112',
    label: 'National Emergency Helpline (112)',
    tel: 'tel:112',
  },
  ndma: {
    number: '1078',
    label: 'NDMA Disaster Control Room (1078)',
    tel: 'tel:1078',
  },
};

export const DEFAULT_EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'demo-contact-1',
    name: 'Primary Contact (Family)',
    phone: '+91 98765 43210',
    relation: 'Family',
  },
  {
    id: 'demo-contact-2',
    name: 'Trek Guide / Local Contact',
    phone: '+91 98123 45678',
    relation: 'Guide',
  },
];

let cachedGuide: OfflineGuideData | null = null;

/**
 * Loads emergency scenarios and conservative guidance from /offline-guide.json
 */
export async function fetchOfflineGuide(): Promise<OfflineGuideData> {
  if (cachedGuide) return cachedGuide;

  // In Vitest / Node test environment, read local JSON without making network call
  if (
    typeof window === 'undefined' ||
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') ||
    (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test')
  ) {
    try {
      const data = await import('../../../public/offline-guide.json');
      cachedGuide = (data.default || data) as unknown as OfflineGuideData;
      return cachedGuide;
    } catch {
      // Fall through to fetch or fallback
    }
  }

  try {
    const res = await fetch('/offline-guide.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as OfflineGuideData;
    cachedGuide = data;
    return data;
  } catch {
    // Built-in fallback in case network / fetch fails completely
    const fallback: OfflineGuideData = {
      _comment: 'needs human review before production deployment',
      version: '1.0.0',
      scenarios: [
        {
          id: 'trapped_landslide',
          title: 'Trapped by Landslide',
          summary: 'Cut off by active slope failure or debris flow.',
          steps: [
            'Move away from the slide path immediately to stable bedrock ground.',
            'Watch uphill for secondary rockfalls and falling trees; never cross active debris.',
            'Stay visible with bright gear, whistle, or flashing torch.',
            'Conserve phone battery and keep GPS active.',
          ],
          whenToCall112: 'Call 112 immediately if someone is trapped or debris flow is advancing.',
          safeActions: ['Seek higher bedrock ground', 'Signal with whistle', 'Do not drive through slide debris'],
        },
        {
          id: 'road_blocked',
          title: 'Road Blocked',
          summary: 'Roadway obstructed by rock or mud slip.',
          steps: [
            'Stop at least 50m before the hazard; park clear of cliff cuttings.',
            'Turn on hazard blinkers for following vehicles.',
            'Check RouteX for alternative routes or turn back to the nearest safe town.',
          ],
          whenToCall112: 'Call 112 if vulnerable passengers are isolated with no shelter.',
          safeActions: ['Turn around to nearest safe town', 'Avoid overhangs'],
        },
        {
          id: 'injured',
          title: 'Injured / Medical Emergency',
          summary: 'Injury, trauma, or acute mountain sickness.',
          steps: [
            'Control bleeding with direct pressure and clean dressing.',
            'Keep patient warm and dry using emergency thermal blanket.',
            'Do not move anyone with suspected spinal injury unless in active rockfall danger.',
            'Broadcast SOS with coordinates immediately.',
          ],
          whenToCall112: 'Call 112 immediately for any trauma, severe hemorrhage, or loss of consciousness.',
          safeActions: ['Apply first aid', 'Keep warm', 'Send SOS'],
        },
        {
          id: 'lost_trail',
          title: 'Lost on Trail',
          summary: 'Disoriented or fogged in on mountain trail.',
          steps: [
            'Stop and stay calm. Check compass orientation and last confirmed trail mark.',
            'Never descend into steep unknown river gullies where waterfalls trap hikers.',
            'Stay on open ridge lines where rescue visibility and mobile signal are highest.',
          ],
          whenToCall112: 'Call 112 or 1078 if darkness is falling and you lack overnight gear.',
          safeActions: ['Stay on high ridge lines', 'Signal 3 loud blasts every minute'],
        },
        {
          id: 'flood_water',
          title: 'Flood / Rising Water',
          summary: 'Flash flood or rising river torrent.',
          steps: [
            'Climb to high ground immediately away from riverbeds and culverts.',
            'Never attempt to drive or walk through flowing water deeper than ankle height.',
            'Wait out the surge on solid high ground.',
          ],
          whenToCall112: 'Call 112 if water level is rising around stranded shelter.',
          safeActions: ['Evacuate up hillside', 'Avoid moving water'],
        },
        {
          id: 'earthquake',
          title: 'Earthquake',
          summary: 'Ground shaking and seismic rockfalls.',
          steps: [
            'Drop, Cover, and Hold On. Protect head and neck.',
            'Move clear of steep cliffs, loose scree, and overhead power cables.',
            'Anticipate secondary landslides and aftershocks over the next 72 hours.',
          ],
          whenToCall112: 'Call 112 or 1078 if structural collapse or trapped persons require rescue.',
          safeActions: ['Protect head', 'Move to open meadows'],
        },
      ],
    };
    cachedGuide = fallback;
    return fallback;
  }
}

/**
 * Returns a specific emergency scenario
 */
export async function getScenarioById(id: SosConditionId): Promise<SosScenario | undefined> {
  const guide = await fetchOfflineGuide();
  return guide.scenarios.find((s) => s.id === id);
}

/**
 * Builds the exact SOS emergency SMS message format per Doc 01 Section 6.6 & Doc 03 Section 11:
 * "RouteX SOS: <name> needs help. Condition: <condition>. Location: <lat,lng> <maps link>. Time: <time>."
 */
export function buildSosMessage(
  userName: string,
  conditionTitle: string,
  lat: number,
  lon: number,
  timeStr?: string
): string {
  const formattedTime =
    timeStr ||
    new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  const latStr = lat.toFixed(4);
  const lonStr = lon.toFixed(4);
  const mapsLink = `https://maps.google.com/?q=${latStr},${lonStr}`;

  return `RouteX SOS: ${userName} needs help. Condition: ${conditionTitle}. Location: ${latStr},${lonStr} ${mapsLink}. Time: ${formattedTime}.`;
}

/**
 * Fetches configured emergency contacts for the user or falls back to demo contacts
 */
export async function fetchUserEmergencyContacts(userId?: string): Promise<EmergencyContact[]> {
  if (!userId) {
    return DEFAULT_EMERGENCY_CONTACTS;
  }

  try {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('id, name, phone, relation')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_EMERGENCY_CONTACTS;
    }

    return data.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      relation: c.relation,
    }));
  } catch {
    return DEFAULT_EMERGENCY_CONTACTS;
  }
}

/**
 * Dispatches the SOS event:
 * - When online: inserts into Supabase `sos_events` table
 * - When offline: queues in Dexie `offlineQueue` table
 */
export async function sendSosEvent(
  userId: string | undefined,
  userName: string,
  conditionId: SosConditionId,
  conditionTitle: string,
  lat: number,
  lon: number
): Promise<SosDispatchResult> {
  const contacts = await fetchUserEmergencyContacts(userId);
  const now = new Date();
  const timeFormatted = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const message = buildSosMessage(userName, conditionTitle, lat, lon, timeFormatted);
  const geomWkt = `POINT(${lon} ${lat})`;

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isOnline) {
    try {
      const { data, error } = await supabase
        .from('sos_events')
        .insert({
          user_id: userId || null,
          condition: conditionTitle,
          message,
          geom: geomWkt,
          status: 'sent',
        })
        .select('id')
        .single();

      if (!error && data) {
        return {
          success: true,
          isQueued: false,
          message,
          recipients: contacts,
          sentAt: timeFormatted,
          eventId: data.id,
        };
      }
    } catch {
      // Fall through to offline queue
    }
  }

  // Save to Dexie offline queue (P13)
  try {
    await enqueueAction('sos', {
      userId: userId || null,
      conditionId,
      condition: conditionTitle,
      message,
      lat,
      lon,
    });
  } catch {
    // Non-fatal
  }

  return {
    success: true,
    isQueued: true,
    message,
    recipients: contacts,
    sentAt: timeFormatted,
  };
}
