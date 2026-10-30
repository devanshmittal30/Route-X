// Supabase Edge Function: gemini-chat
// Calls Google Gemini REST API using GEMINI_API_KEY and GEMINI_MODEL secrets.
// Strict input validation, in-memory rate limiting, and safety-first system prompt.

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface RequestPayload {
  message: string;
  history?: ChatMessage[];
  context?: {
    location?: [number, number];
    mode?: string;
    routeRisk?: {
      score?: number;
      level?: string;
      topFactors?: string[];
    };
    nearbyReports?: Array<{
      type: string;
      distanceKm: number;
      upCount: number;
      timeAgo?: string;
    }>;
    weatherSummary?: {
      accumRain72h?: number;
      maxHourly24h?: number;
      soilMoisture?: number;
      alerts?: string[];
    };
    safeStays?: Array<{
      name: string;
      category: string;
      distanceKm: number;
      safetyLevel: string;
      isSponsored: boolean;
    }>;
  };
}

// In-memory rate limiting: 10 requests/min per IP or User
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(clientKey: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientKey);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

// CORS origins allowed
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:');
  const allowOrigin = isAllowed ? origin : 'http://localhost:5173';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const SYSTEM_PROMPT = `You are RouteX Safety Assistant for hill and Northeast India.
Your mission is traveler safety during mountain road trips, monsoons, and treks.
Always format answers in this exact structured order:
1. **Do now**: immediate, numbered physical safety actions.
2. **Call**: emergency numbers (112 for National Emergency, 1078 for NDMA) if life, injury, or severe isolation is at risk.
3. **What RouteX data shows**: explain the risk score, slope conditions, and verified community hazards from the context packet.
4. **Safe stays**: nearest safe shelters/stays from the context packet (safer first; sponsored options labelled "Sponsored (Demo)" and only if safe).

Strict Operational Rules:
- Never invent facts, coordinates, weather forecasts, or hazards not present in the context packet.
- If data is missing or you are unsure, admit uncertainty honestly ("I don't know based on current data").
- No medical diagnosis beyond basic conservative first aid (direct pressure, thermal protection).
- Do not claim to be an official government authority (IMD, NDMA, or BRO).
- Keep total response under 180 words.`;

// Deno handler
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Rate Limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'anonymous-client';

  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded (max 10 requests per minute). Please wait a moment.',
      }),
      {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Parse and validate request
  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { message, history = [], context } = payload;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Message cannot be empty' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (message.length > 600) {
    return new Response(
      JSON.stringify({ error: 'Message exceeds maximum length of 600 characters' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Read environment secrets
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  const geminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash';

  if (!geminiApiKey) {
    return new Response(
      JSON.stringify({
        error: 'GEMINI_API_KEY secret is not configured on this Supabase Edge Function.',
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Build context summary string for Gemini
  let contextSnippet = 'No route context available.';
  if (context) {
    const parts: string[] = [];
    if (context.location) {
      parts.push(`User Coordinates (coarse): ${context.location[1].toFixed(2)}°N, ${context.location[0].toFixed(2)}°E`);
    }
    if (context.mode) {
      parts.push(`Travel Mode: ${context.mode}`);
    }
    if (context.routeRisk) {
      parts.push(
        `Current Route Risk: Score ${context.routeRisk.score ?? 'N/A'}, Level ${context.routeRisk.level ?? 'N/A'}, Top Factors: ${context.routeRisk.topFactors?.join(', ') || 'None'}`
      );
    }
    if (context.nearbyReports && context.nearbyReports.length > 0) {
      const repList = context.nearbyReports
        .slice(0, 5)
        .map((r) => `${r.type} (${r.distanceKm} km away, ${r.upCount} verifications)`)
        .join('; ');
      parts.push(`Nearby Verified Hazards: ${repList}`);
    } else {
      parts.push('Nearby Verified Hazards: None reported within buffer');
    }
    if (context.weatherSummary) {
      const w = context.weatherSummary;
      parts.push(
        `Weather: 72h Rain Accum ${w.accumRain72h ?? 0} mm, Peak Hourly ${w.maxHourly24h ?? 0} mm/h, Soil Moisture ${w.soilMoisture ?? 'normal'}`
      );
      if (w.alerts && w.alerts.length > 0) {
        parts.push(`Active Weather Alerts: ${w.alerts.join(', ')}`);
      }
    }
    if (context.safeStays && context.safeStays.length > 0) {
      const staysList = context.safeStays
        .slice(0, 5)
        .map((s) => `${s.name} (${s.safetyLevel} risk, ${s.distanceKm} km away${s.isSponsored ? ', Sponsored (Demo)' : ''})`)
        .join('; ');
      parts.push(`Nearest Safe Stays: ${staysList}`);
    } else {
      parts.push('Nearest Safe Stays: None found nearby');
    }
    contextSnippet = parts.join('\n');
  }

  // Format messages for Gemini API
  // Take only the last 6 history items
  const cleanHistory = history.slice(-6).map((item) => ({
    role: item.role === 'model' ? 'model' : 'user',
    parts: item.parts.map((p) => ({ text: p.text.substring(0, 600) })),
  }));

  const userContentWithContext = `[Context Data Packet]:\n${contextSnippet}\n\n[Traveler Question]:\n${message}`;

  const geminiPayload = {
    contents: [
      ...cleanHistory,
      {
        role: 'user',
        parts: [{ text: userContentWithContext }],
      },
    ],
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.2,
    },
  };

  // Call Gemini REST API with 15s timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', response.status, errText);
      return new Response(
        JSON.stringify({
          error: `Gemini API returned error ${response.status}. Falling back to offline guide.`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const generatedText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'I was unable to generate a response. Please consult the offline safety guide.';

    return new Response(
      JSON.stringify({
        text: generatedText,
        model: geminiModel,
        status: 'online_ai',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const isAbort = (err as Error)?.name === 'AbortError';
    console.error('Gemini fetch exception:', err);
    return new Response(
      JSON.stringify({
        error: isAbort
          ? 'Gemini request timed out after 15 seconds'
          : 'Failed to contact Gemini service',
      }),
      {
        status: 504,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } finally {
    clearTimeout(timer);
  }
});

