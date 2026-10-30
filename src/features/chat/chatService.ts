import { supabase } from '../../lib/supabase';
import type { ContextPacket, StructuredChatMessage } from './types';
import { generateOfflineGuideResponse } from './offlineGuideEngine';
import { EMERGENCY_NUMBERS } from '../sos/sosService';

export interface SendMessageOptions {
  message: string;
  history?: Array<{ role: 'user' | 'model'; parts: { text: string }[] }>;
  contextPacket: ContextPacket;
}

/**
 * Parses Gemini response text into structured blocks (Do now, Call, RouteX data, Safe stays)
 */
function parseAiStructuredBlocks(text: string, contextPacket: ContextPacket) {
  const doNowSteps: string[] = [];
  let callText: string | undefined;
  let dataText: string | undefined;
  let staysText: string | undefined;

  // Split text by lines and look for block headers
  const lines = text.split('\n');
  let currentBlock = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\*?\*?1?\.\s*Do now\*?\*?:?/i.test(trimmed) || /^\*?\*?Do now\*?\*?:?/i.test(trimmed)) {
      currentBlock = 'doNow';
      continue;
    }
    if (/^\*?\*?2?\.\s*Call\*?\*?:?/i.test(trimmed) || /^\*?\*?Call\*?\*?:?/i.test(trimmed)) {
      currentBlock = 'call';
      continue;
    }
    if (
      /^\*?\*?3?\.\s*What RouteX data shows\*?\*?:?/i.test(trimmed) ||
      /^\*?\*?What RouteX data shows\*?\*?:?/i.test(trimmed)
    ) {
      currentBlock = 'data';
      continue;
    }
    if (/^\*?\*?4?\.\s*Safe stays\*?\*?:?/i.test(trimmed) || /^\*?\*?Safe stays\*?\*?:?/i.test(trimmed)) {
      currentBlock = 'stays';
      continue;
    }

    if (!trimmed) continue;

    if (currentBlock === 'doNow') {
      const cleanStep = trimmed.replace(/^[-*•\d.]+\s*/, '');
      if (cleanStep) doNowSteps.push(cleanStep);
    } else if (currentBlock === 'call') {
      callText = callText ? `${callText} ${trimmed}` : trimmed;
    } else if (currentBlock === 'data') {
      dataText = dataText ? `${dataText} ${trimmed}` : trimmed;
    } else if (currentBlock === 'stays') {
      staysText = staysText ? `${staysText} ${trimmed}` : trimmed;
    }
  }

  // Fallback to context stays if present
  const safeStaysList = (contextPacket.safeStays || []).slice(0, 3).map((s) => ({
    name: s.name,
    safetyLevel: s.safetyLevel,
    distanceKm: s.distanceKm,
    isSponsored: s.isSponsored,
    whyThisStay: `${s.safetyLevel} Risk · ${s.distanceKm} km${s.isSponsored ? ' · Sponsored (Demo)' : ''}`,
  }));

  return {
    doNow: doNowSteps.length > 0 ? doNowSteps : [text],
    call: {
      number: EMERGENCY_NUMBERS.national.number,
      label: EMERGENCY_NUMBERS.national.label,
      actionUrl: EMERGENCY_NUMBERS.national.tel,
    },
    routeData: {
      score: contextPacket.routeRisk?.score,
      level: contextPacket.routeRisk?.level,
      hazardsText: dataText,
    },
    safeStays: safeStaysList,
  };
}

/**
 * Dispatches chat message:
 * - Checks online connectivity
 * - Attempts Supabase Edge Function `gemini-chat`
 * - Falls back automatically to offline guide engine on network drops, timeouts, or errors.
 */
export async function sendChatMessage({
  message,
  history = [],
  contextPacket,
}: SendMessageOptions): Promise<StructuredChatMessage> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // 1. Immediate offline routing if offline
  if (!isOnline) {
    return await generateOfflineGuideResponse(message, contextPacket);
  }

  // 2. Online call to Supabase Edge Function `gemini-chat`
  try {
    const { data, error } = await supabase.functions.invoke('gemini-chat', {
      body: {
        message,
        history,
        context: contextPacket,
      },
    });

    if (error || !data || data.error) {
      // Graceful fallback to offline guide
      const fallback = await generateOfflineGuideResponse(message, contextPacket);
      return {
        ...fallback,
        source: 'offline_guide',
      };
    }

    const aiText: string = data.text || '';
    const structured = parseAiStructuredBlocks(aiText, contextPacket);

    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender: 'assistant',
      text: aiText,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      source: 'online_ai',
      structuredBlocks: structured,
      suggestedFollowUps: ['Is my route safe?', 'Landslide ahead', 'Where can I stay?'],
    };
  } catch {
    // Edge Function invocation exception -> offline fallback
    const fallback = await generateOfflineGuideResponse(message, contextPacket);
    return {
      ...fallback,
      source: 'offline_guide',
    };
  }
}
