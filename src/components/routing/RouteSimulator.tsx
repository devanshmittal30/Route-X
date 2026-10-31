import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Navigation,
  Car,
  Footprints,
  X,
  Compass,
} from 'lucide-react';
import * as turf from '@turf/turf';
import type { RouteOption, RouteMode } from '../../features/routing/types';
import type { RouteRiskScore } from '../../features/risk/types';
import type { LayerManagerAPI, MarkerHandle } from '../../features/map/types';
import { calculateMidRouteReRoute, type ReRouteComparison } from '../../features/routing/rerouteService';
import { ReRouteComparisonCard } from './ReRouteComparisonCard';

export interface RouteSimulatorProps {
  route: RouteOption;
  risk: RouteRiskScore;
  mode: RouteMode;
  demoMode: boolean;
  mapApi: LayerManagerAPI | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyDetour: (newRoute: RouteOption, newRisk: RouteRiskScore) => void;
}

type SimStatus = 'idle' | 'driving' | 'paused' | 'blocked' | 'recalculating' | 'rerouted' | 'driving_detour' | 'completed';

export const RouteSimulator: React.FC<RouteSimulatorProps> = ({
  route,
  risk,
  mode,
  demoMode,
  mapApi,
  isOpen,
  onClose,
  onApplyDetour,
}) => {
  const [status, setStatus] = useState<SimStatus>('idle');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(2); // 1x, 2x, 5x
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [activeCoords, setActiveCoords] = useState<number[][]>(route.geometry.coordinates);
  const [hazardLocation, setHazardLocation] = useState<[number, number] | null>(null);
  const [comparison, setComparison] = useState<ReRouteComparison | null>(null);
  const [reRouteProgress, setReRouteProgress] = useState<string | null>(null);

  // References
  const vehicleMarkerRef = useRef<MarkerHandle | null>(null);
  const hazardMarkerRef = useRef<MarkerHandle | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(Date.now());
  const currentIndexRef = useRef<number>(0);
  currentIndexRef.current = currentIndex;

  const totalPoints = activeCoords.length;
  const progressPercent = Math.min(100, Math.round((currentIndex / Math.max(1, totalPoints - 1)) * 100));

  // Initialize and clean up vehicle marker on map
  useEffect(() => {
    if (!isOpen || !mapApi || activeCoords.length === 0) return;

    const startPos = activeCoords[0];
    if (!vehicleMarkerRef.current) {
      vehicleMarkerRef.current = mapApi.addMarker({
        lngLat: [startPos[0], startPos[1]],
        color: '#0B3C5D',
        bgSoftColor: '#E0F2FE',
        shape: 'ring',
        size: 38,
        popup: {
          title: 'Your Vehicle',
          description: 'Live satellite GPS tracking along corridor',
          badge: 'Simulated Live',
        },
      });
    }

    return () => {
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.remove();
        vehicleMarkerRef.current = null;
      }
      if (hazardMarkerRef.current) {
        hazardMarkerRef.current.remove();
        hazardMarkerRef.current = null;
      }
      if (mapApi) {
        mapApi.removeLayer('sim-hazard-circle');
        mapApi.removeLayer('sim-detour-line');
      }
    };
  }, [isOpen, mapApi, activeCoords]);

  // Trigger Landslide & Dynamic Re-Route from mid-route location
  const triggerLandslideAndReRoute = useCallback(async (forcedIndex?: number) => {
    const idx = forcedIndex !== undefined ? forcedIndex : currentIndexRef.current;
    setStatus('blocked');

    // Place hazard 10-15 points ahead of current position
    const hazardIdx = Math.min(activeCoords.length - 1, idx + 12);
    const hazardCoord: [number, number] = [
      activeCoords[hazardIdx][0],
      activeCoords[hazardIdx][1],
    ];
    setHazardLocation(hazardCoord);

    // Add Red Hazard Marker on map
    if (mapApi) {
      if (hazardMarkerRef.current) hazardMarkerRef.current.remove();
      hazardMarkerRef.current = mapApi.addMarker({
        lngLat: hazardCoord,
        color: '#DC2626',
        bgSoftColor: '#FEE2E2',
        shape: 'hollow-triangle',
        size: 42,
        popup: {
          title: '🚨 Massive Landslide Blockage',
          description: 'Road completely impassable due to rockfall & mudflow',
          badge: 'Verified Obstacle',
        },
      });

      // Draw 400m Avoidance Circle on map
      const circlePoly = turf.circle(hazardCoord, 0.4, { steps: 24, units: 'kilometers' });
      mapApi.addGeoJSONLayer(
        'sim-hazard-circle',
        circlePoly,
        {
          type: 'fill',
          paint: {
            'fill-color': '#DC2626',
            'fill-opacity': 0.28,
            'fill-outline-color': '#991B1B',
          },
        },
        '400m Landslide Danger Zone'
      );

      // Pan to show both vehicle and hazard
      mapApi.flyTo(hazardCoord, 13);
    }

    // Sound / Visual feedback
    window.dispatchEvent(
      new CustomEvent('routex:toast', {
        detail: {
          id: `sim-landslide-${Date.now()}`,
          type: 'danger',
          title: '⚠️ Road Blockage Ahead!',
          message: 'Active landslide detected 600m ahead. Vehicle halted. Calculating safest detour...',
        },
      })
    );

    // Calculate dynamic re-route from current vehicle position
    setStatus('recalculating');
    const currentLoc: [number, number] = [activeCoords[idx][0], activeCoords[idx][1]];
    const destLoc: [number, number] = [
      activeCoords[activeCoords.length - 1][0],
      activeCoords[activeCoords.length - 1][1],
    ];

    try {
      const comp = await calculateMidRouteReRoute({
        originalRoute: route,
        originalRisk: risk,
        currentLocation: currentLoc,
        currentCoordIndex: idx,
        hazardLocation: hazardCoord,
        destination: destLoc,
        mode,
        demoMode,
        onProgress: (p) => setReRouteProgress(p),
      });

      setComparison(comp);
      setStatus('rerouted');

      // Highlight new detour line on map in vivid emerald green
      if (mapApi && comp.saferRoute) {
        mapApi.addGeoJSONLayer(
          'sim-detour-line',
          comp.saferRoute.geometry,
          {
            type: 'line',
            paint: {
              'line-color': '#10B981',
              'line-width': 6,
              'line-opacity': 0.95,
              'line-dasharray': [1, 0],
            },
          },
          'Safe Bypass Detour'
        );
      }

      window.dispatchEvent(
        new CustomEvent('routex:toast', {
          detail: {
            id: `sim-reroute-ready-${Date.now()}`,
            type: 'info',
            title: '✅ Safest Detour Ready',
            message: `Bypasses danger zone (+${((comp.distanceDifferenceMeters) / 1000).toFixed(1)} km). Ready to continue!`,
          },
        })
      );
    } catch (err) {
      console.warn('Mid-route recalculation failed:', err);
      setStatus('blocked');
    }
  }, [activeCoords, mapApi, route, risk, mode, demoMode]);

  // Main simulation tick loop
  useEffect(() => {
    if (status !== 'driving' && status !== 'driving_detour') return;

    lastTickTimeRef.current = Date.now();

    const intervalTime = Math.max(30, 240 / speedMultiplier);

    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;

        // Auto-trigger landslide blockage at 35% of the original route if in initial driving mode
        if (status === 'driving' && !hazardLocation && next >= Math.floor(totalPoints * 0.35)) {
          clearInterval(intervalId);
          triggerLandslideAndReRoute(next);
          return next;
        }

        // Check if arrived at destination
        if (next >= activeCoords.length - 1) {
          clearInterval(intervalId);
          setStatus('completed');
          if (vehicleMarkerRef.current && activeCoords.length > 0) {
            const endCoord = activeCoords[activeCoords.length - 1];
            vehicleMarkerRef.current.updateLngLat([endCoord[0], endCoord[1]]);
          }
          return activeCoords.length - 1;
        }

        // Update vehicle position on map
        const pt = activeCoords[next];
        if (vehicleMarkerRef.current && pt) {
          vehicleMarkerRef.current.updateLngLat([pt[0], pt[1]]);
        }

        // Periodically center camera on vehicle
        if (next % 8 === 0 && mapApi && pt) {
          mapApi.flyTo([pt[0], pt[1]], 14, { duration: 400 });
        }

        return next;
      });
    }, intervalTime);

    return () => clearInterval(intervalId);
  }, [status, speedMultiplier, activeCoords, totalPoints, hazardLocation, triggerLandslideAndReRoute, mapApi]);

  // Start driving along detour
  const handleDriveDetour = () => {
    if (!comparison) return;
    setActiveCoords(comparison.saferRoute.geometry.coordinates);
    setStatus('driving_detour');
  };

  // Reset simulation to start
  const handleReset = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setStatus('idle');
    setCurrentIndex(0);
    setHazardLocation(null);
    setComparison(null);
    setActiveCoords(route.geometry.coordinates);

    if (mapApi) {
      mapApi.removeLayer('sim-hazard-circle');
      mapApi.removeLayer('sim-detour-line');
      if (hazardMarkerRef.current) {
        hazardMarkerRef.current.remove();
        hazardMarkerRef.current = null;
      }
      if (vehicleMarkerRef.current && route.geometry.coordinates.length > 0) {
        const start = route.geometry.coordinates[0];
        vehicleMarkerRef.current.updateLngLat([start[0], start[1]]);
        mapApi.flyTo([start[0], start[1]], 12);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-[480px] z-30 bg-white/95 backdrop-blur-md border-2 border-brand/40 shadow-xl rounded-card p-4 space-y-3.5 animate-fadeIn">
      {/* Simulator Top Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand-soft flex items-center justify-center text-brand">
            {mode === 'walk' ? <Footprints size={15} /> : <Car size={15} />}
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand">
              Live Re-Route Simulation
            </h3>
            <p className="text-[11px] text-text-3 font-mono">
              Mid-Journey Landslide Obstacle & Dynamic Detour
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Speed Selector */}
          <div className="flex items-center bg-surface border border-border rounded-chip p-0.5 text-[11px] font-mono">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSpeedMultiplier(spd)}
                className={`px-1.5 py-0.5 rounded-chip transition-colors ${
                  speedMultiplier === spd
                    ? 'bg-brand text-white font-bold'
                    : 'text-text-3 hover:text-text'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-btn text-text-3 hover:text-text transition-colors"
            title="Exit Simulator"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Dynamic Status Display */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-text flex items-center gap-1.5">
            {status === 'idle' && 'Ready to start simulation'}
            {(status === 'driving' || status === 'driving_detour') && (
              <>
                <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
                <span>Driving along route ({progressPercent}%)</span>
              </>
            )}
            {status === 'paused' && 'Simulation paused'}
            {status === 'blocked' && (
              <span className="text-risk-severe font-bold flex items-center gap-1">
                <AlertTriangle size={13} className="text-risk-severe" />
                Landslide Blockage Ahead!
              </span>
            )}
            {status === 'recalculating' && (
              <span className="text-brand font-semibold animate-pulse flex items-center gap-1">
                <Compass size={13} className="animate-spin text-brand" />
                {reRouteProgress || 'Calculating safest detour from current position...'}
              </span>
            )}
            {status === 'rerouted' && (
              <span className="text-risk-low font-bold flex items-center gap-1">
                <ShieldCheck size={13} className="text-risk-low" />
                Safe Bypass Detour Ready!
              </span>
            )}
            {status === 'completed' && (
              <span className="text-risk-low font-bold flex items-center gap-1">
                <CheckCircle2 size={13} className="text-risk-low" />
                Arrived Safely at Destination!
              </span>
            )}
          </span>

          <span className="font-mono text-[11px] text-text-3">
            Point {currentIndex} / {totalPoints}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-surface-2 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-150 ${
              status === 'blocked'
                ? 'bg-risk-severe'
                : status === 'rerouted' || status === 'driving_detour'
                ? 'bg-risk-low'
                : 'bg-brand'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Simulator Action Controls */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {status === 'idle' && (
          <button
            type="button"
            onClick={() => setStatus('driving')}
            className="flex-1 py-2 px-3 bg-brand hover:bg-brand-dark text-white rounded-btn text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95"
          >
            <Play size={13} fill="currentColor" />
            <span>Start Live Journey</span>
          </button>
        )}

        {(status === 'driving' || status === 'driving_detour') && (
          <>
            <button
              type="button"
              onClick={() => setStatus('paused')}
              className="py-1.5 px-3 bg-surface hover:bg-surface-2 border border-border text-text rounded-btn text-xs font-semibold flex items-center gap-1.5"
            >
              <Pause size={13} />
              <span>Pause</span>
            </button>

            {status === 'driving' && !hazardLocation && (
              <button
                type="button"
                onClick={() => triggerLandslideAndReRoute()}
                className="flex-1 py-1.5 px-3 bg-risk-severe hover:bg-red-700 text-white rounded-btn text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95"
              >
                <AlertTriangle size={13} />
                <span>Trigger Landslide Blockage Now</span>
              </button>
            )}
          </>
        )}

        {status === 'paused' && (
          <button
            type="button"
            onClick={() => setStatus(comparison ? 'driving_detour' : 'driving')}
            className="flex-1 py-1.5 px-3 bg-brand hover:bg-brand-dark text-white rounded-btn text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Play size={13} fill="currentColor" />
            <span>Resume Driving</span>
          </button>
        )}

        {status === 'rerouted' && (
          <button
            type="button"
            onClick={handleDriveDetour}
            className="flex-1 py-2 px-3 bg-risk-low hover:bg-green-700 text-white rounded-btn text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95"
          >
            <Navigation size={13} />
            <span>Drive on Safe Bypass Detour ▶</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleReset}
          className="p-1.5 text-text-3 hover:text-brand bg-surface border border-border rounded-btn"
          title="Reset Simulation"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Comparison Modal when detour is found */}
      {comparison && (status === 'rerouted' || status === 'driving_detour') && (
        <div className="pt-2 border-t border-border">
          <ReRouteComparisonCard
            comparison={comparison}
            onApply={() => {
              onApplyDetour(comparison.saferRoute, comparison.saferRisk);
              onClose();
            }}
            onDismiss={() => setComparison(null)}
          />
        </div>
      )}
    </div>
  );
};
