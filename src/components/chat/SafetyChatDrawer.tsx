import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Loader2,
  Phone,
  Building2,
  Bot,
  User as UserIcon,
  WifiOff,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { RiskBadge, RiskLevel as BadgeRiskLevel } from '../ui/RiskBadge';
import { SponsoredBadge } from '../ui/StatusBadges';
import type { StructuredChatMessage } from '../../features/chat/types';
import { buildContextPacket } from '../../features/chat/contextPacket';
import { sendChatMessage } from '../../features/chat/chatService';
import { fetchNearbyStays } from '../../features/stays/staysService';
import type { StayCandidate } from '../../features/stays/types';
import { EMERGENCY_NUMBERS } from '../../features/sos/sosService';

export interface SafetyChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  'Is my route safe?',
  'Landslide ahead',
  'I am stuck',
  'Where can I stay?',
];

export const SafetyChatDrawer: React.FC<SafetyChatDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<StructuredChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello, I am RouteX Safety Assistant. How can I help you navigate mountain roads or handle emergencies today?',
      timestamp: 'Now',
      source: 'offline_guide',
      suggestedFollowUps: QUICK_PROMPTS,
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Monitor online / offline network state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isLoading]);

  // Sends a message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || query.length > 600 || isLoading) return;

    const userMsg: StructuredChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      source: isOnline ? 'online_ai' : 'offline_guide',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Gather coarse location
      let lat = 31.1048;
      let lon = 77.1734;
      try {
        const savedLoc = localStorage.getItem('routex_last_location');
        if (savedLoc) {
          const parsed = JSON.parse(savedLoc);
          if (parsed.lat && parsed.lon) {
            lat = parsed.lat;
            lon = parsed.lon;
          }
        }
      } catch {
        // Fallback
      }

      // 2. Fetch nearest stays from Dexie or memory
      let cachedStays: StayCandidate[] = [];
      try {
        const staysRes = await fetchNearbyStays(lat, lon, 15, true);
        cachedStays = staysRes.stays;
      } catch {
        // Non-fatal
      }

      // 3. Construct privacy-compliant Context Packet (no names, phones, exact coords)
      const contextPacket = buildContextPacket({
        coordinates: [lon, lat],
        mode: 'drive',
        routeRisk: {
          score: 28,
          level: 'Moderate',
          topFactors: ['Slope steepness: 18°', 'Recent rainfall: 14 mm'],
        },
        weather: {
          accumRain72h: 18.5,
          maxHourly24h: 3.2,
          soilMoisture: 0.28,
          alerts: ['Moderate rain advisory on high passes'],
        },
        stays: cachedStays,
      });

      // 4. Format history for Edge Function
      const historyPayload = messages.slice(-6).map((m) => ({
        role: (m.sender === 'assistant' ? 'model' : 'user') as 'model' | 'user',
        parts: [{ text: m.text }],
      }));

      // 5. Send message (with automated offline fallback)
      const response = await sendChatMessage({
        message: query,
        history: historyPayload,
        contextPacket,
      });

      setMessages((prev) => [...prev, response]);
    } catch (err: unknown) {
      console.error('Chat error:', err);
      // Hard fallback message
      setMessages((prev) => [
        ...prev,
        {
          id: `fallback-${Date.now()}`,
          sender: 'assistant',
          text: 'Dial 112 if in danger. Move to high solid bedrock away from active slide paths.',
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          source: 'offline_guide',
          structuredBlocks: {
            doNow: [
              'Move to high solid bedrock away from active slide paths.',
              'Never cross fast mud or flooded streams.',
              'Stay visible and conserve battery power.',
            ],
            call: {
              number: EMERGENCY_NUMBERS.national.number,
              label: EMERGENCY_NUMBERS.national.label,
              actionUrl: EMERGENCY_NUMBERS.national.tel,
            },
          },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      title="RouteX Safety Assistant"
    >
      <div className="flex flex-col h-[calc(100vh-80px)] -mx-6 -my-4">
        {/* Header Status Strip */}
        <div className="px-6 py-2.5 bg-surface border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Sparkles size={12} className="text-emerald-600" />
                Online AI
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <WifiOff size={12} className="text-amber-600" />
                Offline Guide
              </span>
            )}
            <span className="text-[11px] text-text-3 font-mono">
              Himalayan & Northeast Specialist
            </span>
          </div>

          <div className="text-[10px] text-text-3">
            {isOnline ? 'Gemini Free Tier' : 'Local Decision Tree'}
          </div>
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-6 py-2.5 bg-white border-b border-border flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-3 flex-shrink-0 mr-1">
            Prompts:
          </span>
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
              className="px-2.5 py-1 bg-surface hover:bg-surface-hover text-text text-xs rounded-full border border-border whitespace-nowrap transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Messages Stream */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                    <Bot size={14} />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2`}>
                  {/* Bubble Container */}
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-brand text-white rounded-tr-xs'
                        : 'bg-surface text-text border border-border rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    {/* Header for assistant message */}
                    {!isUser && (
                      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-border/80 text-[10px]">
                        <span className="font-bold uppercase tracking-wider text-text-2 flex items-center gap-1">
                          {msg.source === 'online_ai' ? (
                            <>
                              <Sparkles size={11} className="text-accent" />
                              Online AI Response
                            </>
                          ) : (
                            <>
                              <BookOpen size={11} className="text-amber-600" />
                              Offline Guide Response
                            </>
                          )}
                        </span>
                        <span className="text-text-3 font-mono">{msg.timestamp}</span>
                      </div>
                    )}

                    {/* Structured Blocks (Do now -> Call -> Data -> Stays) */}
                    {msg.structuredBlocks ? (
                      <div className="space-y-3">
                        {/* 1. DO NOW */}
                        {msg.structuredBlocks.doNow && msg.structuredBlocks.doNow.length > 0 && (
                          <div>
                            <div className="font-bold text-[11px] uppercase tracking-wider text-brand mb-1 flex items-center gap-1">
                              <span>1. Do Now</span>
                            </div>
                            <ol className="space-y-1.5 pl-1">
                              {msg.structuredBlocks.doNow.map((step, idx) => (
                                <li key={idx} className="flex items-start gap-1.5 text-xs">
                                  <span className="w-4 h-4 rounded-full bg-brand/10 text-brand font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <span className="leading-snug">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* 2. CALL */}
                        {msg.structuredBlocks.call && (
                          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-sos text-[11px] uppercase tracking-wider flex items-center gap-1">
                                <Phone size={11} className="fill-sos" />
                                2. Call Emergency
                              </span>
                              <a
                                href={msg.structuredBlocks.call.actionUrl}
                                className="px-2 py-0.5 bg-sos text-white font-bold text-[11px] rounded hover:opacity-90"
                              >
                                Dial 112
                              </a>
                            </div>
                            <p className="text-[11px] text-red-900 mt-1">
                              Dial 112 immediately if life, injury, or trapped passengers are in peril.
                            </p>
                          </div>
                        )}

                        {/* 3. ROUTEX DATA */}
                        {msg.structuredBlocks.routeData && (
                          <div className="p-2.5 bg-white border border-border rounded-lg">
                            <div className="font-bold text-[11px] uppercase tracking-wider text-text-2 mb-1">
                              3. What RouteX Data Shows
                            </div>
                            {msg.structuredBlocks.routeData.level && (
                              <div className="flex items-center gap-2 mb-1">
                                <RiskBadge
                                  level={msg.structuredBlocks.routeData.level.toLowerCase() as BadgeRiskLevel}
                                  score={msg.structuredBlocks.routeData.score}
                                  size="sm"
                                />
                              </div>
                            )}
                            <p className="text-[11px] text-text-2 leading-relaxed">
                              {msg.structuredBlocks.routeData.hazardsText || 'No active blockages reported.'}
                            </p>
                          </div>
                        )}

                        {/* 4. SAFE STAYS */}
                        {msg.structuredBlocks.safeStays &&
                          msg.structuredBlocks.safeStays.length > 0 && (
                            <div>
                              <div className="font-bold text-[11px] uppercase tracking-wider text-brand mb-1.5 flex items-center gap-1">
                                <Building2 size={12} />
                                4. Safe Stays Nearby
                              </div>
                              <div className="space-y-1.5">
                                {msg.structuredBlocks.safeStays.map((stay, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2 bg-white rounded border border-border flex items-center justify-between text-xs"
                                  >
                                    <div>
                                      <div className="font-semibold text-text line-clamp-1">
                                        {stay.name}
                                      </div>
                                      <div className="text-[10px] text-text-3 font-mono">
                                        {stay.safetyLevel} Risk · {stay.distanceKm} km away
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {stay.isSponsored && <SponsoredBadge />}
                                      <RiskBadge
                                        level={stay.safetyLevel.toLowerCase() as BadgeRiskLevel}
                                        size="sm"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    ) : (
                      // Plain text display if no structured blocks parsed
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    )}
                  </div>

                  {/* Suggested Follow-ups */}
                  {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggestedFollowUps.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => handleSendMessage(prompt)}
                          disabled={isLoading}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-surface-hover text-brand font-medium hover:bg-brand-soft border border-border/80 transition-colors"
                        >
                          {prompt} →
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-full bg-surface border border-border text-text-2 flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                    <UserIcon size={14} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-text-3 text-xs pl-2">
              <Bot size={14} className="text-brand animate-bounce" />
              <span className="font-mono">Analyzing route safety and hazards...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-border space-y-2">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 600))}
              onKeyDown={handleKeyDown}
              placeholder="Ask RouteX (e.g., 'Landslide ahead', 'Is my route safe?')..."
              disabled={isLoading}
              className="w-full pl-3.5 pr-20 py-2.5 text-xs bg-surface border border-border rounded-btn focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all text-text"
            />
            <div className="absolute right-2 flex items-center gap-2">
              <span className="text-[10px] text-text-3 font-mono">
                {input.length}/600
              </span>
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="p-1.5 bg-brand text-white rounded-btn hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          </div>

          {/* Disclaimer Line */}
          <p className="text-[10px] text-text-3 text-center leading-tight">
            RouteX gives risk estimates from public data. It is not an official warning. Follow IMD, NDMA and local advisories.
          </p>
        </div>
      </div>
    </Drawer>
  );
};
