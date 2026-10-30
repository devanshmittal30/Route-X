import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellRing,
  MapPin,
  RefreshCw,
  Compass,
  CheckCircle2,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { LocationPicker } from '../features/location/LocationPicker';
import {
  fetchCurrentLocationAlerts,
  fetchSavedRouteAlerts,
} from '../features/alerts/alertsService';
import {
  hasNotificationPermission,
  requestNotificationPermission,
  dispatchAlertNotification,
} from '../features/alerts/notificationService';
import { getSavedRoutes } from '../features/routing/savedRoutesService';
import type { RouteXAlert, AlertSeverity } from '../features/alerts/types';
import { useDemoStore } from '../lib/demoStore';
import { useAuth } from '../features/auth/AuthContext';
import { SmsSimulationModal } from '../components/sos/SmsSimulationModal';
import type { SosDispatchResult } from '../features/sos/types';

// Default initial location: Shimla
const DEFAULT_COORDS: [number, number] = [77.1734, 31.1048];
const DEFAULT_NAME = 'Shimla, Himachal Pradesh';

export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const demoMode = useDemoStore((state) => state.demoMode);
  const { user } = useAuth();

  // Location state
  const [selectedCoords, setSelectedCoords] = useState<[number, number]>(DEFAULT_COORDS);
  const [selectedLocationName, setSelectedLocationName] = useState<string>(DEFAULT_NAME);

  // Alerts data state
  const [currentLocationAlerts, setCurrentLocationAlerts] = useState<RouteXAlert[]>([]);
  const [savedRouteAlerts, setSavedRouteAlerts] = useState<RouteXAlert[]>([]);
  const [savedRoutesCount, setSavedRoutesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Notification permission state
  const [hasPermission, setHasPermission] = useState<boolean>(hasNotificationPermission());
  const [permissionRequested, setPermissionRequested] = useState<boolean>(false);

  // SMS Simulation Modal state
  const [smsModalOpen, setSmsModalOpen] = useState<boolean>(false);
  const [smsDispatchData, setSmsDispatchData] = useState<SosDispatchResult | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'all' | 'saved_routes' | 'location'>('all');

  // Load all alerts
  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch current location alerts (weather, quakes, local reports)
      const locAlerts = await fetchCurrentLocationAlerts(
        selectedCoords,
        selectedLocationName,
        demoMode
      );
      setCurrentLocationAlerts(locAlerts);

      // 2. Fetch saved routes and their alerts if authenticated
      if (user) {
        const routes = await getSavedRoutes();
        setSavedRoutesCount(routes.length);

        if (routes.length > 0) {
          const rAlerts = await fetchSavedRouteAlerts(routes, demoMode);
          setSavedRouteAlerts(rAlerts);

          // Dispatch notifications for each newly detected alert
          for (const alert of [...locAlerts, ...rAlerts]) {
            dispatchAlertNotification(alert);
          }
        } else {
          setSavedRouteAlerts([]);
        }
      } else {
        setSavedRoutesCount(0);
        setSavedRouteAlerts([]);
        // Still notify for critical location alerts
        for (const alert of locAlerts) {
          dispatchAlertNotification(alert);
        }
      }
    } catch (err) {
      console.warn('[AlertsPage] Error loading alerts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCoords, selectedLocationName, demoMode, user]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Request notification permissions
  const handleEnableNotifications = async () => {
    setPermissionRequested(true);
    const granted = await requestNotificationPermission();
    setHasPermission(granted);
  };

  // Trigger SMS Simulation for an emergency alert
  const handleOpenSmsSimulation = (alert: RouteXAlert) => {
    const coordsStr = alert.metadata?.coordinates
      ? `${alert.metadata.coordinates[1].toFixed(4)},${alert.metadata.coordinates[0].toFixed(4)}`
      : `${selectedCoords[1].toFixed(4)},${selectedCoords[0].toFixed(4)}`;

    const dispatch: SosDispatchResult = {
      eventId: `sim-alert-${alert.id}`,
      success: true,
      message: `RouteX EMERGENCY ALERT: ${alert.title}. ${alert.description} Location: ${coordsStr} https://maps.google.com/?q=${coordsStr}. Time: ${new Date().toLocaleTimeString()}.`,
      recipients: [
        {
          id: 'contact-demo-1',
          name: 'Emergency Contact (Family)',
          phone: '+91 98765 43210',
          relation: 'Next of Kin',
        },
        {
          id: 'contact-demo-2',
          name: 'Mountain Guide / Hotel Desk',
          phone: '+91 94180 12345',
          relation: 'Local Contact',
        },
      ],
      sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isQueued: !navigator.onLine,
    };

    setSmsDispatchData(dispatch);
    setSmsModalOpen(true);
  };

  // Helper styling for severity badges
  const getSeverityBadge = (sev: AlertSeverity) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded-chip text-[11px] font-bold bg-risk-blocked text-white uppercase tracking-wider font-mono">
            Critical
          </span>
        );
      case 'severe':
        return (
          <span className="px-2 py-0.5 rounded-chip text-[11px] font-bold bg-risk-severe text-white uppercase tracking-wider font-mono">
            Severe
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-chip text-[11px] font-bold bg-risk-high text-white uppercase tracking-wider font-mono">
            High
          </span>
        );
      case 'moderate':
        return (
          <span className="px-2 py-0.5 rounded-chip text-[11px] font-bold bg-risk-moderate text-text uppercase tracking-wider font-mono">
            Moderate
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-chip text-[11px] font-bold bg-risk-low text-white uppercase tracking-wider font-mono">
            Low
          </span>
        );
    }
  };

  const allAlerts = [...savedRouteAlerts, ...currentLocationAlerts];
  const displayedAlerts =
    activeTab === 'saved_routes'
      ? savedRouteAlerts
      : activeTab === 'location'
      ? currentLocationAlerts
      : allAlerts;

  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-h2 font-bold text-brand">Disaster & Route Alerts</h1>
            <Badge variant="brand">{allAlerts.length} Active</Badge>
          </div>
          <p className="text-body text-text-2 mt-1">
            Real-time warnings, IMD heavy rain alerts, seismic tremors, and corridor hazard monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadAlerts}
            icon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
          >
            Refresh Alerts
          </Button>
        </div>
      </div>

      {/* Notification Permission Card */}
      {!hasPermission && (
        <div className="p-4 rounded-card bg-brand-soft border border-brand/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-brand text-white shrink-0 mt-0.5">
              <BellRing size={18} />
            </div>
            <div>
              <h3 className="text-body font-bold text-brand">Enable Mountain Disaster Notifications</h3>
              <p className="text-xs text-text-2 mt-0.5 max-w-2xl">
                RouteX asks for notification permissions so we can alert you immediately when verified landslides, road blocks, or extreme monsoon rainfall threaten your saved mountain corridors.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleEnableNotifications}
            className="shrink-0 text-xs"
            icon={<Bell size={14} />}
          >
            {permissionRequested ? 'Permissions Prompted' : 'Enable Notifications'}
          </Button>
        </div>
      )}

      {hasPermission && (
        <div className="px-4 py-2.5 rounded-btn bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span>
              <strong>Browser Notifications Active:</strong> You will be notified instantly when risk escalates or hazards appear near your routes.
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
            Anti-Spam Throttled
          </span>
        </div>
      )}

      {/* Location Picker & Route Filter Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center bg-surface p-4 rounded-card border border-border">
        <div className="lg:col-span-2">
          <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider block mb-1">
            Current Monitoring Location
          </span>
          <LocationPicker
            currentLocation={{
              name: selectedLocationName,
              latitude: selectedCoords[1],
              longitude: selectedCoords[0],
            }}
            onSelectLocation={(loc) => {
              setSelectedLocationName(loc.name);
              setSelectedCoords([loc.longitude, loc.latitude]);
            }}
          />
        </div>

        <div className="flex flex-col justify-end">
          <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider block mb-1">
            Filter Alert Source
          </span>
          <div className="flex items-center bg-white border border-border rounded-btn p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1 px-2 rounded-btn font-medium transition-colors ${
                activeTab === 'all' ? 'bg-brand text-white font-bold' : 'text-text-3 hover:text-text'
              }`}
            >
              All ({allAlerts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('saved_routes')}
              className={`flex-1 py-1 px-2 rounded-btn font-medium transition-colors ${
                activeTab === 'saved_routes'
                  ? 'bg-brand text-white font-bold'
                  : 'text-text-3 hover:text-text'
              }`}
            >
              Routes ({savedRouteAlerts.length}{savedRoutesCount > 0 ? ` on ${savedRoutesCount}` : ''})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('location')}
              className={`flex-1 py-1 px-2 rounded-btn font-medium transition-colors ${
                activeTab === 'location' ? 'bg-brand text-white font-bold' : 'text-text-3 hover:text-text'
              }`}
            >
              Location ({currentLocationAlerts.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Alert List */}
      <div className="space-y-4">
        {/* Saved Routes Status if Empty or Anonymous */}
        {!user && (
          <div className="p-3.5 rounded-card bg-surface-2 border border-border flex items-center justify-between text-xs text-text-2">
            <div className="flex items-center gap-2">
              <Lock size={15} className="text-text-3" />
              <span>Sign in to monitor your saved mountain routes and receive corridor blockage alerts.</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/login')}
              className="text-xs"
            >
              Sign In
            </Button>
          </div>
        )}

        {displayedAlerts.length === 0 && !isLoading ? (
          <EmptyState
            icon={CheckCircle2}
            title="All Clear · No Active Disaster Warnings"
            description={`No severe weather advisories, seismic events, or verified route blockages currently reported near ${selectedLocationName}.`}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedAlerts.map((alert) => {
              const isCritical = alert.severity === 'critical' || alert.severity === 'severe';

              return (
                <Card
                  key={alert.id}
                  className={`p-4 border transition-all ${
                    isCritical
                      ? 'border-risk-high/40 bg-risk-high-soft/10 shadow-sm'
                      : 'border-border bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(alert.severity)}
                      <span className="text-[11px] font-mono text-text-3">
                        {alert.targetType === 'saved_route' ? 'Saved Route' : 'Location'}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-text-3">{alert.timestamp}</span>
                  </div>

                  <h3 className="text-body font-bold text-brand leading-snug">{alert.title}</h3>

                  <p className="text-xs text-text-2 mt-1.5 leading-relaxed">{alert.description}</p>

                  {/* Target Label / Route name */}
                  {alert.targetLabel && (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-text-3 bg-surface p-1.5 rounded-btn border border-border">
                      <MapPin size={12} className="text-accent shrink-0" />
                      <span className="truncate">{alert.targetLabel}</span>
                    </div>
                  )}

                  {/* Source & Actions */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                    <span className="text-text-3 font-mono">Source: {alert.source}</span>

                    <div className="flex items-center gap-1.5">
                      {isCritical && (
                        <button
                          type="button"
                          onClick={() => handleOpenSmsSimulation(alert)}
                          className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium flex items-center gap-1 transition-colors"
                          title="Simulate dispatching emergency SMS for this alert"
                        >
                          <MessageSquare size={11} /> Simulate SMS
                        </button>
                      )}

                      {alert.targetType === 'saved_route' && alert.targetId && (
                        <button
                          type="button"
                          onClick={() => navigate(`/route?savedRouteId=${alert.targetId}`)}
                          className="px-2 py-1 rounded bg-surface-2 hover:bg-surface text-brand font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Compass size={11} /> Inspect Route
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* SMS Simulation Modal for Critical Alerts */}
      <SmsSimulationModal
        isOpen={smsModalOpen}
        onClose={() => setSmsModalOpen(false)}
        dispatchResult={smsDispatchData}
      />
    </div>
  );
};
