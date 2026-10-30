import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Radio,
  Filter,
  AlertTriangle,
  Building2,
  Activity,
  Layers,
} from 'lucide-react';
import {
  fetchHazardReports,
  subscribeToHazardReports,
} from '../features/reports/reportsService';
import type { HazardReport } from '../features/reports/types';
import { useDemoStore } from '../lib/demoStore';
import { ReportModal } from '../components/reports/ReportModal';
import { ReportDetailDrawer } from '../components/reports/ReportDetailDrawer';
import { HistoricalLandslideDrawer } from '../components/map/HistoricalLandslideDrawer';
import { EarthquakeDrawer } from '../components/map/EarthquakeDrawer';
import {
  fetchHistoricalLandslides,
  fetchMapEarthquakes,
  fetchMapStays,
  HistoricalLandslideEvent,
} from '../features/map/hazardMapService';
import type { EarthquakeEvent } from '../features/quakes/types';
import type { StayCandidate } from '../features/rewards/ranking';

export const MapPage: React.FC = () => {
  const demoMode = useDemoStore((state) => state.demoMode);
  const [mapApi, setMapApi] = useState<LayerManagerAPI | null>(null);
  const [lastClickedCoords, setLastClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(9);

  // Active Layer Toggles
  const [layerVisibility, setLayerVisibility] = useState<{
    reports: boolean;
    historical: boolean;
    earthquakes: boolean;
    stays: boolean;
  }>({
    reports: true,
    historical: true,
    earthquakes: true,
    stays: true,
  });

  // Layer Data
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [historicalLandslides, setHistoricalLandslides] = useState<HistoricalLandslideEvent[]>([]);
  const [earthquakes, setEarthquakes] = useState<EarthquakeEvent[]>([]);
  const [stays, setStays] = useState<StayCandidate[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Selected Entities for Detail Drawers
  const [selectedReport, setSelectedReport] = useState<HazardReport | null>(null);
  const [selectedHistorical, setSelectedHistorical] = useState<HistoricalLandslideEvent | null>(null);
  const [selectedEarthquake, setSelectedEarthquake] = useState<EarthquakeEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Filters State
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'pending'>('all');
  const [filterTimeHours, setFilterTimeHours] = useState<number>(0); // 0 = all active

  const markersRef = useRef<MarkerHandle[]>([]);

  const handleFlyTo = (lng: number, lat: number, zoom = 10) => {
    mapApi?.flyTo([lng, lat], zoom);
  };

  // Load all map layers data
  const loadMapData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [reportsData, historicalData, quakesData, staysData] = await Promise.all([
        fetchHazardReports({
          includeTest: demoMode,
          limit: 100,
        }),
        fetchHistoricalLandslides(),
        fetchMapEarthquakes([77.1734, 31.1048]),
        fetchMapStays([77.1734, 31.1048]),
      ]);

      setReports(reportsData);
      setHistoricalLandslides(historicalData);
      setEarthquakes(quakesData);
      setStays(staysData);
    } catch {
      // Graceful fallback
    } finally {
      setIsRefreshing(false);
    }
  }, [demoMode]);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  useEffect(() => {
    if (!mapApi?.onZoom) return;
    const unsub = mapApi.onZoom((z) => setCurrentZoom(z));
    return () => unsub();
  }, [mapApi]);

  // Spatial clustering helper for smooth performance with 30+ markers
  const computeClusters = useCallback(
    <T extends { coordinates: [number, number] }>(
      items: T[],
      zoom: number,
      baseThresholdDeg = 0.35
    ): { isCluster: boolean; items: T[]; center: [number, number] }[] => {
      if (items.length <= 30 || zoom >= 12) {
        return items.map((item) => ({
          isCluster: false,
          items: [item],
          center: item.coordinates,
        }));
      }

      const currentThreshold = Math.max(0.06, baseThresholdDeg * Math.pow(2, 8.5 - zoom));
      const results: { isCluster: boolean; items: T[]; center: [number, number] }[] = [];
      const visited = new Set<number>();

      for (let i = 0; i < items.length; i++) {
        if (visited.has(i)) continue;
        visited.add(i);

        const clusterItems = [items[i]];
        let sumLng = items[i].coordinates[0];
        let sumLat = items[i].coordinates[1];

        for (let j = i + 1; j < items.length; j++) {
          if (visited.has(j)) continue;
          const dLng = Math.abs(items[i].coordinates[0] - items[j].coordinates[0]);
          const dLat = Math.abs(items[i].coordinates[1] - items[j].coordinates[1]);

          if (dLng <= currentThreshold && dLat <= currentThreshold) {
            visited.add(j);
            clusterItems.push(items[j]);
            sumLng += items[j].coordinates[0];
            sumLat += items[j].coordinates[1];
          }
        }

        const count = clusterItems.length;
        results.push({
          isCluster: count > 1,
          items: clusterItems,
          center: [sumLng / count, sumLat / count],
        });
      }

      return results;
    },
    []
  );
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

  // Filtered Reports
  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      if (filterType !== 'all' && rep.type !== filterType) return false;
      if (filterSeverity !== 'all' && String(rep.severity) !== filterSeverity) return false;
      if (filterStatus === 'verified' && rep.status !== 'verified') return false;
      if (filterStatus === 'pending' && rep.status !== 'pending') return false;

      if (filterTimeHours > 0) {
        const reportAgeHours =
          (Date.now() - new Date(rep.created_at).getTime()) / (1000 * 60 * 60);
        if (reportAgeHours > filterTimeHours) return false;
      }

      return true;
    });
  }, [reports, filterType, filterSeverity, filterStatus, filterTimeHours]);

  // Render all active layer markers on the map
  useEffect(() => {
    if (!mapApi) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Community Hazard Reports Layer
    if (layerVisibility.reports) {
      filteredReports.forEach((rep) => {
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
          shape: 'pin',
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
          onClick: () => {
            setSelectedReport(rep);
          },
        });

        markersRef.current.push(handle);
      });
    }

    // 2. Historical Landslides Layer (Hollow Triangles with Clustering - Doc 04 P10)
    if (layerVisibility.historical) {
      const clusteredHistorical = computeClusters(historicalLandslides, currentZoom, 0.4);

      clusteredHistorical.forEach((cluster) => {
        if (cluster.isCluster) {
          const handle = mapApi.addMarker({
            lngLat: cluster.center,
            shape: 'pin',
            icon: 'triangle-alert',
            color: '#D97706',
            bgSoftColor: '#FEF3C7',
            size: 32,
            popup: {
              title: `${cluster.items.length} Historical Landslides`,
              description: 'Click to zoom in and inspect individual events.',
              badge: 'Cluster',
            },
            onClick: () => {
              mapApi.flyTo(cluster.center, currentZoom + 2.5);
            },
          });
          markersRef.current.push(handle);
        } else {
          const landslide = cluster.items[0];
          const handle = mapApi.addMarker({
            lngLat: landslide.coordinates,
            shape: 'hollow-triangle',
            color: '#D97706',
            size: 26,
            popup: {
              title: 'Historical Landslide',
              description: `${landslide.location_text || 'Himalayan Event'} · ${landslide.event_date}`,
              badge: landslide.source,
            },
            onClick: () => {
              setSelectedHistorical(landslide);
            },
          });

          markersRef.current.push(handle);
        }
      });
    }

    // 3. Earthquakes Layer (Rings sized by magnitude - Doc 04 P10)
    if (layerVisibility.earthquakes) {
      earthquakes.forEach((quake) => {
        const color =
          quake.magnitude >= 6.0
            ? '#B91C1C'
            : quake.magnitude >= 5.0
              ? '#EA580C'
              : '#D97706';

        const lon = quake.coordinates[0];
        const lat = quake.coordinates[1];
        const depth = quake.coordinates[2] ?? 10;

        const handle = mapApi.addMarker({
          lngLat: [lon, lat],
          shape: 'ring',
          magnitude: quake.magnitude,
          color,
          popup: {
            title: `M ${quake.magnitude.toFixed(1)} Earthquake`,
            description: `${quake.place} · Depth: ${depth.toFixed(1)} km`,
            badge: 'USGS',
          },
          onClick: () => {
            setSelectedEarthquake(quake);
          },
        });

        markersRef.current.push(handle);
      });
    }

    // 4. Stays / Shelters Layer
    if (layerVisibility.stays) {
      stays.forEach((stay) => {
        const handle = mapApi.addMarker({
          lngLat: stay.coordinates,
          shape: 'pin',
          icon: 'hotel',
          color: '#0B3C5D',
          bgSoftColor: '#E0F2FE',
          size: 30,
          popup: {
            title: stay.name,
            description: `Safe area (Score: ${stay.riskScore}) · ${stay.city || 'Verified Shelter'}`,
            badge: stay.isSponsored ? 'Partner' : 'OSM Shelter',
          },
        });

        markersRef.current.push(handle);
      });
    }
  }, [
    mapApi,
    filteredReports,
    historicalLandslides,
    earthquakes,
    stays,
    layerVisibility,
    currentZoom,
    computeClusters,
  ]);

  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-6 flex flex-col gap-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-h2 font-bold text-brand">Hazard Map</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-chip text-[11px] font-mono font-medium bg-surface text-text-3 border border-border">
              <Radio size={10} className="text-accent animate-pulse" />
              Live Hazards Feed
            </span>
          </div>
          <p className="text-body text-text-2">
            Realtime disaster map showing community reports, historical landslide events, and USGS seismic data.
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
            Shimla
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleFlyTo(91.7362, 26.1445, 10)}
            icon={<Compass size={14} className="text-accent" />}
          >
            Guwahati
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

      {/* Layer Toggles & Filter Bar */}
      <Card className="p-3 bg-surface border-border flex flex-col gap-3">
        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-brand">
            <Layers size={14} className="text-accent" />
            <span>Map Layers:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Reports Toggle */}
            <button
              type="button"
              onClick={() =>
                setLayerVisibility((prev) => ({ ...prev, reports: !prev.reports }))
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-btn font-medium transition-all ${
                layerVisibility.reports
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-white text-text-3 border border-border'
              }`}
            >
              <AlertTriangle size={12} />
              <span>Community Reports ({filteredReports.length})</span>
            </button>

            {/* Historical Landslides Toggle */}
            <button
              type="button"
              onClick={() =>
                setLayerVisibility((prev) => ({ ...prev, historical: !prev.historical }))
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-btn font-medium transition-all ${
                layerVisibility.historical
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-white text-text-3 border border-border'
              }`}
            >
              <span>▲</span>
              <span>Historical Landslides ({historicalLandslides.length})</span>
            </button>

            {/* Earthquakes Toggle */}
            <button
              type="button"
              onClick={() =>
                setLayerVisibility((prev) => ({ ...prev, earthquakes: !prev.earthquakes }))
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-btn font-medium transition-all ${
                layerVisibility.earthquakes
                  ? 'bg-risk-high text-white shadow-xs'
                  : 'bg-white text-text-3 border border-border'
              }`}
            >
              <Activity size={12} />
              <span>Earthquakes 7d ({earthquakes.length})</span>
            </button>

            {/* Stays Toggle */}
            <button
              type="button"
              onClick={() =>
                setLayerVisibility((prev) => ({ ...prev, stays: !prev.stays }))
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-btn font-medium transition-all ${
                layerVisibility.stays
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-white text-text-3 border border-border'
              }`}
            >
              <Building2 size={12} />
              <span>Safe Stays ({stays.length})</span>
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadMapData}
            disabled={isRefreshing}
            icon={<RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />}
          >
            Sync
          </Button>
        </div>

        {/* Report Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-text-2">
          <span className="font-semibold text-text flex items-center gap-1">
            <Filter size={12} className="text-text-3" />
            Report Filters:
          </span>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2 py-1 bg-white border border-border rounded-btn text-xs font-medium text-text focus:outline-none focus:ring-1 focus:ring-brand"
            aria-label="Filter by Hazard Type"
          >
            <option value="all">All Hazard Types</option>
            <option value="landslide">Landslides</option>
            <option value="rockfall">Rockfalls</option>
            <option value="road_blocked">Road Blocked</option>
            <option value="flood">Flooding</option>
            <option value="snow">Snow / Ice</option>
            <option value="bridge_damage">Bridge Damage</option>
            <option value="all_clear">All Clear</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-2 py-1 bg-white border border-border rounded-btn text-xs font-medium text-text focus:outline-none focus:ring-1 focus:ring-brand"
            aria-label="Filter by Severity"
          >
            <option value="all">All Severities</option>
            <option value="1">Severity 1 (Minor)</option>
            <option value="2">Severity 2 (Moderate)</option>
            <option value="3">Severity 3 (Severe)</option>
          </select>

          {/* Verification Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'verified' | 'pending')}
            className="px-2 py-1 bg-white border border-border rounded-btn text-xs font-medium text-text focus:outline-none focus:ring-1 focus:ring-brand"
            aria-label="Filter by Status"
          >
            <option value="all">All Statuses</option>
            <option value="verified">Verified Only (3+ votes)</option>
            <option value="pending">Pending Review</option>
          </select>

          {/* Time Filter */}
          <select
            value={filterTimeHours}
            onChange={(e) => setFilterTimeHours(Number(e.target.value))}
            className="px-2 py-1 bg-white border border-border rounded-btn text-xs font-medium text-text focus:outline-none focus:ring-1 focus:ring-brand"
            aria-label="Filter by Time Window"
          >
            <option value="0">All Active Reports</option>
            <option value="24">Last 24 Hours</option>
            <option value="48">Last 48 Hours</option>
            <option value="72">Last 72 Hours</option>
          </select>

          {(filterType !== 'all' ||
            filterSeverity !== 'all' ||
            filterStatus !== 'all' ||
            filterTimeHours !== 0) && (
            <button
              type="button"
              onClick={() => {
                setFilterType('all');
                setFilterSeverity('all');
                setFilterStatus('all');
                setFilterTimeHours(0);
              }}
              className="text-[11px] text-accent font-semibold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Interactive Map Canvas Container */}
      <div className="w-full h-[620px] rounded-card shadow-sm border border-border overflow-hidden relative">
        <RouteXMap
          initialCenter={[77.1734, 31.1048]} // Shimla
          initialZoom={9}
          onMapReady={(api) => setMapApi(api)}
          onMapClick={(coords) => setLastClickedCoords(coords)}
          showControls={true}
          showLayerPanel={false} // Customized via our full layer panel
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

      {/* Pinned Coordinates HUD */}
      {lastClickedCoords && (
        <div className="flex items-center justify-between text-xs bg-surface p-2.5 rounded-card border border-border">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-text-2">
            <MapPin size={12} className="text-accent shrink-0" />
            <span>
              Selected Coordinate:{' '}
              <strong className="text-brand">
                {lastClickedCoords.lat.toFixed(5)}°N, {lastClickedCoords.lng.toFixed(5)}°E
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setLastClickedCoords(null)}
            className="text-[11px] text-text-3 hover:text-text"
          >
            Clear Pin
          </button>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultCoordinates={
          lastClickedCoords
            ? [lastClickedCoords.lng, lastClickedCoords.lat]
            : [77.1734, 31.1048]
        }
        onReportCreated={loadMapData}
      />

      {/* Community Report Detail Drawer with VerifyBar */}
      <ReportDetailDrawer
        report={selectedReport}
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
      />

      {/* Historical Landslide Drawer with Source Credit */}
      <HistoricalLandslideDrawer
        event={selectedHistorical}
        isOpen={Boolean(selectedHistorical)}
        onClose={() => setSelectedHistorical(null)}
      />

      {/* Earthquake Drawer with USGS Credit */}
      <EarthquakeDrawer
        event={selectedEarthquake}
        isOpen={Boolean(selectedEarthquake)}
        onClose={() => setSelectedEarthquake(null)}
      />
    </div>
  );
};
