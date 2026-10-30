import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Car,
  Footprints,
  ArrowRightLeft,
  MapPin,
  Compass,
  AlertTriangle,
  RotateCcw,
  Share2,
  Bookmark,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Check,
  Loader2,
  Clock,
} from 'lucide-react';

import type { RouteMode, RouteOption, GeocodedPlace, RouteStep } from '../features/routing/types';
import { geocodePlace } from '../features/routing/geocoding';
import { fetchOsrmRoutes, formatDistance, formatDuration } from '../features/routing/osrmClient';
import { RouteAutocomplete } from '../components/routing/RouteAutocomplete';
import { RouteCard } from '../components/routing/RouteCard';
import { RouteRiskExplanation } from '../components/routing/RouteRiskExplanation';
import { RouteXMap } from '../components/map/RouteXMap';
import type { LayerManagerAPI, MarkerHandle } from '../features/map/types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useDemoStore } from '../lib/demoStore';
import { useAuth } from '../features/auth/AuthContext';
import { scoreFullRoute } from '../features/risk/dataAdapters';
import { RISK_LEVEL_BANDS } from '../features/risk/config';
import type { RouteRiskScore } from '../features/risk/types';
import {
  cacheRouteSnapshot,
  getLastCachedRouteSnapshot,
  formatCachedAge,
} from '../features/offline/routeSnapshotService';
import {
  calculateAutoReRoute,
  type ReRouteComparison,
} from '../features/routing/rerouteService';
import { ReRouteComparisonCard } from '../components/routing/ReRouteComparisonCard';
import {
  saveRoute,
  getSavedRouteById,
  type SavedRoute,
} from '../features/routing/savedRoutesService';
import { SavedRoutesModal } from '../components/routing/SavedRoutesModal';

// Default starting demo route: Shimla to Manali
const DEFAULT_FROM_PLACE: GeocodedPlace = {
  name: 'Shimla',
  displayName: 'Shimla, Himachal Pradesh',
  admin1: 'Himachal Pradesh',
  country: 'India',
  latitude: 31.1048,
  longitude: 77.1734,
};

const DEFAULT_TO_PLACE: GeocodedPlace = {
  name: 'Manali',
  displayName: 'Manali, Himachal Pradesh',
  admin1: 'Himachal Pradesh',
  country: 'India',
  latitude: 32.2432,
  longitude: 77.1892,
};

export const RoutePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const demoMode = useDemoStore((state) => state.demoMode);

  // Search Inputs State
  const [fromText, setFromText] = useState<string>(
    searchParams.get('from') || DEFAULT_FROM_PLACE.displayName
  );
  const [toText, setToText] = useState<string>(
    searchParams.get('to') || DEFAULT_TO_PLACE.displayName
  );
  const [fromPlace, setFromPlace] = useState<GeocodedPlace | null>(DEFAULT_FROM_PLACE);
  const [toPlace, setToPlace] = useState<GeocodedPlace | null>(DEFAULT_TO_PLACE);
  const [mode, setMode] = useState<RouteMode>(
    (searchParams.get('mode') as RouteMode) || 'drive'
  );

  // Map Picking State
  const [pickMode, setPickMode] = useState<'none' | 'from' | 'to'>('none');

  // Routing Results State
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-0');
  const [isLoadingRoutes, setIsLoadingRoutes] = useState<boolean>(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  // Risk Engine State
  const [routeRisks, setRouteRisks] = useState<Record<string, RouteRiskScore>>({});
  const [isScoring, setIsScoring] = useState<boolean>(false);
  const [scoringProgress, setScoringProgress] = useState<string | null>(null);
  const [cachedAge, setCachedAge] = useState<string | null>(null);

  // Steps Accordion State
  const [showSteps, setShowSteps] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Auth & Saved Routes State
  const { user } = useAuth();
  const [savedRoutesModalOpen, setSavedRoutesModalOpen] = useState<boolean>(false);
  const [isSavingRoute, setIsSavingRoute] = useState<boolean>(false);
  const [isRouteSaved, setIsRouteSaved] = useState<boolean>(false);
  const isSavedRouteLoadingRef = useRef<boolean>(false);

  // Auto Re-Route State (P14)
  const [reRouteComparison, setReRouteComparison] = useState<ReRouteComparison | null>(null);
  const [isReRouting, setIsReRouting] = useState<boolean>(false);
  const [reRouteProgress, setReRouteProgress] = useState<string | null>(null);

  // Map & Markers Ref
  const mapApiRef = useRef<LayerManagerAPI | null>(null);
  const startMarkerRef = useRef<MarkerHandle | null>(null);
  const endMarkerRef = useRef<MarkerHandle | null>(null);
  const hazardMarkersRef = useRef<MarkerHandle[]>([]);

  // Fetch routes implementation
  const calculateRoute = useCallback(async () => {
    if (!fromPlace || !toPlace) return;

    setIsLoadingRoutes(true);
    setRoutingError(null);
    setRouteRisks({});
    setCachedAge(null);

    try {
      const result = await fetchOsrmRoutes(
        [fromPlace.longitude, fromPlace.latitude],
        [toPlace.longitude, toPlace.latitude],
        mode
      );

      setRoutes(result.routes);
      setSelectedRouteId(result.routes[0]?.id || 'route-0');
    } catch (err: unknown) {
      // Offline fallback: load cached route snapshot from IndexedDB
      const cached = await getLastCachedRouteSnapshot();
      if (cached && cached.geometry) {
        const fallbackRoute: RouteOption = {
          id: cached.id,
          name: `${cached.fromLabel} to ${cached.toLabel}`,
          distanceMeters: 244000,
          durationSeconds: 19800,
          geometry: cached.geometry,
          legs: [],
        };
        setRoutes([fallbackRoute]);
        setSelectedRouteId(fallbackRoute.id);
        setCachedAge(formatCachedAge(cached.cachedAt));
        setRouteRisks({
          [fallbackRoute.id]: {
            score: cached.score,
            level: cached.level as import('../features/risk/config').RiskLevel,
            isBlocked: cached.level === 'Blocked',
            maxSegmentScore: cached.score,
            meanSegmentScore: cached.score,
            segments: cached.segmentScores.map((s) => ({
              sampleIndex: s.segmentIndex,
              distanceKm: 2.0,
              segmentGeometry: { type: 'LineString', coordinates: [] },
              score: s.score,
              level: s.level as import('../features/risk/config').RiskLevel,
              isBlocked: s.level === 'Blocked',
              coordinates: s.coordinates,
              factors: {
                rain: cached.riskBreakdown?.factors?.rain ?? 0,
                terrain: cached.riskBreakdown?.factors?.terrain ?? 0,
                reports: cached.riskBreakdown?.factors?.reports ?? 0,
                history: cached.riskBreakdown?.factors?.history ?? 0,
                soil: cached.riskBreakdown?.factors?.soil ?? 0,
                seismic: cached.riskBreakdown?.factors?.seismic ?? 0,
                historyHasNoRecords: false,
                rawMetrics: {
                  accumRainMm: 0,
                  maxHourlyRainMm: 0,
                  slopeDeg: 12,
                  elevationM: 1500,
                  soilMoistureM3: 0.25,
                  historyNearCount: 0,
                  activeReportsCount: 0,
                  nearbyQuakesCount: 0,
                },
              },
            })),
            factorBars: [],
            hazardsOnRoute: (cached.hazards || []).map((h) => ({
              id: h.id,
              title: `${h.type} obstacle`,
              type: h.type as import('../features/reports/types').ReportType,
              severity: h.severity,
              distanceKm: h.distanceMeters / 1000,
              coordinates: [77.1734, 31.1048],
              isVerified: true,
              isTest: false,
            })),
            summary: cached.riskBreakdown?.summary || 'Cached risk snapshot from last route check.',
            timestamp: cached.cachedAtFormatted,
            disclaimer: 'RouteX gives risk estimates from public data and user reports.',
          },
        });
        setRoutingError(null);
      } else {
        setRoutingError(
          (err as Error).message || 'Could not find a route between these points.'
        );
        setRoutes([]);
      }
    } finally {
      setIsLoadingRoutes(false);
    }
  }, [fromPlace, toPlace, mode]);

  // Load saved route and trigger live re-scoring
  const handleLoadSavedRoute = useCallback(
    async (savedRoute: SavedRoute) => {
      isSavedRouteLoadingRef.current = true;
      setFromText(savedRoute.from_label);
      setToText(savedRoute.to_label);
      setMode(savedRoute.mode);
      setReRouteComparison(null);

      const coords = savedRoute.geometry.coordinates;
      if (coords.length > 0) {
        const startCoord = coords[0];
        const endCoord = coords[coords.length - 1];
        setFromPlace({
          name: savedRoute.from_label,
          displayName: savedRoute.from_label,
          admin1: '',
          country: 'India',
          latitude: startCoord[1],
          longitude: startCoord[0],
        });
        setToPlace({
          name: savedRoute.to_label,
          displayName: savedRoute.to_label,
          admin1: '',
          country: 'India',
          latitude: endCoord[1],
          longitude: endCoord[0],
        });
      }

      const routeOpt: RouteOption = {
        id: `saved-${savedRoute.id}`,
        name: `${savedRoute.from_label} to ${savedRoute.to_label} (Saved)`,
        distanceMeters: 244000,
        durationSeconds: 19800,
        geometry: savedRoute.geometry,
        legs: [],
        isRecommended: true,
      };

      setRoutes([routeOpt]);
      setSelectedRouteId(routeOpt.id);
      setIsScoring(true);
      setScoringProgress('Re-scoring saved route with live conditions...');

      try {
        const freshRisk = await scoreFullRoute(savedRoute.geometry, demoMode, (step) => {
          setScoringProgress(`Re-scoring: ${step}`);
        });
        setRouteRisks({
          [routeOpt.id]: freshRisk,
        });

        window.dispatchEvent(
          new CustomEvent('routex:toast', {
            detail: {
              id: `toast-rescore-${Date.now()}`,
              type: 'info',
              title: 'Saved Route Re-Scored',
              message: `Live score: ${freshRisk.score}/100 (${freshRisk.level}). Previous snapshot was ${savedRoute.risk_score}/100.`,
            },
          })
        );
      } catch (err) {
        console.warn('Re-score failed:', err);
      } finally {
        setIsScoring(false);
        setScoringProgress(null);
        setTimeout(() => {
          isSavedRouteLoadingRef.current = false;
        }, 1200);
      }
    },
    [demoMode]
  );

  // Check savedRouteId query param on initial mount
  useEffect(() => {
    const savedRouteId = searchParams.get('savedRouteId');
    if (savedRouteId) {
      getSavedRouteById(savedRouteId).then((sr) => {
        if (sr) {
          handleLoadSavedRoute(sr);
        }
      });
    }
  }, [searchParams, handleLoadSavedRoute]);

  // Handle URL query parameters from Home search card on initial load
  useEffect(() => {
    const savedRouteId = searchParams.get('savedRouteId');
    if (savedRouteId) return; // Prioritize saved route loader

    const urlFrom = searchParams.get('from');
    const urlTo = searchParams.get('to');
    const urlMode = searchParams.get('mode') as RouteMode;

    if (urlMode) setMode(urlMode);

    async function initFromParams() {
      if (urlFrom && urlTo) {
        setIsLoadingRoutes(true);
        const [fromRes, toRes] = await Promise.all([
          geocodePlace(urlFrom),
          geocodePlace(urlTo),
        ]);

        if (fromRes.length > 0) {
          setFromPlace(fromRes[0]);
          setFromText(fromRes[0].displayName);
        }
        if (toRes.length > 0) {
          setToPlace(toRes[0]);
          setToText(toRes[0].displayName);
        }
      }
    }

    initFromParams();
  }, [searchParams]);

  // Auto-calculate route when places or mode change (unless a saved route is actively being loaded)
  useEffect(() => {
    if (fromPlace && toPlace && !isSavedRouteLoadingRef.current) {
      calculateRoute();
    }
  }, [fromPlace, toPlace, mode, calculateRoute]);

  // Score all routes whenever routes load or demo mode toggles
  useEffect(() => {
    if (routes.length === 0) return;

    let isMounted = true;
    setIsScoring(true);

    async function evaluateRoutes() {
      const scoredMap: Record<string, RouteRiskScore> = {};

      for (let i = 0; i < routes.length; i++) {
        if (!isMounted) break;
        const r = routes[i];
        try {
          const scoreResult = await scoreFullRoute(
            r.geometry,
            demoMode,
            (progressStep) => {
              if (isMounted) {
                setScoringProgress(
                  `[Route ${i + 1}/${routes.length}] ${progressStep}`
                );
              }
            }
          );
          scoredMap[r.id] = scoreResult;
        } catch {
          // If a scoring layer has an issue, keep what succeeded
        }
      }

      if (isMounted) {
        setRouteRisks(scoredMap);
        setIsScoring(false);
        setScoringProgress(null);

        // Cache route snapshot in IndexedDB per Task 4
        if (routes.length > 0 && fromPlace && toPlace && scoredMap[routes[0].id]) {
          cacheRouteSnapshot({
            fromName: fromPlace.name,
            fromDisplayName: fromPlace.displayName,
            toName: toPlace.name,
            toDisplayName: toPlace.displayName,
            mode,
            geometry: routes[0].geometry,
            riskScore: scoredMap[routes[0].id],
            lastKnownLocation: [fromPlace.longitude, fromPlace.latitude],
          }).catch(() => {});
        }
      }
    }

    evaluateRoutes();

    return () => {
      isMounted = false;
    };
  }, [routes, demoMode, fromPlace, toPlace, mode]);

  // Identify recommended route (lowest risk score, non-blocked preferred)
  const recommendedRouteId = Object.keys(routeRisks).length > 0
    ? routes.reduce((bestId, currentRoute) => {
        const bestRisk = routeRisks[bestId];
        const currRisk = routeRisks[currentRoute.id];
        if (!bestRisk) return currentRoute.id;
        if (!currRisk) return bestId;
        // Non-blocked always preferred
        if (bestRisk.isBlocked && !currRisk.isBlocked) return currentRoute.id;
        if (!bestRisk.isBlocked && currRisk.isBlocked) return bestId;
        return currRisk.score < bestRisk.score ? currentRoute.id : bestId;
      }, routes[0]?.id || '')
    : null;

  // Update map layers and markers when routes, selection, or risk change
  useEffect(() => {
    const api = mapApiRef.current;
    if (!api) return;

    // 1. Remove previous route layers
    api.removeLayer('route-casing');
    api.removeLayer('route-primary');
    api.removeLayer('route-segments');
    api.removeLayer('route-alt-0');
    api.removeLayer('route-alt-1');

    // 2. Remove previous markers
    startMarkerRef.current?.remove();
    endMarkerRef.current?.remove();
    hazardMarkersRef.current.forEach((m) => m.remove());
    hazardMarkersRef.current = [];

    if (routes.length === 0) return;

    const selectedRoute =
      routes.find((r) => r.id === selectedRouteId) || routes[0];
    const alternativeRoutes = routes.filter((r) => r.id !== selectedRoute.id);
    const selectedRisk = routeRisks[selectedRoute.id];

    // 3. Render alternative routes in 50% dashed grey
    alternativeRoutes.forEach((alt, idx) => {
      api.addGeoJSONLayer(
        `route-alt-${idx}`,
        alt.geometry,
        {
          type: 'line',
          paint: {
            'line-color': '#94A3B8',
            'line-width': 4,
            'line-dasharray': [2, 2],
            'line-opacity': 0.65,
          },
        },
        alt.name
      );
    });

    // 4. Render selected route white casing (width 9)
    api.addGeoJSONLayer(
      'route-casing',
      selectedRoute.geometry,
      {
        type: 'line',
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 9,
          'line-opacity': 1,
        },
      },
      'Route Casing'
    );

    // 5. Render colored segments by Risk Level if scored, otherwise fallback brand blue
    if (selectedRisk && selectedRisk.segments.length > 0) {
      const segmentsGeoJson = {
        type: 'FeatureCollection' as const,
        features: selectedRisk.segments.map((seg, idx) => ({
          type: 'Feature' as const,
          id: idx,
          geometry: seg.segmentGeometry,
          properties: {
            level: seg.level,
            color: RISK_LEVEL_BANDS[seg.level].color,
            score: seg.score,
          },
        })),
      };

      api.addGeoJSONLayer(
        'route-segments',
        segmentsGeoJson,
        {
          type: 'line',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 5.5,
            'line-opacity': 0.95,
          },
        },
        'Risk-Colored Segments'
      );

      // 6. Add hazard markers on map for detected hazards along this route
      selectedRisk.hazardsOnRoute.forEach((hazard) => {
        const hColor = hazard.severity >= 3 ? '#EF4444' : '#F97316';
        const hIcon =
          hazard.type === 'road_blocked'
            ? 'ban'
            : hazard.type === 'landslide'
              ? 'siren'
              : 'triangle-alert';

        const markerHandle = api.addMarker({
          lngLat: hazard.coordinates,
          icon: hIcon,
          color: hColor,
          bgSoftColor: '#FEF2F2',
          isTest: hazard.isTest,
          size: 32,
          popup: {
            title: hazard.title,
            description:
              hazard.description ||
              `Obstruction within ${(hazard.distanceKm * 1000).toFixed(0)}m of route`,
            badge: hazard.isVerified ? 'Verified' : 'Pending',
          },
        });
        hazardMarkersRef.current.push(markerHandle);
      });
    } else {
      // Fallback single-color route line while scoring
      api.addGeoJSONLayer(
        'route-primary',
        selectedRoute.geometry,
        {
          type: 'line',
          paint: {
            'line-color': '#0B3C5D',
            'line-width': 5.5,
            'line-opacity': 0.95,
          },
        },
        selectedRoute.name
      );
    }

    // 7. Place start and destination markers
    if (fromPlace) {
      startMarkerRef.current = api.addMarker({
        lngLat: [fromPlace.longitude, fromPlace.latitude],
        icon: 'map-pin',
        color: '#15803D',
        bgSoftColor: '#E7F5EC',
        popup: {
          title: 'Origin Point',
          description: fromPlace.displayName,
          badge: 'Start',
        },
      });
    }

    if (toPlace) {
      endMarkerRef.current = api.addMarker({
        lngLat: [toPlace.longitude, toPlace.latitude],
        icon: 'compass',
        color: '#0B3C5D',
        bgSoftColor: '#E6EEF4',
        popup: {
          title: 'Destination',
          description: toPlace.displayName,
          badge: 'Finish',
        },
      });
    }

    // 8. Fit bounds to route geometry
    const coords = selectedRoute.geometry.coordinates;
    if (coords.length > 0) {
      let minLng = coords[0][0];
      let maxLng = coords[0][0];
      let minLat = coords[0][1];
      let maxLat = coords[0][1];

      coords.forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      });

      api.fitToBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: { top: 60, bottom: 60, left: 380, right: 60 } }
      );
    }
  }, [routes, selectedRouteId, fromPlace, toPlace, routeRisks]);

  // Map Click handler for picking Origin / Destination
  const handleMapClick = (coords: { lat: number; lng: number }) => {
    if (pickMode === 'none') return;

    const clickedPlace: GeocodedPlace = {
      name: `Point (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})`,
      displayName: `Map Point (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
      latitude: coords.lat,
      longitude: coords.lng,
    };

    if (pickMode === 'from') {
      setFromPlace(clickedPlace);
      setFromText(clickedPlace.displayName);
      setPickMode('none');
    } else if (pickMode === 'to') {
      setToPlace(clickedPlace);
      setToText(clickedPlace.displayName);
      setPickMode('none');
    }
  };

  const handleSwap = () => {
    const tempText = fromText;
    const tempPlace = fromPlace;
    setFromText(toText);
    setFromPlace(toPlace);
    setToText(tempText);
    setToPlace(tempPlace);
  };

  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('from', fromText);
    url.searchParams.set('to', toText);
    url.searchParams.set('mode', mode);
    navigator.clipboard.writeText(url.toString());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const selectedRoute =
    routes.find((r) => r.id === selectedRouteId) || routes[0];
  const selectedRisk = selectedRoute ? routeRisks[selectedRoute.id] : undefined;

  // Auto Re-route button visibility condition per P14 prompt:
  // Shows ONLY if the recommended route is High, Severe or Blocked
  const isHighSevereOrBlocked = Boolean(
    selectedRisk &&
      (selectedRisk.level === 'High' ||
        selectedRisk.level === 'Severe' ||
        selectedRisk.level === 'Blocked' ||
        selectedRisk.isBlocked ||
        selectedRisk.score >= 50)
  );

  const handleAutoReRoute = async () => {
    if (!selectedRoute || !selectedRisk || !fromPlace || !toPlace) return;

    setIsReRouting(true);
    setReRouteProgress('Analyzing corridor hazards & 400m avoid buffer...');
    try {
      const comp = await calculateAutoReRoute({
        originalRoute: selectedRoute,
        originalRisk: selectedRisk,
        start: [fromPlace.longitude, fromPlace.latitude],
        end: [toPlace.longitude, toPlace.latitude],
        mode,
        demoMode,
        onProgress: (p) => setReRouteProgress(p),
      });
      setReRouteComparison(comp);
    } catch (err) {
      console.warn('Auto re-route failed:', err);
      window.dispatchEvent(
        new CustomEvent('routex:toast', {
          detail: {
            id: `toast-reroute-fail-${Date.now()}`,
            type: 'warning',
            title: 'Auto Re-Route Notice',
            message: 'No route found that avoids the hazard; showing the lowest-risk option.',
          },
        })
      );
    } finally {
      setIsReRouting(false);
      setReRouteProgress(null);
    }
  };

  const handleApplySaferRoute = () => {
    if (!reRouteComparison) return;
    const safer = reRouteComparison.saferRoute;
    const saferRisk = reRouteComparison.saferRisk;

    setRoutes((prev) => [safer, ...prev.filter((r) => r.id !== safer.id)]);
    setSelectedRouteId(safer.id);
    setRouteRisks((prev) => ({
      ...prev,
      [safer.id]: saferRisk,
    }));
    setReRouteComparison(null);

    window.dispatchEvent(
      new CustomEvent('routex:toast', {
        detail: {
          id: `toast-applied-${Date.now()}`,
          type: 'success',
          title: 'Switched to Safer Route',
          message: 'Diverted around verified hazard zones via OpenRouteService.',
        },
      })
    );
  };

  const handleSaveCurrentRoute = async () => {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent('routex:toast', {
          detail: {
            id: `toast-login-req-${Date.now()}`,
            type: 'warning',
            title: 'Sign In Required',
            message: 'Please sign in to save routes to your profile for continuous disaster monitoring.',
          },
        })
      );
      return;
    }

    if (!selectedRoute) return;

    setIsSavingRoute(true);
    try {
      await saveRoute({
        fromLabel: fromText,
        toLabel: toText,
        mode,
        geometry: selectedRoute.geometry,
        riskScore: selectedRisk?.score ?? 0,
      });
      setIsRouteSaved(true);
      setTimeout(() => setIsRouteSaved(false), 3000);
      window.dispatchEvent(
        new CustomEvent('routex:toast', {
          detail: {
            id: `toast-saved-${Date.now()}`,
            type: 'success',
            title: 'Route Saved',
            message: `Saved ${fromText} → ${toText} (${mode}) to your profile.`,
          },
        })
      );
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent('routex:toast', {
          detail: {
            id: `toast-err-${Date.now()}`,
            type: 'danger',
            title: 'Failed to Save Route',
            message: (err as Error).message,
          },
        })
      );
    } finally {
      setIsSavingRoute(false);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-64px)] flex flex-col lg:flex-row overflow-hidden bg-surface">
      {/* LEFT PANEL: 380px wide per Doc 02 section 6.2 */}
      <div className="w-full lg:w-[380px] shrink-0 h-full overflow-y-auto bg-white border-r border-border p-4 flex flex-col justify-between shadow-sm z-10">
        <div className="space-y-4">
          {/* Header & Mode Selector */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-h3 font-bold text-brand">Plan Route</h2>
              <span className="text-[11px] text-text-3 font-mono">
                Mountain corridors & Risk Scoring
              </span>
            </div>

            <div className="flex items-center bg-surface border border-border rounded-btn p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMode('drive')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-btn font-medium transition-colors ${
                  mode === 'drive'
                    ? 'bg-white shadow-xs text-brand font-bold'
                    : 'text-text-3 hover:text-text'
                }`}
              >
                <Car size={13} /> Drive
              </button>
              <button
                type="button"
                onClick={() => setMode('walk')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-btn font-medium transition-colors ${
                  mode === 'walk'
                    ? 'bg-white shadow-xs text-brand font-bold'
                    : 'text-text-3 hover:text-text'
                }`}
              >
                <Footprints size={13} /> Walk
              </button>
            </div>
          </div>

          {/* Autocomplete Origin & Destination */}
          <div className="space-y-2.5">
            <RouteAutocomplete
              label="Origin (From)"
              placeholder="Search start point (e.g. Shimla)..."
              value={fromText}
              onChange={setFromText}
              onSelectPlace={(p) => setFromPlace(p)}
              icon={<MapPin size={13} className="text-risk-low" />}
              onPickOnMap={() => setPickMode(pickMode === 'from' ? 'none' : 'from')}
              isPickingOnMap={pickMode === 'from'}
            />

            <div className="flex justify-center -my-1">
              <button
                type="button"
                onClick={handleSwap}
                aria-label="Swap origin and destination"
                className="p-1 rounded-full bg-surface-2 border border-border text-text-3 hover:text-brand transition-colors"
              >
                <ArrowRightLeft size={13} />
              </button>
            </div>

            <RouteAutocomplete
              label="Destination (To)"
              placeholder="Search destination (e.g. Manali)..."
              value={toText}
              onChange={setToText}
              onSelectPlace={(p) => setToPlace(p)}
              icon={<Compass size={13} className="text-brand" />}
              onPickOnMap={() => setPickMode(pickMode === 'to' ? 'none' : 'to')}
              isPickingOnMap={pickMode === 'to'}
            />
          </div>

          {/* Departure Info Banner */}
          <div className="flex items-center justify-between text-[11px] text-text-3 font-mono bg-surface p-2 rounded-btn border border-border">
            <span>
              Depart: <strong>Now</strong>
            </span>
            <span>OSRM + Open-Meteo Risk Engine</span>
          </div>

          {/* Pick on map instructions */}
          {pickMode !== 'none' && (
            <div className="p-2.5 rounded-btn bg-brand-soft border border-brand/20 text-xs text-brand flex items-center gap-2 animate-pulse">
              <MapPin size={14} className="shrink-0 text-accent" />
              <span>
                Click any position on the map to set{' '}
                {pickMode === 'from' ? 'Origin' : 'Destination'}.
              </span>
            </div>
          )}

          {/* Error Message Display */}
          {routingError && (
            <div className="p-3 rounded-btn bg-risk-high-soft border border-risk-high text-xs text-risk-high flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Routing Unavailable</p>
                <p className="text-text mt-0.5">{routingError}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={calculateRoute}
                  className="mt-2 text-[11px]"
                  icon={<RotateCcw size={11} />}
                >
                  Retry calculation
                </Button>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoadingRoutes && (
            <div className="py-8 flex flex-col items-center justify-center text-text-3 gap-2">
              <Loader2 size={24} className="animate-spin text-accent" />
              <span className="text-xs font-medium">Calculating mountain route...</span>
            </div>
          )}

          {/* Scoring Progress Callout */}
          {isScoring && (
            <div className="p-2.5 rounded-btn bg-brand-soft/50 border border-brand/20 text-xs text-brand flex items-center gap-2 animate-pulse">
              <Loader2 size={13} className="animate-spin text-accent shrink-0" />
              <span className="truncate">
                {scoringProgress || 'Evaluating environmental risk factors...'}
              </span>
            </div>
          )}

          {/* Routes Results List */}
          {!isLoadingRoutes && routes.length > 0 && (
            <div className="space-y-2 pt-1">
              {cachedAge && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-btn text-xs text-amber-800 font-medium">
                  <Clock size={13} className="text-amber-600 flex-shrink-0" />
                  <span>Offline Route Snapshot · {cachedAge}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs font-semibold text-text-3 uppercase tracking-wider">
                <span>Available Routes ({routes.length})</span>
                {routes.length > 1 && (
                  <span className="text-[10px] lowercase text-text-3">
                    select to compare
                  </span>
                )}
              </div>

              {routes.map((r) => (
                <RouteCard
                  key={r.id}
                  route={r}
                  mode={mode}
                  isSelected={r.id === selectedRouteId}
                  onSelect={() => setSelectedRouteId(r.id)}
                  risk={routeRisks[r.id]}
                  isScoring={isScoring && !routeRisks[r.id]}
                  isRecommended={
                    recommendedRouteId === r.id && !routeRisks[r.id]?.isBlocked
                  }
                />
              ))}
            </div>
          )}

          {/* Selected Route Risk Explanation Accordion */}
          {!isLoadingRoutes && selectedRisk && (
            <RouteRiskExplanation risk={selectedRisk} />
          )}

          {/* Auto Re-Route Comparison Card (P14) */}
          {reRouteComparison && (
            <ReRouteComparisonCard
              comparison={reRouteComparison}
              onApply={handleApplySaferRoute}
              onDismiss={() => setReRouteComparison(null)}
            />
          )}

          {/* Turn-by-Turn Steps Summary Accordion */}
          {!isLoadingRoutes &&
            selectedRoute &&
            selectedRoute.legs[0]?.steps.length > 0 && (
              <div className="border border-border rounded-card bg-surface overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowSteps(!showSteps)}
                  className="w-full flex items-center justify-between p-3 text-left font-semibold text-text hover:bg-surface-2 transition-colors select-none"
                >
                  <span>Route Steps ({selectedRoute.legs[0].steps.length})</span>
                  {showSteps ? (
                    <ChevronUp size={14} className="text-text-3" />
                  ) : (
                    <ChevronDown size={14} className="text-text-3" />
                  )}
                </button>

                {showSteps && (
                  <div className="max-h-60 overflow-y-auto divide-y divide-border/60 p-2 border-t border-border">
                    {selectedRoute.legs[0].steps.map(
                      (step: RouteStep, idx: number) => (
                        <div
                          key={idx}
                          className="py-2 px-1.5 flex items-start justify-between gap-2"
                        >
                          <div className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-surface-2 text-text-3 text-[10px] font-mono flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-text font-medium leading-snug">
                                {step.instruction || step.name || 'Continue'}
                              </p>
                              {step.name && step.instruction !== step.name && (
                                <p className="text-[11px] text-text-3">
                                  {step.name}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-text-3 shrink-0">
                            {formatDistance(step.distance)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

          {/* Empty State */}
          {!isLoadingRoutes && routes.length === 0 && !routingError && (
            <EmptyState
              icon={Compass}
              title="No Route Selected"
              description="Enter starting point and destination above or click on the map to calculate routes."
            />
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="pt-4 border-t border-border space-y-2">
          {/* Auto Re-Route Button - Shows only if recommended route is High, Severe or Blocked */}
          {isHighSevereOrBlocked && (
            <Button
              variant="primary"
              className="w-full bg-accent hover:bg-accent-hover text-white font-semibold shadow-xs"
              onClick={handleAutoReRoute}
              loading={isReRouting}
              icon={<ShieldCheck size={14} />}
            >
              {isReRouting
                ? reRouteProgress || 'Finding Safer Alternative...'
                : 'Auto Re-route (Safer) · Avoid Hazards'}
            </Button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              icon={
                isCopied ? (
                  <Check size={13} className="text-risk-low" />
                ) : (
                  <Share2 size={13} />
                )
              }
            >
              {isCopied ? 'Link Copied!' : 'Share Route'}
            </Button>

            <Button
              variant={isRouteSaved ? 'secondary' : 'ghost'}
              size="sm"
              onClick={handleSaveCurrentRoute}
              loading={isSavingRoute}
              icon={
                isRouteSaved ? (
                  <Check size={13} className="text-risk-low" />
                ) : (
                  <Bookmark size={13} />
                )
              }
            >
              {isRouteSaved ? 'Route Saved' : 'Save Route'}
            </Button>
          </div>

          {/* Quick link to view all user's saved mountain routes */}
          <button
            type="button"
            onClick={() => setSavedRoutesModalOpen(true)}
            className="w-full text-center text-[11px] text-text-3 hover:text-brand font-medium transition-colors pt-1"
          >
            Open Saved Routes...
          </button>
        </div>
      </div>

      {/* RIGHT MAP VIEW: Full Height */}
      <div className="flex-1 h-full relative overflow-hidden">
        <RouteXMap
          initialCenter={[
            DEFAULT_FROM_PLACE.longitude,
            DEFAULT_FROM_PLACE.latitude,
          ]}
          initialZoom={9}
          onMapReady={(api) => {
            mapApiRef.current = api;
          }}
          onMapClick={handleMapClick}
          showControls={true}
          showLayerPanel={false}
          showLegend={true}
          className="w-full h-full rounded-none border-none"
        />

        {/* Map Header Status Overlay */}
        <div className="absolute top-3 left-3 z-10 hidden sm:flex items-center gap-2">
          <Badge variant="brand">
            {mode === 'drive' ? 'Driving Route' : 'Walking Trail'}
          </Badge>
          {selectedRoute && (
            <span className="bg-white/90 backdrop-blur-sm border border-border px-2 py-0.5 rounded-chip text-xs font-mono font-bold text-text shadow-xs">
              {formatDistance(selectedRoute.distanceMeters)} ·{' '}
              {formatDuration(selectedRoute.durationSeconds)}
            </span>
          )}
        </div>
      </div>

      {/* Saved Routes Modal */}
      <SavedRoutesModal
        isOpen={savedRoutesModalOpen}
        onClose={() => setSavedRoutesModalOpen(false)}
        onSelectRoute={handleLoadSavedRoute}
      />
    </div>
  );
};
