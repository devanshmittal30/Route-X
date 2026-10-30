import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RouteXMap } from '../components/map/RouteXMap';
import type { LayerManagerAPI, MarkerHandle } from '../features/map/types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  Compass,
  MapPin,
  Mountain,
  Plus,
  RefreshCw,
  Layers,
  Radio,
} from 'lucide-react';
import {
  fetchHazardReports,
  subscribeToHazardReports,
} from '../features/reports/reportsService';
import type { HazardReport } from '../features/reports/types';
import { useDemoStore } from '../lib/demoStore';
import { ReportModal } from '../components/reports/ReportModal';
import { ReportDetailDrawer } from '../components/reports/ReportDetailDrawer';

export const MapPage: React.FC = () => {
  const demoMode = useDemoStore((state) => state.demoMode);
  const [mapApi, setMapApi] = useState<LayerManagerAPI | null>(null);
  const [lastClickedCoords, setLastClickedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Reports & Drawer State
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<HazardReport | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const markersRef = useRef<MarkerHandle[]>([]);

  const handleFlyTo = (lng: number, lat: number, zoom: number = 10) => {
    mapApi?.flyTo([lng, lat], zoom);
  };

  // Load real reports
  const loadReports = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchHazardReports({
        includeTest: demoMode,
        limit: 100,
      });
      setReports(data);
    } catch {
      setReports([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [demoMode]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Realtime subscription
  useEffect(() => {
    const unsub = subscribeToHazardReports(({ eventType, newReport }) => {
      if (!newReport) return;
      if (!demoMode && newReport.is_test) return;

      setReports((prev) => {
        if (eventType === 'INSERT') {
          if (prev.some((r) => r.id === newReport.id)) return prev;
          return [newReport, ...prev];
        }
        if (eventType === 'UPDATE') {
          return prev.map((r) => (r.id === newReport.id ? { ...r, ...newReport } : r));
        }
        if (eventType === 'DELETE') {
          return prev.filter((r) => r.id !== newReport.id);
        }
        return prev;
      });
    });

    return () => unsub();
  }, [demoMode]);

  // Render report markers on map
  useEffect(() => {
    if (!mapApi) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    reports.forEach((rep) => {
      const isVerified = rep.status === 'verified';
      const color = isVerified
        ? '#15803D'
        : rep.severity >= 3
          ? '#EF4444'
          : '#F97316';

      const icon =
        rep.type === 'road_blocked'
          ? 'ban'
          : rep.type === 'landslide'
            ? 'siren'
            : 'triangle-alert';

      const handle = mapApi.addMarker({
        lngLat: rep.coordinates,
        icon,
        color,
        bgSoftColor: isVerified ? '#E7F5EC' : '#FEF2F2',
        isTest: rep.is_test,
        size: 34,
        popup: {
          title: `${rep.type.replace('_', ' ').toUpperCase()} (${rep.status})`,
          description: rep.description || 'Hazard observation. Click for details.',
          badge: isVerified ? 'Verified' : 'Pending Review',
        },
      });

      markersRef.current.push(handle);
    });
  }, [mapApi, reports]);

  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-6 flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-h2 font-bold text-brand">Live Hazard Map</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-chip text-[11px] font-mono font-medium bg-surface text-text-3 border border-border">
              <Radio size={10} className="text-accent animate-pulse" />
              Live Feed ({reports.length})
            </span>
          </div>
          <p className="text-body text-text-2">
            Realtime vector map showing peer-verified hazards, landslides, and road obstructions.
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

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={14} />}
          >
            Report Hazard
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

        {/* Floating Quick Action Overlay if clicked */}
        {lastClickedCoords && (
          <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm p-3 rounded-card shadow-md border border-border flex items-center gap-3 text-xs">
            <div className="font-mono">
              <span className="text-text-3 block text-[10px]">Clicked point</span>
              <strong className="text-text">
                {lastClickedCoords.lat.toFixed(4)}°N, {lastClickedCoords.lng.toFixed(4)}°E
              </strong>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              icon={<Plus size={12} />}
              className="text-xs"
            >
              Report Hazard Here
            </Button>
          </div>
        )}
      </div>

      {/* Map Diagnostics & Testing Controls Bar */}
      <Card className="p-4 bg-surface border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-brand flex items-center gap-1.5">
            <Layers size={14} className="text-accent" />
            Layer Controls:
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadReports}
            disabled={isRefreshing}
            icon={<RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />}
          >
            Sync Live Hazards ({reports.length})
          </Button>
        </div>

        {lastClickedCoords && (
          <div className="flex items-center gap-1.5 text-text-2 bg-white px-2.5 py-1.5 rounded-btn border border-border font-mono text-[11px]">
            <MapPin size={12} className="text-accent shrink-0" />
            <span>
              Pinned:{' '}
              <strong className="text-brand">
                {lastClickedCoords.lat.toFixed(5)}, {lastClickedCoords.lng.toFixed(5)}
              </strong>
            </span>
          </div>
        )}
      </Card>

      {/* Report Modal */}
      <ReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultCoordinates={
          lastClickedCoords
            ? [lastClickedCoords.lng, lastClickedCoords.lat]
            : [77.1734, 31.1048]
        }
        onReportCreated={loadReports}
      />

      {/* Report Detail Drawer */}
      <ReportDetailDrawer
        report={selectedReport}
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
      />
    </div>
  );
};
