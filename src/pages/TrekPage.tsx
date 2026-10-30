import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Footprints,
  LifeBuoy,
  CheckCircle2,
  BatteryCharging,
  Wifi,
  WifiOff,
  Building2,
  Loader2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { RiskBadge } from '../components/ui/RiskBadge';
import { LocationPicker } from '../features/location/LocationPicker';
import type { SelectedLocation } from '../features/location/types';
import { fetchLocationWeather } from '../features/weather/openMeteoClient';
import { scoreSingleLocation } from '../features/risk/dataAdapters';
import { fetchNearbyStays } from '../features/stays/staysService';
import type { StayCandidate } from '../features/stays/types';
import { useDemoStore } from '../lib/demoStore';
import { enqueueAction } from '../features/offline/queueService';
import { useAuth } from '../features/auth/AuthContext';

const DEFAULT_TREK_LOCATION: SelectedLocation = {
  name: 'Tawang, Arunachal Pradesh',
  admin1: 'Arunachal Pradesh',
  country: 'India',
  latitude: 27.5833,
  longitude: 91.8667,
};

export const TrekPage: React.FC = () => {
  const demoMode = useDemoStore((state) => state.demoMode);
  const { user } = useAuth();

  const [currentLocation, setCurrentLocation] = useState<SelectedLocation>(DEFAULT_TREK_LOCATION);
  const [trailRisk, setTrailRisk] = useState<{
    score: number;
    level: string;
    isBlocked: boolean;
  } | null>(null);
  const [loadingRisk, setLoadingRisk] = useState<boolean>(true);

  const [shelters, setShelters] = useState<StayCandidate[]>([]);
  const [loadingShelters, setLoadingShelters] = useState<boolean>(true);

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Check-in state
  const [lastCheckInTime, setLastCheckInTime] = useState<string | null>(() => {
    return localStorage.getItem('routex_last_checkin_time');
  });
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [checkInSuccess, setCheckInSuccess] = useState<boolean>(false);

  // Online / Offline listener
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Fetch trail risk & nearby shelters for walking trekker
  const loadTrekData = useCallback(async () => {
    setLoadingRisk(true);
    setLoadingShelters(true);

    try {
      // 1. Weather & Slope Single-Point Risk Estimate
      const weather = await fetchLocationWeather(
        currentLocation.latitude,
        currentLocation.longitude
      );

      const weatherPayload = weather
        ? {
            accumRain72h: weather.precipitation24hMm * 1.5 + 0.5 * weather.precipitationNext72hMm,
            maxHourly24h: Math.max(1, weather.precipitation24hMm / 6),
            soilMoisture: weather.soilMoistureM3,
          }
        : {
            accumRain72h: 0,
            maxHourly24h: 0,
            soilMoisture: 0.25,
          };

      const singleRisk = await scoreSingleLocation(
        currentLocation.latitude,
        currentLocation.longitude,
        weatherPayload,
        demoMode
      );

      setTrailRisk({
        score: singleRisk.score,
        level: singleRisk.level,
        isBlocked: singleRisk.isBlocked,
      });
    } catch (err) {
      console.warn('[TrekPage] Error scoring trail:', err);
    } finally {
      setLoadingRisk(false);
    }

    try {
      // 2. Fetch nearest emergency shelters & mountain guest houses
      const staysData = await fetchNearbyStays(
        currentLocation.latitude,
        currentLocation.longitude,
        15,
        true
      );
      // Prioritize top shelters
      setShelters(staysData.stays.slice(0, 5));
    } catch (err) {
      console.warn('[TrekPage] Error fetching shelters:', err);
    } finally {
      setLoadingShelters(false);
    }
  }, [currentLocation, demoMode]);

  useEffect(() => {
    loadTrekData();
  }, [loadTrekData]);

  // Handle "I'm Safe" check-in
  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullTime = `${nowStr} · ${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}`;

    try {
      // Enqueue check-in action (auto-syncs online, persists offline)
      await enqueueAction('checkin', {
        userId: user?.id || 'anonymous_trekker',
        locationName: currentLocation.name,
        coordinates: [currentLocation.longitude, currentLocation.latitude],
        timestamp: new Date().toISOString(),
      });

      localStorage.setItem('routex_last_checkin_time', fullTime);
      setLastCheckInTime(fullTime);
      setCheckInSuccess(true);
      setTimeout(() => setCheckInSuccess(false), 4000);

      window.dispatchEvent(
        new CustomEvent('routex:toast', {
          detail: {
            id: `toast-checkin-${Date.now()}`,
            type: 'success',
            title: "Check-in Recorded: I'm Safe",
            message: `Location verified at ${currentLocation.name}. Timestamp recorded.`,
          },
        })
      );
    } catch (err) {
      console.warn('Check-in error:', err);
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-950 text-white font-sans antialiased p-4 sm:p-6 lg:p-8 space-y-6">
      {/* High-Contrast Trek Mode Header */}
      <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Footprints size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Trek Mode
              </h1>
              <span className="text-xs text-slate-400 font-mono">
                High-contrast battery-light display for walking trails
              </span>
            </div>
          </div>
        </div>

        {/* Offline & Battery Status Badges */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <Wifi size={13} /> Online GPS
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
              <WifiOff size={13} /> Offline Mode
            </span>
          )}

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800">
            <BatteryCharging size={13} className="text-emerald-400" /> Battery-Saver
          </span>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Location, Trail Risk & Check-in */}
        <div className="lg:col-span-2 space-y-6">
          {/* Location Selector */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Trailhead / Position
            </span>
            <LocationPicker
              currentLocation={currentLocation}
              onSelectLocation={(loc) => setCurrentLocation(loc)}
            />
          </div>

          {/* Large High-Contrast Trail Risk Card */}
          <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono font-bold text-slate-400 tracking-wider">
                Current Trailhead Slope & Weather Risk
              </span>
              {trailRisk && (
                <RiskBadge
                  level={
                    trailRisk.isBlocked
                      ? 'blocked'
                      : (trailRisk.level.toLowerCase() as
                          | 'low'
                          | 'moderate'
                          | 'high'
                          | 'severe'
                          | 'blocked')
                  }
                  score={trailRisk.score}
                  size="lg"
                />
              )}
            </div>

            {loadingRisk ? (
              <div className="py-6 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 size={20} className="animate-spin text-emerald-400" />
                <span className="text-sm font-mono">Sampling terrain slopes & precipitation...</span>
              </div>
            ) : trailRisk ? (
              <div className="space-y-3">
                <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white flex items-baseline gap-3">
                  <span>{trailRisk.score}</span>
                  <span className="text-lg font-normal text-slate-400">/ 100</span>
                  <span className="text-xl sm:text-2xl font-bold text-emerald-400 ml-2">
                    {trailRisk.level}
                  </span>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  Single-point mountain hazard evaluation factoring rainfall accumulation, soil saturation, slope inclination (Open-Meteo elevation), and nearby seismic history.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Trail risk unavailable for this location.</p>
            )}
          </div>

          {/* "I'm Safe" Check-In Banner */}
          <div className="bg-emerald-950/40 border border-emerald-500/30 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <h3 className="text-base font-bold text-white">Trekker Safety Check-In</h3>
              </div>
              <p className="text-xs text-slate-300">
                {lastCheckInTime
                  ? `Last verified check-in: ${lastCheckInTime}`
                  : 'Press to timestamp your current trail coordinates into local memory.'}
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleCheckIn}
              loading={isCheckingIn}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-3 shrink-0"
              icon={<CheckCircle2 size={16} />}
            >
              {checkInSuccess ? "Checked In!" : "I'm Safe"}
            </Button>
          </div>
        </div>

        {/* Right Column: SOS Button & Nearest Shelters */}
        <div className="space-y-6">
          {/* Prominent High-Contrast Emergency SOS Card */}
          <div className="bg-red-950/50 border-2 border-red-600/60 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <LifeBuoy size={24} className="animate-pulse" />
              <h2 className="text-lg font-extrabold uppercase tracking-wide text-white">
                Emergency SOS
              </h2>
            </div>

            <p className="text-xs text-red-200/90 leading-relaxed">
              If trapped by landslide, injured on trail, or disoriented without cell coverage, open Emergency SOS for offline survival guides and 112 distress dispatch.
            </p>

            <Link to="/sos" className="block w-full">
              <Button
                variant="danger"
                size="lg"
                className="w-full py-4 text-base font-black tracking-wider uppercase bg-red-600 hover:bg-red-500 text-white shadow-lg"
                icon={<LifeBuoy size={20} />}
              >
                Open Emergency SOS
              </Button>
            </Link>
          </div>

          {/* Nearest Shelters & Mountain Guest Houses */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-300">
                <Building2 size={16} className="text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Nearest Shelters
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">OpenStreetMap</span>
            </div>

            {loadingShelters ? (
              <div className="py-4 text-center text-xs text-slate-400 font-mono">
                Locating safe mountain shelters...
              </div>
            ) : shelters.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No shelters recorded within 15 km of this trail point.
              </p>
            ) : (
              <div className="space-y-2.5">
                {shelters.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold text-white">
                      <span className="truncate">{s.name}</span>
                      <span className="text-[11px] font-mono text-emerald-400 shrink-0 ml-1">
                        {s.distanceKm ? `${s.distanceKm.toFixed(1)} km` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="capitalize">{s.category.replace('_', ' ')}</span>
                      <span className="font-mono text-slate-400">{s.riskLevel} Risk</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Link
              to="/stays"
              className="block text-center text-xs text-emerald-400 hover:underline pt-1 font-semibold"
            >
              View all mountain stays & shelters →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
