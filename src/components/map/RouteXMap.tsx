import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AlertTriangle, MapPin, DownloadCloud } from 'lucide-react';
import type { RouteXMapProps, MapLayerItem, PmtilesFileInfo } from '../../features/map/types';
import {
  registerPmtilesProtocol,
  selectPmtilesFile,
  checkPmtilesAvailability,
  buildPmtilesMapStyle,
  buildFallbackMapStyle,
} from '../../features/map/pmtilesManager';
import { LayerManager } from '../../features/map/LayerManager';
import { MapLegend } from './MapLegend';
import { LayerPanel } from './LayerPanel';

export const RouteXMap: React.FC<RouteXMapProps> = ({
  initialCenter = [77.1734, 31.1048], // Shimla default
  initialZoom = 9,
  className = '',
  onMapClick,
  onMapReady,
  interactive = true,
  showControls = true,
  showLayerPanel = true,
  showLegend = true,
  customStyle,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const layerManagerRef = useRef<LayerManager | null>(null);
  const clickMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [activeRegion, setActiveRegion] = useState<PmtilesFileInfo>(() =>
    selectPmtilesFile(initialCenter[0], initialCenter[1], initialZoom)
  );
  const [fileMissing, setFileMissing] = useState<boolean>(false);
  const [layersList, setLayersList] = useState<MapLayerItem[]>([]);
  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Register the pmtiles:// protocol with MapLibre GL once
    registerPmtilesProtocol();

    const region = selectPmtilesFile(initialCenter[0], initialCenter[1], initialZoom);
    setActiveRegion(region);

    let isSubscribed = true;

    async function initMap() {
      // Check if the initial local PMTiles file exists
      const fileExists = await checkPmtilesAvailability(region.url);
      if (!isSubscribed) return;

      setFileMissing(!fileExists);

      const style = customStyle || (fileExists ? buildPmtilesMapStyle(region.url) : buildFallbackMapStyle());

      const map = new maplibregl.Map({
        container: containerRef.current!,
        style,
        center: initialCenter,
        zoom: initialZoom,
        interactive,
        attributionControl: false, // Customized below per requirements
      });

      mapRef.current = map;

      // Add Attribution Control with required copyright text
      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
        }),
        'bottom-right'
      );

      if (showControls) {
        // Navigation (Zoom In / Out)
        map.addControl(
          new maplibregl.NavigationControl({
            showCompass: false,
          }),
          'top-right'
        );

        // Geolocate Control
        map.addControl(
          new maplibregl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true,
            },
            trackUserLocation: true,
            showUserLocation: true,
          }),
          'top-right'
        );

        // Scale bar (Metric)
        map.addControl(
          new maplibregl.ScaleControl({
            maxWidth: 120,
            unit: 'metric',
          }),
          'bottom-left'
        );
      }

      // Initialize Layer Manager
      const layerMgr = new LayerManager(map, (updatedLayers) => {
        if (isSubscribed) setLayersList(updatedLayers);
      });
      layerManagerRef.current = layerMgr;

      map.on('load', () => {
        if (!isSubscribed) return;
        setIsMapLoaded(true);
        if (onMapReady) {
          onMapReady(layerMgr);
        }
      });

      // Viewport movement listener: Check active region and update state
      map.on('moveend', async () => {
        if (!isSubscribed) return;
        const center = map.getCenter();
        const zoom = map.getZoom();
        const currentRegion = selectPmtilesFile(center.lng, center.lat, zoom);
        setActiveRegion(currentRegion);

        const exists = await checkPmtilesAvailability(currentRegion.url);
        if (isSubscribed) {
          setFileMissing(!exists);
        }
      });

      // Map Click to set location (for route planning or report coordinates)
      map.on('click', (e) => {
        const coords = { lat: Number(e.lngLat.lat.toFixed(5)), lng: Number(e.lngLat.lng.toFixed(5)) };
        setClickedLocation(coords);

        // Update pin marker on map
        if (clickMarkerRef.current) {
          clickMarkerRef.current.setLngLat([coords.lng, coords.lat]);
        } else {
          const el = document.createElement('div');
          el.className = 'w-4 h-4 rounded-full bg-accent border-2 border-white shadow-md animate-pulse';
          clickMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([coords.lng, coords.lat])
            .addTo(map);
        }

        if (onMapClick) {
          onMapClick(coords);
        }
      });
    }

    initMap();

    return () => {
      isSubscribed = false;
      if (clickMarkerRef.current) {
        clickMarkerRef.current.remove();
        clickMarkerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initialCenter, initialZoom, interactive, showControls, customStyle, onMapClick, onMapReady]);

  const handleToggleLayer = useCallback((layerId: string, visible: boolean) => {
    layerManagerRef.current?.toggleLayer(layerId, visible);
  }, []);

  return (
    <div className={`relative w-full h-full min-h-[420px] overflow-hidden bg-surface rounded-card border border-border ${className}`}>
      {/* MapLibre Canvas Container */}
      <div ref={containerRef} className="w-full h-full min-h-[420px]" />

      {/* Missing Local PMTiles Friendly Banner */}
      {fileMissing && (
        <div className="absolute top-3 left-3 right-14 z-10 sm:max-w-md bg-white/95 backdrop-blur-sm border border-border shadow-sm rounded-btn p-2.5 text-xs text-text transition-all animate-fadeIn">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-risk-moderate shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-brand">Offline Map File Missing</p>
              <p className="text-text-2 mt-0.5">
                Local basemap <code className="bg-surface-2 px-1 py-0.5 rounded font-mono text-[11px]">{activeRegion.filename}</code> is not in <code className="bg-surface-2 px-1 py-0.5 rounded font-mono text-[11px]">public/maps/</code>.
              </p>
              <p className="text-text-3 mt-1 flex items-center gap-1 text-[11px]">
                <DownloadCloud size={12} className="text-accent" />
                Run <span className="font-mono bg-surface-2 px-1 rounded">scripts/extract-pmtiles.sh</span> to enable full offline vector tiles.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Region & Selected Coordinates HUD Badge */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-1.5 pointer-events-none">
        <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-border text-[11px] font-mono px-2 py-0.5 rounded-chip text-text-2 shadow-xs">
          Region: <strong className="text-brand font-medium">{activeRegion.name}</strong>
        </span>

        {clickedLocation && (
          <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-border text-[11px] font-mono px-2 py-0.5 rounded-chip text-brand shadow-xs">
            <MapPin size={11} className="text-accent" />
            {clickedLocation.lat.toFixed(4)}, {clickedLocation.lng.toFixed(4)}
          </span>
        )}
      </div>

      {/* Layer Panel (Top Left) */}
      {showLayerPanel && isMapLoaded && (
        <div className="absolute top-3 right-14 z-10 w-52 max-w-[calc(100%-4rem)]">
          <LayerPanel layers={layersList} onToggleLayer={handleToggleLayer} defaultExpanded={false} />
        </div>
      )}

      {/* Risk Legend (Bottom Right, above attribution) */}
      {showLegend && (
        <div className="absolute bottom-8 right-3 z-10 w-56 max-w-[calc(100%-2rem)]">
          <MapLegend defaultExpanded={false} />
        </div>
      )}
    </div>
  );
};

