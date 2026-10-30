import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Thermometer,
  CloudRain,
  CloudLightning,
  Wind,
  Droplets,
  Snowflake,
  Layers,
  Activity,
  ArrowRight,
  ShieldAlert,
  Car,
  Footprints,
  Compass,
  ArrowRightLeft,
  FileText,
  Gift,
  Award,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Sparkles,
} from 'lucide-react';

import { WeatherBox } from '../components/weather/WeatherBox';
import { AlertsStrip } from '../components/weather/AlertsStrip';
import { LocationPicker } from '../features/location/LocationPicker';
import type { SelectedLocation } from '../features/location/types';
import { fetchLocationWeather } from '../features/weather/openMeteoClient';
import type { WeatherSummary, WeatherAlert, AreaRiskEstimate } from '../features/weather/types';
import { deriveWeatherAlerts } from '../features/weather/weatherHelpers';
import { scoreSingleLocation } from '../features/risk/dataAdapters';
import { useDemoStore } from '../lib/demoStore';
import { fetchNearbyEarthquakes } from '../features/quakes/usgsClient';
import type { EarthquakeSummary } from '../features/quakes/types';
import { RouteXMap } from '../components/map/RouteXMap';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { RiskBadge } from '../components/ui/RiskBadge';
import { RiskMeter } from '../components/ui/RiskMeter';
import { supabase } from '../lib/supabase';
import { useAuth } from '../features/auth/AuthContext';

// Default initial hill location: Shimla, Himachal Pradesh
const DEFAULT_LOCATION: SelectedLocation = {
  name: 'Shimla, Himachal Pradesh',
  admin1: 'Himachal Pradesh',
  country: 'India',
  latitude: 31.1048,
  longitude: 77.1734,
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const demoMode = useDemoStore((state) => state.demoMode);

  // Location State
  const [location, setLocation] = useState<SelectedLocation>(DEFAULT_LOCATION);
  const [isLocatingDevice, setIsLocatingDevice] = useState<boolean>(false);

  // Weather & Hazards State
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Earthquakes State
  const [quakes, setQuakes] = useState<EarthquakeSummary | null>(null);

  // Alerts & Area Risk
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [areaRisk, setAreaRisk] = useState<AreaRiskEstimate | null>(null);

  // Route Search Card State
  const [fromQuery, setFromQuery] = useState<string>('Shimla, HP');
  const [toQuery, setToQuery] = useState<string>('Manali, HP');
  const [routeMode, setRouteMode] = useState<'drive' | 'walk'>('drive');

  // Real Database Statistics (excluding test data)
  const [realStats, setRealStats] = useState<{ verifiedReports: number; contributors: number; safeStays: number }>({
    verifiedReports: 0,
    contributors: 0,
    safeStays: 0,
  });

  // Load weather and quakes for selected location
  const loadData = useCallback(async (loc: SelectedLocation) => {
    setWeatherLoading(true);
    setWeatherError(null);

    try {
      // 1. Fetch Weather
      const weatherData = await fetchLocationWeather(loc.latitude, loc.longitude);
      setWeather(weatherData);

      // 2. Fetch Earthquakes
      let quakeData: EarthquakeSummary | null = null;
      try {
        quakeData = await fetchNearbyEarthquakes(loc.latitude, loc.longitude);
        setQuakes(quakeData);
      } catch {
        // Earthquake feed failure is non-fatal to weather display
      }

      // 3. Derive IMD Alerts & Single-point Area Risk
      if (weatherData.raw?.hourly) {
        const derived = deriveWeatherAlerts(
          weatherData.raw.hourly,
          weatherData.windGustsKmh,
          weatherData.raw.current?.time
        );

        // Add earthquake alert if M4.5+ within 300 km in last 72h
        const closeQuake = quakeData?.events.find((q) => q.distanceKm !== undefined && q.distanceKm <= 300);
        if (closeQuake) {
          const dist = closeQuake.distanceKm ?? 999;
          derived.unshift({
            id: `quake-${closeQuake.id}`,
            title: `Seismic Activity Alert (M${closeQuake.magnitude})`,
            description: `M${closeQuake.magnitude} earthquake recorded ${dist} km away near ${closeQuake.place} (${closeQuake.timeAgo}).`,
            severity: dist <= 100 ? 'severe' : 'high',
            source: 'USGS Hazards',
            timestamp: closeQuake.timeAgo,
          });
        }

        setAlerts(derived);

        // Calculate single-point area risk estimate with 4-neighbour slope sample via P7 engine
        const singleRisk = await scoreSingleLocation(
          loc.latitude,
          loc.longitude,
          {
            accumRain72h:
              weatherData.precipitation24hMm * 1.5 +
              0.5 * weatherData.precipitationNext72hMm,
            maxHourly24h: Math.max(1, weatherData.precipitation24hMm / 6),
            soilMoisture: weatherData.soilMoistureM3,
          },
          demoMode
        );

        setAreaRisk({
          score: singleRisk.score,
          level: singleRisk.level,
          label: singleRisk.isBlocked
            ? 'Blocked Obstruction'
            : `${singleRisk.level} Hazard Risk`,
          factors: {
            rainScore: Math.round(singleRisk.factors.rain * 100),
            soilScore: Math.round(singleRisk.factors.soil * 100),
            seismicScore: Math.round(singleRisk.factors.seismic * 100),
          },
        });
      }
    } catch (err) {
      setWeatherError((err as Error).message || 'Failed to load weather data');
    } finally {
      setWeatherLoading(false);
    }
  }, [demoMode]);

  // Initial load and on location/demoMode change
  useEffect(() => {
    loadData(location);
  }, [location, demoMode, loadData]);

  // Load Real Statistics from Database
  useEffect(() => {
    async function loadStats() {
      try {
        // Count verified real reports
        const { count: reportsCount } = await supabase
          .from('hazard_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'verified')
          .eq('is_test', false);

        // Count real registered profiles
        const { count: profileCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Count real non-demo safe partners
        const { count: staysCount } = await supabase
          .from('partners')
          .select('*', { count: 'exact', head: true })
          .eq('is_demo', false);

        setRealStats({
          verifiedReports: reportsCount || 0,
          contributors: profileCount || 0,
          safeStays: staysCount || 0,
        });
      } catch {
        // Fallback to 0
      }
    }
    loadStats();
  }, []);

  // Device Geolocation Handler
  const handleUseDeviceLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocatingDevice(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingDevice(false);
        const newLoc: SelectedLocation = {
          name: `Current Location (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`,
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4)),
          isDeviceLocation: true,
        };
        setLocation(newLoc);
      },
      (err) => {
        setIsLocatingDevice(false);
        console.warn('Geolocation error:', err.message);
        alert('Could not access your location. Please check browser permissions or select a city.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleRouteSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromQuery.trim() || !toQuery.trim()) return;
    navigate(`/route?from=${encodeURIComponent(fromQuery)}&to=${encodeURIComponent(toQuery)}&mode=${routeMode}`);
  };

  const handleSwapRoute = () => {
    setFromQuery(toQuery);
    setToQuery(fromQuery);
  };

  const updatedTimeFormatted = weather?.fetchedAt
    ? new Date(weather.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : undefined;

  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-6 space-y-6">
      {/* 1. Location Bar & Weather Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-card border border-border shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-3 font-medium">Weather for:</span>
          <LocationPicker
            currentLocation={location}
            onSelectLocation={(loc) => setLocation(loc)}
            onUseDeviceLocation={handleUseDeviceLocation}
            isLocatingDevice={isLocatingDevice}
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-text-3 font-mono">
          {weather?.isCached && (
            <span className="text-[11px] bg-surface-2 text-text-2 px-2 py-0.5 rounded-chip border border-border">
              Offline cached ({weather.cachedAgeDesc})
            </span>
          )}
          {updatedTimeFormatted && <span>Updated {updatedTimeFormatted}</span>}
        </div>
      </div>

      {/* 2. Top Weather Row: 8 WeatherBoxes + 1 Area Risk Box */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
        {/* 1. Temperature */}
        <WeatherBox
          icon={Thermometer}
          label="Temperature"
          value={weather?.temperatureC}
          unit="°C"
          subtitle={weather ? (weather.temperatureC <= 0 ? 'Freezing' : weather.temperatureC <= 10 ? 'Cold' : 'Mild') : undefined}
          loading={weatherLoading}
          error={weatherError}
          onRetry={() => loadData(location)}
          isCached={weather?.isCached}
          cachedAgeDesc={weather?.cachedAgeDesc}
          updatedTime={updatedTimeFormatted}
        />

        {/* 2. Rain last 24h */}
        <WeatherBox
          icon={CloudRain}
          label="Rain 24h"
          value={weather?.precipitation24hMm}
          unit="mm"
          subtitle="Past accumulation"
          loading={weatherLoading}
          error={weatherError}
          onRetry={() => loadData(location)}
          isCached={weather?.isCached}
          cachedAgeDesc={weather?.cachedAgeDesc}
          updatedTime={updatedTimeFormatted}
          statusBadge={
            weather && weather.precipitation24hMm >= 35
              ? { text: 'Elevated Rain', variant: 'high' }
              : undefined
          }
        />

        {/* 3. Rain next 72h */}
        <WeatherBox
          icon={CloudLightning}
          label="Rain 72h"
          value={weather?.precipitationNext72hMm}
          unit="mm"
          subtitle="Forecast accumulation"
          loading={weatherLoading}
          error={weatherError}
          onRetry={() => loadData(location)}
          isCached={weather?.isCached}
          cachedAgeDesc={weather?.cachedAgeDesc}
          updatedTime={updatedTimeFormatted}
          statusBadge={
            weather && weather.precipitationNext72hMm >= 64.5
              ? { text: 'IMD Heavy Warning', variant: 'severe' }
              : undefined
          }
        />

        {/* 4. Wind & Gusts */}
        <WeatherBox
          icon={Wind}
          label="Wind & Gusts"
          value={weather?.windSpeedKmh}
          unit="km/h"
          subtitle={weather ? `Gusts to ${weather.windGustsKmh} km/h` : undefined}
          loading={weatherLoading}
          error={weatherError}
          onRetry={() => loadData(location)}
          isCached={weather?.isCached}
          cachedAgeDesc={weather?.cachedAgeDesc}
          updatedTime={updatedTimeFormatted}
          statusBadge={
            weather && weather.windGustsKmh >= 50
              ? { text: 'Squall Gusts', variant: 'moderate' }
              : undefined
          }
        />

        {/* 5. Humidity */}
        <WeatherBox
          icon={Droplets}
          label="Humidity"
          value={weather?.humidityPct}
          unit="%"
          subtitle={weather ? (weather.humidityPct >= 85 ? 'Dense mist / fog' : 'Normal') : undefined}
          loading={weatherLoading}
          error={weatherError}
          onRetry={() => loadData(location)}
          isCached={weather?.isCached}
          cachedAgeDesc={weather?.cachedAgeDesc}
          updatedTime={updatedTimeFormatted}
        />

        {/* 6. Snowfall */}
        <WeatherBox
          icon={Snowflake}
          label="Snow 24h"
          value={weather?.snowfallCm}
          unit="cm"
          subtitle="Forecast accumulation"
          loading={weatherLoading}
          error={weatherError}
          onRetry={() => loadData(location)}
          isCached={weather?.isCached}
          cachedAgeDesc={weather?.cachedAgeDesc}
          updatedTime={updatedTimeFormatted}
          statusBadge={
            weather && weather.snowfallCm >= 5
              ? { text: 'Chains Advised', variant: 'high' }
              : undefined
          }
        />

        {/* 7. Soil Wetness */}
        <WeatherBox
          icon={Layers}
          label="Soil Wetness"
          value={weather?.soilMoistureM3}
          unit="m³/m³"
          subtitle={weather?.soilMoistureDesc}
          loading={weatherLoading}
          error={weatherError}
          onRetry={() => loadData(location)}
          isCached={weather?.isCached}
          cachedAgeDesc={weather?.cachedAgeDesc}
          updatedTime={updatedTimeFormatted}
          statusBadge={
            weather && weather.soilMoistureM3 >= 0.38
              ? { text: 'Slope Saturation', variant: 'severe' }
              : undefined
          }
        />

        {/* 8. Earthquakes 72h */}
        <WeatherBox
          icon={Activity}
          label="Quakes 72h"
          value={quakes?.count72h ?? 0}
          unit="M4.5+"
          subtitle={
            quakes?.nearest
              ? `${quakes.nearest.distanceKm ?? 0} km (${quakes.nearest.timeAgo})`
              : 'India boundary'
          }
          source="USGS Hazards"
          loading={weatherLoading}
          error={weatherError}
          onRetry={() => loadData(location)}
          updatedTime={updatedTimeFormatted}
        />

        {/* 9. AREA RISK Box (Clearly labelled single-point estimate) */}
        <div className="p-3.5 bg-brand-soft/60 border border-brand/20 rounded-card flex flex-col justify-between min-h-[120px] shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand uppercase tracking-wider">Area Risk</span>
            <ShieldAlert size={16} className="text-brand shrink-0" />
          </div>

          <div className="my-1">
            {areaRisk ? (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <RiskBadge
                    level={areaRisk.level.toLowerCase() as 'low' | 'moderate' | 'high' | 'severe' | 'blocked'}
                    score={areaRisk.score}
                    size="sm"
                  />
                </div>
                <RiskMeter score={areaRisk.score} showBadge={false} />
              </div>
            ) : (
              <span className="text-xs text-text-3 italic">Calculating estimate...</span>
            )}
          </div>

          <p className="text-[10px] text-text-3 font-mono border-t border-brand/10 pt-1">
            Single-point 4-neighbour estimate
          </p>
        </div>
      </div>

      {/* 3. Live Forecast & Seismic Alerts Strip */}
      <AlertsStrip alerts={alerts} />

      {/* 4. Hero & Route Planning Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Hero Pitch */}
        <div className="lg:col-span-7 bg-gradient-to-br from-brand via-brand to-brand-hover text-white rounded-card p-6 sm:p-8 flex flex-col justify-between shadow-md">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-chip text-xs font-semibold bg-white/10 text-white border border-white/20">
              <Sparkles size={12} className="text-accent" />
              Mountain-Aware Navigation
            </span>
            <h2 className="text-h1 font-bold text-white tracking-tight leading-tight">
              Travel the mountains safely.
            </h2>
            <p className="text-body text-white/80 max-w-xl leading-relaxed">
              RouteX evaluates rainfall, steep slopes, live soil saturation, recent seismic events, and community blockages across the Himalayas and Northeast India.
            </p>
          </div>

          <div className="pt-6 border-t border-white/15 flex flex-wrap items-center gap-4 text-xs text-white/70">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-risk-low" />
              <span>Offline PMTiles maps</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-risk-low" />
              <span>Auto-reroute around active hazards</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-risk-low" />
              <span>Peer-verified reports</span>
            </div>
          </div>
        </div>

        {/* Right Route Card: From / To / Mode / Check Safety */}
        <div className="lg:col-span-5 bg-white border border-border rounded-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 font-bold text-brand">Plan a Safe Route</h3>
              <div className="flex items-center bg-surface border border-border rounded-btn p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setRouteMode('drive')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-btn font-medium transition-colors ${
                    routeMode === 'drive' ? 'bg-white shadow-xs text-brand font-semibold' : 'text-text-3'
                  }`}
                >
                  <Car size={13} /> Drive
                </button>
                <button
                  type="button"
                  onClick={() => setRouteMode('walk')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-btn font-medium transition-colors ${
                    routeMode === 'walk' ? 'bg-white shadow-xs text-brand font-semibold' : 'text-text-3'
                  }`}
                >
                  <Footprints size={13} /> Walk
                </button>
              </div>
            </div>

            <form onSubmit={handleRouteSearch} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-text-3 uppercase tracking-wider mb-1">
                  Origin (From)
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
                  <input
                    type="text"
                    value={fromQuery}
                    onChange={(e) => setFromQuery(e.target.value)}
                    placeholder="Enter starting point (e.g. Shimla)..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-btn bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-accent font-medium"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-center -my-1">
                <button
                  type="button"
                  onClick={handleSwapRoute}
                  aria-label="Swap origin and destination"
                  className="p-1 rounded-full bg-surface-2 border border-border text-text-3 hover:text-brand transition-colors"
                >
                  <ArrowRightLeft size={13} />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-3 uppercase tracking-wider mb-1">
                  Destination (To)
                </label>
                <div className="relative">
                  <Compass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
                  <input
                    type="text"
                    value={toQuery}
                    onChange={(e) => setToQuery(e.target.value)}
                    placeholder="Enter destination (e.g. Manali)..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-btn bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-accent font-medium"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-4"
                icon={<ArrowRight size={15} />}
              >
                Check Route Safety
              </Button>
            </form>
          </div>

          <p className="text-[11px] text-text-3 text-center mt-3 font-mono">
            Evaluates 6 hazard factors along mountain corridors
          </p>
        </div>
      </div>

      {/* 5. Mini Hazard Map (60%) & Latest Community Reports (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Mini Hazard Map */}
        <div className="lg:col-span-7 bg-white border border-border rounded-card p-4 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-h3 font-bold text-brand">Live Hazard Map</h3>
              <p className="text-xs text-text-2">
                Viewing {location.name} · Local offline vector layer active
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/map')}
              icon={<Compass size={13} />}
            >
              Full Screen Map
            </Button>
          </div>

          <div className="h-[380px] w-full rounded-btn overflow-hidden border border-border">
            <RouteXMap
              initialCenter={[location.longitude, location.latitude]}
              initialZoom={9}
              showControls={true}
              showLegend={false}
              showLayerPanel={false}
              className="h-full w-full"
            />
          </div>
        </div>

        {/* Right: Latest Reports Placeholder (Wireframe 6.1) */}
        <div className="lg:col-span-5 bg-white border border-border rounded-card p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-h3 font-bold text-brand">Recent Community Reports</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/reports')}
              className="text-xs"
            >
              View Feed
            </Button>
          </div>

          <div className="flex-1 flex flex-col justify-center py-4">
            <EmptyState
              icon={FileText}
              title="Community Reports Feed"
              description="Live peer-verified reports for this region will load here. Peer verification rules active in database."
              action={
                <Button variant="secondary" size="sm" onClick={() => navigate('/report')}>
                  Report a Hazard
                </Button>
              }
            />
          </div>

          <p className="text-[11px] text-text-3 text-center pt-2 border-t border-border font-mono">
            Verified when 3+ travelers confirm hazard presence
          </p>
        </div>
      </div>

      {/* 6. Sponsored Stays Placeholder (Section 6.1 & 6.9) */}
      <div className="bg-white border border-border rounded-card p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-h3 font-bold text-brand">Verified Safe Stays</h3>
              <span className="px-2 py-0.5 rounded-chip text-[10px] font-semibold bg-sponsored-soft text-sponsored border border-sponsored/30 uppercase tracking-wide">
                Sponsored (Demo)
              </span>
            </div>
            <p className="text-xs text-text-2">
              Homestays and shelters located outside active landslide runout paths.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/stays')}
          >
            Explore All Stays
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
          {[
            {
              name: 'Demo Himalayan Pine Homestay',
              city: 'Shimla',
              reason: 'Stable bedrock slope; 0 reports in 5 km',
              points: '50 pts coupon',
            },
            {
              name: 'Demo Valley View Mountain Lodge',
              city: 'Manali',
              reason: 'Elevated bedrock; backup generator',
              points: '30 pts meal',
            },
            {
              name: 'Demo Cloud Peak Trekker Haven',
              city: 'Shillong',
              reason: 'Offline trail guides; gear dry room',
              points: '45 pts coupon',
            },
            {
              name: 'Demo Mountain Trail Outfitter',
              city: 'Guwahati',
              reason: 'Safety poles & emergency gear rental',
              points: '25 pts gear',
            },
          ].map((stay) => (
            <Card key={stay.name} className="p-3.5 border-border bg-surface hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-chip bg-risk-low-soft text-risk-low border border-risk-low/30">
                  Low Risk Location
                </span>
                <span className="text-[10px] text-text-3 font-mono">{stay.city}</span>
              </div>
              <h4 className="font-semibold text-text text-xs line-clamp-1 mt-1">{stay.name}</h4>
              <p className="text-[11px] text-text-2 line-clamp-2 mt-1 leading-relaxed">{stay.reason}</p>
              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/60 text-xs">
                <span className="text-brand font-medium text-[11px] font-mono">{stay.points}</span>
                <button
                  type="button"
                  onClick={() => navigate('/rewards')}
                  className="text-accent hover:underline text-[11px] font-medium"
                >
                  Redeem →
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 7. Rewards Teaser Card */}
      <div className="bg-gradient-to-r from-surface to-brand-soft/40 border border-border rounded-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-brand-soft border border-brand/20 flex items-center justify-center text-brand shrink-0">
            <Gift size={22} className="text-brand" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-text text-sm sm:text-base">
                Community Karma & Safety Rewards
              </h4>
              <span className="px-2 py-0.5 rounded-chip text-[11px] font-mono font-bold bg-brand text-white">
                {profile?.points ?? 100} PTS
              </span>
            </div>
            <p className="text-xs text-text-2 mt-0.5">
              Report hazards, verify road obstacles, and earn partner discounts on mountain stays and gear.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/rewards')}
          icon={<Award size={14} className="text-accent" />}
        >
          View Rewards Store
        </Button>
      </div>

      {/* 8. How It Works (4 Steps) */}
      <div className="bg-white border border-border rounded-card p-6 shadow-xs">
        <h3 className="text-h3 font-bold text-brand mb-1 text-center">How RouteX Works</h3>
        <p className="text-xs text-text-2 text-center mb-6">
          Explainable, layered disaster awareness designed for mountain travellers and trekkers.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              step: '01',
              title: 'Live Weather & Soil Saturation',
              desc: 'High-resolution Open-Meteo forecasts track rain accumulation, shallow soil wetness, wind gusts, and snow.',
              icon: CloudLightning,
            },
            {
              step: '02',
              title: 'Terrain & Elevation Gradients',
              desc: 'Slope angles sampled at 250m intervals identify critical slip thresholds and unstable cut slopes.',
              icon: Layers,
            },
            {
              step: '03',
              title: 'Peer-Verified Hazards',
              desc: 'Crowdsourced reports with thumbs up/down validation ensure trusted situational awareness.',
              icon: CheckCircle2,
            },
            {
              step: '04',
              title: 'Offline-Ready Maps',
              desc: 'Vector PMTiles stored directly in your browser allow uninterrupted navigation when mobile towers fail.',
              icon: Compass,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="p-4 bg-surface rounded-card border border-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-accent">{item.step}</span>
                    <Icon size={18} className="text-brand" />
                  </div>
                  <h4 className="font-bold text-text text-xs leading-snug mb-1">{item.title}</h4>
                  <p className="text-[11px] text-text-2 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 9. Real Statistics Bar (FR-H5: Database Counts Excluding Test Data) */}
      <div className="bg-surface border border-border rounded-card p-4 shadow-xs flex flex-col sm:flex-row items-center justify-around gap-4 text-center">
        <div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-brand">
            {realStats.verifiedReports}
          </div>
          <div className="text-[11px] text-text-2 font-medium">Verified Community Reports</div>
          <div className="text-[10px] text-text-3 font-mono">Excludes test records</div>
        </div>

        <div className="hidden sm:block h-8 w-px bg-border" />

        <div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-brand">
            {realStats.contributors}
          </div>
          <div className="text-[11px] text-text-2 font-medium">Registered Mountain Travelers</div>
          <div className="text-[10px] text-text-3 font-mono">Real community members</div>
        </div>

        <div className="hidden sm:block h-8 w-px bg-border" />

        <div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-brand">
            {realStats.safeStays}
          </div>
          <div className="text-[11px] text-text-2 font-medium">Verified Safe Shelter Points</div>
          <div className="text-[10px] text-text-3 font-mono">OSM validated entries</div>
        </div>
      </div>

      {/* Disclaimer Line */}
      <div className="text-center text-[11px] text-text-3 font-mono flex items-center justify-center gap-1.5 py-1">
        <AlertCircle size={12} className="text-risk-moderate shrink-0" />
        <span>RouteX provides explainable risk estimates. Always follow local disaster authority directives.</span>
      </div>
    </div>
  );
};
