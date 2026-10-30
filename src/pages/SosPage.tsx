import React, { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy,
  Phone,
  AlertTriangle,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Send,
  Loader2,
  Building2,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { RiskBadge, RiskLevel as BadgeRiskLevel } from '../components/ui/RiskBadge';
import { SponsoredBadge } from '../components/ui/StatusBadges';
import { useAuth } from '../features/auth/AuthContext';
import {
  EMERGENCY_NUMBERS,
  fetchOfflineGuide,
  sendSosEvent,
} from '../features/sos/sosService';
import type {
  OfflineGuideData,
  SosConditionId,
  SosDispatchResult,
  SosScenario,
} from '../features/sos/types';
import { fetchNearbyStays } from '../features/stays/staysService';
import type { StayCandidate } from '../features/stays/types';
import { SmsSimulationModal } from '../components/sos/SmsSimulationModal';

const DEFAULT_COORDS: [number, number] = [77.1734, 31.1048]; // [lon, lat] Shimla default

const CONDITIONS: { id: SosConditionId; label: string; icon: string }[] = [
  { id: 'trapped_landslide', label: 'Trapped by Landslide', icon: '🏔️' },
  { id: 'road_blocked', label: 'Road Blocked', icon: '🚧' },
  { id: 'injured', label: 'Injured / Medical', icon: '🩹' },
  { id: 'lost_trail', label: 'Lost on Trail', icon: '🧭' },
  { id: 'flood_water', label: 'Flood / Rising Water', icon: '🌊' },
  { id: 'earthquake', label: 'Earthquake', icon: '⚠️' },
];

export const SosPage: React.FC = () => {
  const { user, profile } = useAuth();

  // Location state
  const [coordinates, setCoordinates] = useState<[number, number]>(() => {
    try {
      const saved = localStorage.getItem('routex_last_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lat && parsed.lon) return [parsed.lon, parsed.lat];
      }
    } catch {
      // Fallback
    }
    return DEFAULT_COORDS;
  });
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isLocationCached, setIsLocationCached] = useState<boolean>(true);

  // SOS Condition & Scenarios
  const [selectedCondition, setSelectedCondition] = useState<SosConditionId>('trapped_landslide');
  const [guideData, setGuideData] = useState<OfflineGuideData | null>(null);
  const [loadingGuide, setLoadingGuide] = useState<boolean>(true);

  // Safer nearby stays
  const [saferStays, setSaferStays] = useState<StayCandidate[]>([]);
  const [loadingStays, setLoadingStays] = useState<boolean>(true);

  // Dispatch state & simulation modal
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<SosDispatchResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // 1. Acquire current device location
  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        setCoordinates([lon, lat]);
        setAccuracyMeters(Math.round(pos.coords.accuracy));
        setIsLocationCached(false);
        try {
          localStorage.setItem('routex_last_location', JSON.stringify({ lat, lon, time: Date.now() }));
        } catch {
          // Ignore
        }
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  // 2. Load offline guide scenarios
  useEffect(() => {
    let isMounted = true;
    async function loadGuide() {
      setLoadingGuide(true);
      try {
        const data = await fetchOfflineGuide();
        if (isMounted) setGuideData(data);
      } catch {
        // Fallback in service
      } finally {
        if (isMounted) setLoadingGuide(false);
      }
    }
    loadGuide();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Load safer options nearby (sorted by safety then distance, severe hidden)
  useEffect(() => {
    let isMounted = true;
    async function loadStays() {
      setLoadingStays(true);
      try {
        const res = await fetchNearbyStays(coordinates[1], coordinates[0], 15, true);
        if (isMounted) {
          // Filter to safe only: Low or Moderate risk
          const safeOnly = res.stays.filter(
            (s) => s.riskLevel === 'Low' || s.riskLevel === 'Moderate'
          );
          setSaferStays(safeOnly.slice(0, 4));
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setLoadingStays(false);
      }
    }
    loadStays();
    return () => {
      isMounted = false;
    };
  }, [coordinates]);

  // Current scenario object
  const currentScenario: SosScenario | undefined = guideData?.scenarios.find(
    (s) => s.id === selectedCondition
  );

  // Dispatch SOS action
  const handleSendSos = async () => {
    setIsDispatching(true);
    try {
      const conditionTitle =
        CONDITIONS.find((c) => c.id === selectedCondition)?.label || selectedCondition;
      const userName = profile?.display_name || user?.email?.split('@')[0] || 'RouteX Traveler';

      const res = await sendSosEvent(
        user?.id,
        userName,
        selectedCondition,
        conditionTitle,
        coordinates[1],
        coordinates[0]
      );
      setDispatchResult(res);
      setIsModalOpen(true);
    } catch (err: unknown) {
      console.error('Failed to dispatch SOS:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-subtle pb-16">
      {/* Emergency Red Banner Header */}
      <div className="bg-sos text-white shadow-md">
        <div className="max-w-[1200px] mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-xs flex items-center justify-center">
                <LifeBuoy className="w-8 h-8 animate-pulse text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded text-[11px] font-bold tracking-widest uppercase bg-white/20 text-white mb-1">
                  Emergency Protocol
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  RouteX Emergency SOS
                </h1>
                <p className="text-sm text-red-100 max-w-xl mt-1">
                  Immediate distress procedures, one-touch emergency helplines, and nearest verified shelters.
                </p>
              </div>
            </div>

            {/* Direct Dial Buttons */}
            {/* TODO: verify numbers before demo */}
            <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
              <a
                href={EMERGENCY_NUMBERS.national.tel}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-sos font-bold text-sm rounded-btn shadow-sm hover:bg-red-50 transition-colors"
                aria-label="Call National Emergency Helpline 112"
              >
                <Phone className="w-4 h-4 fill-sos" />
                Call 112
              </a>
              <a
                href={EMERGENCY_NUMBERS.ndma.tel}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-black/25 text-white border border-white/30 font-semibold text-sm rounded-btn hover:bg-black/35 transition-colors"
                aria-label="Call NDMA Disaster Helpline 1078"
              >
                <Phone className="w-4 h-4" />
                NDMA 1078
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
        {/* Main Grid: Left Steps & Condition, Right Location & Send SOS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Condition Chips & Large Instruction Card */}
          <div className="lg:col-span-7 space-y-5">
            {/* Condition Chips */}
            <div className="bg-white border border-border rounded-card p-4 sm:p-5 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-3 mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-sos" />
                Select Emergency Condition
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CONDITIONS.map((cond) => {
                  const isActive = selectedCondition === cond.id;
                  return (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => setSelectedCondition(cond.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-btn text-left text-xs font-semibold transition-all border ${
                        isActive
                          ? 'bg-sos text-white border-sos shadow-xs ring-2 ring-sos/20'
                          : 'bg-surface text-text border-border hover:bg-surface-hover hover:border-text-3'
                      }`}
                    >
                      <span className="text-base flex-shrink-0">{cond.icon}</span>
                      <span className="line-clamp-2 leading-tight">{cond.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Instruction Card (3-5 short steps, large text) */}
            <div className="bg-white border border-border rounded-card p-5 sm:p-6 shadow-xs space-y-5">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-brand font-mono">
                  Offline Action Protocol
                </div>
                <h3 className="text-h2 font-extrabold text-text mt-0.5">
                  {currentScenario?.title || 'Emergency Guidance'}
                </h3>
                <p className="text-xs text-text-2 mt-1">
                  {currentScenario?.summary ||
                    'Follow conservative mountain survival guidelines while waiting for emergency response.'}
                </p>
              </div>

              {loadingGuide ? (
                <div className="py-8 flex items-center justify-center text-text-3">
                  <Loader2 className="w-5 h-5 animate-spin mr-2 text-sos" />
                  <span className="text-xs">Loading safety instructions...</span>
                </div>
              ) : currentScenario ? (
                <div className="space-y-4">
                  {/* Step-by-step guidance */}
                  <div className="space-y-3">
                    {currentScenario.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-surface rounded-lg border border-border/80"
                      >
                        <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-sm font-medium text-text leading-relaxed">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* "When to Call 112" advisory callout */}
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sos text-xs font-bold uppercase tracking-wide mb-1">
                      <Phone className="w-3.5 h-3.5 fill-sos" />
                      When to dial 112 immediately
                    </div>
                    <p className="text-xs text-red-900 leading-relaxed font-medium">
                      {currentScenario.whenToCall112}
                    </p>
                  </div>

                  {/* Immediate Safe Actions */}
                  {currentScenario.safeActions && currentScenario.safeActions.length > 0 && (
                    <div className="pt-2">
                      <div className="text-xs font-bold text-text-2 uppercase tracking-wider mb-2">
                        Safe Actions Checklist:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentScenario.safeActions.map((action, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-medium"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-text-3">No guidance loaded for this scenario.</div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Location Block & Big Send SOS Button */}
          <div className="lg:col-span-5 space-y-5">
            {/* Location Block */}
            <div className="bg-white border border-border rounded-card p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sos" />
                  <h3 className="text-sm font-bold text-text uppercase tracking-wide">
                    Emergency Location
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={refreshLocation}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline font-medium cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                  {isLocating ? 'Acquiring GPS...' : 'Refresh GPS'}
                </button>
              </div>

              <div className="bg-surface rounded-lg p-3.5 border border-border space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-3">Latitude / Longitude:</span>
                  <span className="text-text font-bold">
                    {coordinates[1].toFixed(4)}° N, {coordinates[0].toFixed(4)}° E
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-3">Location Source:</span>
                  <span className="text-text font-medium flex items-center gap-1">
                    {isLocationCached ? (
                      <span className="text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                        Cached from last check
                      </span>
                    ) : (
                      <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                        Live GPS {accuracyMeters ? `(±${accuracyMeters}m)` : ''}
                      </span>
                    )}
                  </span>
                </div>
                <div className="text-[11px] text-text-3 pt-1 border-t border-border/80">
                  Exact coordinates will be attached automatically to the distress SMS dispatch.
                </div>
              </div>

              {/* Big Send SOS Button */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleSendSos}
                  disabled={isDispatching}
                  className="w-full py-4 px-6 bg-sos hover:bg-red-700 text-white font-extrabold text-base rounded-btn shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sos/40 cursor-pointer"
                >
                  {isDispatching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Transmitting SOS Dispatch...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Send SOS & Dispatch SMS</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-text-3 mt-2">
                  Transmits event to RouteX response network (or queues offline) & opens SMS simulation.
                </p>
              </div>
            </div>

            {/* Emergency Info Callout */}
            <div className="bg-slate-900 text-white rounded-card p-5 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                Emergency SMS Simulation Protocol
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                When activated, RouteX composes the exact standard distress message with your GPS coordinates and Google Maps link, dispatched to your emergency contacts or local response nodes.
              </p>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Simulated delivery format complies with Doc 01 / Doc 03 standards.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Safer Options Nearby (Shelters / Stays sorted by safety then distance) */}
        <div className="bg-white border border-border rounded-card p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-h3 font-bold text-text flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand" />
                Safer Options Nearby (15 km Radius)
              </h2>
              <p className="text-xs text-text-2 mt-0.5">
                Nearby emergency shelters, guest houses, and medical facilities sorted strictly by safety level then distance.
              </p>
            </div>
            <span className="text-[11px] text-text-3 font-mono">
              Safe options only (Severe & Blocked excluded)
            </span>
          </div>

          {loadingStays ? (
            <div className="py-10 flex flex-col items-center justify-center text-text-3">
              <Loader2 className="w-6 h-6 animate-spin text-brand mb-2" />
              <span className="text-xs font-mono">Evaluating slope stability and nearby shelters...</span>
            </div>
          ) : saferStays.length === 0 ? (
            <div className="py-8 text-center text-text-3 text-xs bg-surface rounded-lg border border-border">
              No verified safe shelters found within 15 km of this location. Stay sheltered on solid high ground.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {saferStays.map((stay) => (
                <Card
                  key={stay.id}
                  className="p-4 border-border bg-surface hover:shadow-xs transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <RiskBadge
                        level={stay.riskLevel.toLowerCase() as BadgeRiskLevel}
                        score={stay.riskScore}
                        size="sm"
                      />
                      {stay.isSponsored && <SponsoredBadge />}
                    </div>

                    <h4 className="font-semibold text-text text-sm leading-snug line-clamp-1">
                      {stay.name}
                    </h4>

                    {/* "Why this stay" line from real fields only */}
                    <div className="text-xs text-text-2 mt-2 leading-relaxed">
                      <span className="text-brand font-medium">Why this stay:</span>{' '}
                      <span>{stay.whyThisStay}</span>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="font-mono text-text-3">
                      {stay.distanceKm !== undefined ? `${stay.distanceKm} km` : 'Nearby'}
                    </span>
                    <a
                      href={`https://maps.google.com/?q=${stay.coordinates[1]},${stay.coordinates[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand font-semibold hover:underline"
                    >
                      Directions →
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SMS Simulation Modal */}
      <SmsSimulationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dispatchResult={dispatchResult}
      />
    </div>
  );
};
