import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Hotel,
  Shield,
  MapPin,
  Navigation,
  List,
  Map as MapIcon,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { RiskBadge, RiskLevel as BadgeRiskLevel } from '../components/ui/RiskBadge';
import { SponsoredBadge } from '../components/ui/StatusBadges';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { RouteXMap } from '../components/map/RouteXMap';
import type { LayerManagerAPI, MarkerHandle } from '../features/map/types';
import { fetchNearbyStays, STAYS_ATTRIBUTION } from '../features/stays/staysService';
import type { StayCandidate, StayCategory } from '../features/stays/types';
import { LocationPicker } from '../features/location/LocationPicker';
import type { SelectedLocation } from '../features/location/types';

const DEFAULT_LOCATION: SelectedLocation = {
  name: 'Shimla, Himachal Pradesh',
  latitude: 31.1048,
  longitude: 77.1734,
};

const CATEGORIES: { id: StayCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Places' },
  { id: 'hotel', label: 'Hotels' },
  { id: 'guest_house', label: 'Guest Houses' },
  { id: 'hostel', label: 'Hostels' },
  { id: 'shelter', label: 'Shelters' },
  { id: 'hospital', label: 'Hospitals / Clinics' },
];

export const StaysPage: React.FC = () => {
  // Location
  const [location, setLocation] = useState<SelectedLocation>(DEFAULT_LOCATION);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Filters
  const [radiusKm, setRadiusKm] = useState<number>(15);
  const [safeOnly, setSafeOnly] = useState<boolean>(true); // default true per spec
  const [selectedCategory, setSelectedCategory] = useState<StayCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Stays Data
  const [allStays, setAllStays] = useState<StayCandidate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fromCache, setFromCache] = useState<boolean>(false);

  // Map state
  const mapApiRef = useRef<LayerManagerAPI | null>(null);
  const markersRef = useRef<MarkerHandle[]>([]);
  const [selectedStay, setSelectedStay] = useState<StayCandidate | null>(null);

  // Geolocation trigger
  const handleUseDeviceLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        setLocation({
          name: `Device Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
          latitude: lat,
          longitude: lon,
          isDeviceLocation: true,
        });
      },
      () => {
        setIsLocating(false);
        alert('Could not determine your device location.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Fetch stays when location or radius changes
  useEffect(() => {
    let isMounted = true;
    async function loadStays() {
      setIsLoading(true);
      try {
        const res = await fetchNearbyStays(
          location.latitude,
          location.longitude,
          radiusKm,
          true
        );
        if (isMounted) {
          setAllStays(res.stays);
          setFromCache(res.fromCache);
        }
      } catch (err) {
        console.warn('Failed to load stays:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadStays();
    return () => {
      isMounted = false;
    };
  }, [location.latitude, location.longitude, radiusKm]);

  // Filtered stays
  const filteredStays = useMemo(() => {
    return allStays.filter((stay) => {
      // 1. Safe only filter (Low and Moderate only; Severe is already hidden)
      if (safeOnly && stay.riskLevel !== 'Low' && stay.riskLevel !== 'Moderate') {
        return false;
      }
      // 2. Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'hospital') {
          if (stay.category !== 'hospital' && stay.category !== 'clinic') return false;
        } else if (stay.category !== selectedCategory) {
          return false;
        }
      }
      return true;
    });
  }, [allStays, safeOnly, selectedCategory]);

  // Update Map markers when filteredStays or viewMode changes
  useEffect(() => {
    const api = mapApiRef.current;
    if (!api || viewMode !== 'map') return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add markers for filtered stays
    filteredStays.forEach((stay) => {
      let icon = 'building-2';
      if (stay.category === 'hotel') icon = 'hotel';
      if (stay.category === 'shelter') icon = 'shield-check';
      if (stay.category === 'hospital' || stay.category === 'clinic') icon = 'cross';

      const color =
        stay.riskLevel === 'Low'
          ? '#15803D'
          : stay.riskLevel === 'Moderate'
            ? '#B45309'
            : '#C2410C';

      const handle = api.addMarker({
        lngLat: stay.coordinates,
        icon,
        color,
        popup: {
          title: stay.name,
          description: `${stay.whyThisStay || ''}${stay.city ? ` · ${stay.city}` : ''}`,
          badge: `${stay.riskLevel} (${stay.riskScore})`,
        },
      });

      markersRef.current.push(handle);
    });

    // Fly to center
    api.flyTo([location.longitude, location.latitude], 12);
  }, [filteredStays, viewMode, location]);

  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded">
              Shelters & Havens
            </span>
            {fromCache && (
              <span className="text-xs font-mono text-text-3 bg-surface px-2 py-0.5 rounded border border-border">
                Cached 24h
              </span>
            )}
          </div>
          <h1 className="text-h1 font-bold text-brand">Safe Stays & Shelters</h1>
          <p className="text-body text-text-2 mt-1 max-w-2xl">
            Real accommodations from OpenStreetMap evaluated by RouteX slope and hazard algorithms.
            Safe havens ranked first; severe zones excluded.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-surface p-1 rounded-btn border border-border self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-semibold transition-all ${
              viewMode === 'list'
                ? 'bg-white text-brand shadow-xs border border-border/80'
                : 'text-text-2 hover:text-text'
            }`}
          >
            <List size={14} />
            List View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-semibold transition-all ${
              viewMode === 'map'
                ? 'bg-white text-brand shadow-xs border border-border/80'
                : 'text-text-2 hover:text-text'
            }`}
          >
            <MapIcon size={14} />
            Map View
          </button>
        </div>
      </div>

      {/* Control Bar: Location, Radius, Safe-Only Switch */}
      <Card className="p-4 mb-6 border-border bg-white shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
          {/* Location Picker */}
          <div className="md:col-span-6">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-3 mb-1">
              Search Location
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <LocationPicker
                  currentLocation={location}
                  onSelectLocation={(loc) => setLocation(loc)}
                  onUseDeviceLocation={handleUseDeviceLocation}
                  isLocatingDevice={isLocating}
                />
              </div>
              <Button
                variant="secondary"
                size="md"
                onClick={handleUseDeviceLocation}
                disabled={isLocating}
                icon={<MapPin size={14} className={isLocating ? 'animate-spin' : ''} />}
                title="Use Current Device Location"
              >
                <span className="hidden sm:inline">GPS</span>
              </Button>
            </div>
          </div>

          {/* Search Radius */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-3 mb-1">
              Search Radius
            </label>
            <div className="flex items-center gap-1.5">
              {[5, 15, 30].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-btn border transition-all ${
                    radiusKm === r
                      ? 'bg-brand text-white border-brand'
                      : 'bg-surface text-text-2 border-border hover:bg-surface-hover'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {/* Safe Only Filter Switch (Default: ON) */}
          <div className="md:col-span-3 flex md:justify-end items-center pt-2 md:pt-0">
            <label
              htmlFor="safe-only-toggle"
              className="flex items-center gap-2.5 p-2 bg-surface hover:bg-surface-hover rounded-btn border border-border cursor-pointer select-none"
            >
              <input
                id="safe-only-toggle"
                type="checkbox"
                checked={safeOnly}
                onChange={(e) => setSafeOnly(e.target.checked)}
                className="w-4 h-4 text-brand rounded border-border focus:ring-accent accent-brand cursor-pointer"
              />
              <div>
                <div className="text-xs font-bold text-text flex items-center gap-1">
                  <Shield size={12} className="text-brand" />
                  Safe Only Filter
                </div>
                <div className="text-[10px] text-text-3">Low & Moderate only</div>
              </div>
            </label>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t border-border">
          <SlidersHorizontal size={13} className="text-text-3 mr-1 flex-shrink-0" />
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                  isActive
                    ? 'bg-brand text-white border-brand'
                    : 'bg-surface text-text-2 border-border hover:border-text-3'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Main Content Area */}
      {viewMode === 'list' ? (
        // List View
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-4 border-border space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </Card>
              ))}
            </div>
          ) : filteredStays.length === 0 ? (
            <EmptyState
              icon={Hotel}
              title="No Stays Found"
              description={`No accommodations matching your filters were found within ${radiusKm} km of ${location.name}. Try expanding the search radius or disabling 'Safe Only'.`}
              action={
                safeOnly ? (
                  <Button variant="secondary" size="sm" onClick={() => setSafeOnly(false)}>
                    Show All Risk Levels
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStays.map((stay) => (
                <Card
                  key={stay.id}
                  className="p-4 border-border bg-white hover:shadow-xs transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Top status bar */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <RiskBadge
                        level={stay.riskLevel.toLowerCase() as BadgeRiskLevel}
                        score={stay.riskScore}
                        size="sm"
                      />
                      {stay.isSponsored && <SponsoredBadge />}
                    </div>

                    {/* Stay Name */}
                    <h3 className="font-bold text-text text-sm leading-snug line-clamp-1">
                      {stay.name}
                    </h3>

                    {/* "Why this stay" line built strictly from real fields */}
                    <div className="text-xs text-text-2 mt-2 leading-relaxed bg-surface p-2 rounded border border-border/60">
                      <span className="text-brand font-semibold">Why this stay:</span>{' '}
                      <span>{stay.whyThisStay}</span>
                    </div>

                    {/* Amenity / Category tags */}
                    {stay.amenityTags && stay.amenityTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {stay.amenityTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center text-[10px] text-text-3 bg-surface px-1.5 py-0.5 rounded border border-border/80"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 mt-4 border-t border-border flex items-center justify-between text-xs">
                    <span className="font-mono text-text-2 font-medium">
                      {stay.distanceKm !== undefined ? `${stay.distanceKm} km away` : 'Nearby'}
                    </span>
                    <a
                      href={`https://maps.google.com/?q=${stay.coordinates[1]},${stay.coordinates[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                    >
                      Directions
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Map View
        <div className="space-y-4">
          <div className="h-[600px] w-full rounded-card overflow-hidden border border-border shadow-xs relative">
            <RouteXMap
              initialCenter={[location.longitude, location.latitude]}
              initialZoom={12}
              onMapReady={(api) => {
                mapApiRef.current = api;
              }}
              onMapClick={(coords) => {
                // Find closest stay if clicked near one
                const clickedStay = filteredStays.find((s) => {
                  const dist = Math.hypot(
                    s.coordinates[0] - coords.lng,
                    s.coordinates[1] - coords.lat
                  );
                  return dist < 0.01;
                });
                setSelectedStay(clickedStay || null);
              }}
              showControls={true}
              showLegend={true}
              showLayerPanel={false}
              className="h-full w-full"
            />
          </div>

          {/* Selected Stay Drawer / Card if clicked */}
          {selectedStay && (
            <Card className="p-4 border-border bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <RiskBadge
                    level={selectedStay.riskLevel.toLowerCase() as BadgeRiskLevel}
                    score={selectedStay.riskScore}
                    size="sm"
                  />
                  {selectedStay.isSponsored && <SponsoredBadge />}
                  <span className="text-xs text-text-3 font-mono">
                    {selectedStay.distanceKm} km away
                  </span>
                </div>
                <h4 className="font-bold text-text text-sm">{selectedStay.name}</h4>
                <p className="text-xs text-text-2 mt-0.5">{selectedStay.whyThisStay}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://maps.google.com/?q=${selectedStay.coordinates[1]},${selectedStay.coordinates[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-brand text-white text-xs font-semibold rounded-btn hover:bg-brand-hover"
                >
                  <Navigation size={12} />
                  Open in Maps
                </a>
                <Button variant="secondary" size="sm" onClick={() => setSelectedStay(null)}>
                  Close
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Attribution Banner */}
      <div className="mt-8 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-text-3">
        <span>
          Accommodation & shelter data provided under Open Database License (ODbL).{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-text-2"
          >
            {STAYS_ATTRIBUTION}
          </a>
        </span>
        <span className="font-mono">
          RouteX Single-Point Risk Evaluator v1.0
        </span>
      </div>
    </div>
  );
};
