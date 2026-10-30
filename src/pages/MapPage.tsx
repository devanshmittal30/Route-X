import React, { useState, useRef } from 'react';
import { RouteXMap } from '../components/map/RouteXMap';
import type { LayerManagerAPI } from '../features/map/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Compass,
  MapPin,
  Mountain,
  PlusCircle,
  RotateCcw,
  Layers,
} from 'lucide-react';

export const MapPage: React.FC = () => {
  const [mapApi, setMapApi] = useState<LayerManagerAPI | null>(null);
  const [lastClickedCoords, setLastClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [markersCount, setMarkersCount] = useState<number>(0);
  const markersRef = useRef<Array<{ remove: () => void }>>([]);

  const handleFlyTo = (lng: number, lat: number, zoom: number = 10) => {
    mapApi?.flyTo([lng, lat], zoom);
  };

  const handleAddSampleMarkers = () => {
    if (!mapApi) return;

    // Clear existing sample markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Sample markers demonstrating risk colour tokens & Lucide icons from Doc 02 section 4
    const samples = [
      {
        lngLat: [77.165, 31.095] as [number, number], // Shimla NH5 Landslide
        icon: 'triangle-alert',
        color: '#C2410C', // --risk-high
        bgSoftColor: '#FFEDD5',
        popup: {
          title: 'NH5 Landslide (Shimla Bypass)',
          description: 'Both lanes partially blocked by mud and boulders. Clearing operations underway.',
          badge: 'High Risk',
        },
        isTest: true,
      },
      {
        lngLat: [77.182, 32.247] as [number, number], // Manali River Flood
        icon: 'siren',
        color: '#B91C1C', // --risk-severe
        bgSoftColor: '#FEE2E2',
        popup: {
          title: 'Beas River Water Overtopping',
          description: 'Low-lying road flooded. High-clearance vehicles only.',
          badge: 'Severe Risk',
        },
        isTest: true,
      },
      {
        lngLat: [91.7362, 26.1445] as [number, number], // Guwahati Safe Hub
        icon: 'shield-check',
        color: '#15803D', // --risk-low
        bgSoftColor: '#E7F5EC',
        popup: {
          title: 'Guwahati Transit Hub',
          description: 'Safe corridor verified. No hazard reports along access road.',
          badge: 'Low Risk',
        },
      },
    ];

    samples.forEach((sample) => {
      const handle = mapApi.addMarker(sample);
      markersRef.current.push(handle);
    });

    setMarkersCount(markersRef.current.length);
  };

  const handleClearMarkers = () => {
    mapApi?.clearMarkers();
    markersRef.current = [];
    setMarkersCount(0);
  };

  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-6 flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-h2 font-bold text-brand">Hazard Map</h1>
            <Badge variant="brand">PMTiles Vector Engine</Badge>
          </div>
          <p className="text-body text-text-2">
            Offline-capable vector basemap powered by MapLibre GL and local Protomaps extracts.
          </p>
        </div>

        {/* Quick Viewport Jump Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleFlyTo(77.1734, 31.1048, 10)}
            icon={<Mountain size={14} className="text-accent" />}
          >
            Shimla (Himalaya)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleFlyTo(91.7362, 26.1445, 10)}
            icon={<Compass size={14} className="text-accent" />}
          >
            Guwahati (Northeast)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleFlyTo(78.9629, 20.5937, 5)}
          >
            India Overview
          </Button>
        </div>
      </div>

      {/* Interactive Map Canvas Container */}
      <div className="w-full h-[620px] rounded-card shadow-sm border border-border overflow-hidden relative">
        <RouteXMap
          initialCenter={[77.1734, 31.1048]} // Shimla
          initialZoom={9}
          onMapReady={(api) => setMapApi(api)}
          onMapClick={(coords) => setLastClickedCoords(coords)}
          showControls={true}
          showLayerPanel={true}
          showLegend={true}
          className="h-full w-full"
        />
      </div>

      {/* Map Diagnostics & Testing Controls Bar */}
      <Card className="p-4 bg-surface border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-brand flex items-center gap-1.5">
            <Layers size={14} className="text-accent" />
            Layer Controls:
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddSampleMarkers}
            icon={<PlusCircle size={14} className="text-risk-low" />}
          >
            Add Sample Hazard Markers ({markersCount})
          </Button>

          {markersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearMarkers}
              icon={<RotateCcw size={14} />}
            >
              Clear Markers
            </Button>
          )}
        </div>

        {lastClickedCoords && (
          <div className="flex items-center gap-1.5 text-text-2 bg-white px-2.5 py-1.5 rounded-btn border border-border font-mono text-[11px]">
            <MapPin size={12} className="text-accent shrink-0" />
            <span>
              Clicked:{' '}
              <strong className="text-brand">
                {lastClickedCoords.lat.toFixed(5)}, {lastClickedCoords.lng.toFixed(5)}
              </strong>
            </span>
          </div>
        )}
      </Card>
    </div>
  );
};
