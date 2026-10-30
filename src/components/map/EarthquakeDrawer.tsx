import React from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import type { EarthquakeEvent } from '../../features/quakes/types';
import { Calendar, MapPin, Layers, ExternalLink, ShieldAlert } from 'lucide-react';

export interface EarthquakeDrawerProps {
  event: EarthquakeEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EarthquakeDrawer: React.FC<EarthquakeDrawerProps> = ({
  event,
  isOpen,
  onClose,
}) => {
  if (!event) return null;

  const eventTime = new Date(event.timeEpoch).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const lon = event.coordinates[0];
  const lat = event.coordinates[1];
  const depthKm = event.coordinates[2] ?? 10;

  const getMagnitudeColor = (mag: number) => {
    if (mag >= 6.0) return 'text-risk-severe bg-risk-severe/10 border-risk-severe/30';
    if (mag >= 5.0) return 'text-risk-high bg-risk-high/10 border-risk-high/30';
    return 'text-risk-moderate bg-risk-moderate/10 border-risk-moderate/30';
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Seismic Activity Details"
      position="right"
    >
      <div className="space-y-5 text-text">
        {/* Magnitude & Title Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-chip font-mono font-extrabold text-sm border ${getMagnitudeColor(
                event.magnitude
              )}`}
            >
              M {event.magnitude.toFixed(1)}
            </span>
            <span className="font-semibold text-xs text-text-2">USGS Monitored</span>
          </div>

          <span className="text-[11px] font-mono text-text-3">
            Depth: {depthKm.toFixed(1)} km
          </span>
        </div>

        {/* Place and Coordinates */}
        <div>
          <h3 className="text-h3 font-bold text-brand leading-snug">
            {event.place}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-text-2 font-mono mt-1">
            <MapPin size={13} className="text-accent shrink-0" />
            <span>
              {lat.toFixed(4)}°N, {lon.toFixed(4)}°E
            </span>
          </div>
        </div>

        {/* Core Attributes Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-surface rounded-card border border-border space-y-1">
            <div className="flex items-center gap-1.5 text-text-3 font-semibold uppercase tracking-wider text-[10px]">
              <Calendar size={12} />
              <span>Timestamp</span>
            </div>
            <div className="font-bold text-text">{eventTime}</div>
          </div>

          <div className="p-3 bg-surface rounded-card border border-border space-y-1">
            <div className="flex items-center gap-1.5 text-text-3 font-semibold uppercase tracking-wider text-[10px]">
              <Layers size={12} />
              <span>Focal Depth</span>
            </div>
            <div className="font-bold text-text">
              {depthKm <= 35 ? `${depthKm.toFixed(1)} km (Shallow)` : `${depthKm.toFixed(1)} km`}
            </div>
          </div>
        </div>

        {/* Terrain Trigger Risk Note */}
        <div className="p-3.5 bg-surface rounded-card border border-border space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-text text-[11px]">
            <ShieldAlert size={14} className="text-risk-high" />
            <span>Landslide Trigger Potential</span>
          </div>
          <p className="text-text-2 text-[11px] leading-relaxed">
            Seismic shaking above M4.5 significantly reduces mountain slope shear strength. RouteX monitors events within 150 km over the past 72 hours in the route risk engine.
          </p>
        </div>

        {/* Source Credit */}
        <div className="p-3 bg-brand-soft/50 border border-brand/20 rounded-card flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-brand text-[11px]">Source Credit</div>
            <div className="text-text-2 text-[11px]">USGS Earthquake Hazards Program</div>
          </div>
          <a
            href={`https://earthquake.usgs.gov/earthquakes/eventpage/${event.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline text-xs font-semibold"
          >
            <span>USGS Event</span>
            <ExternalLink size={12} />
          </a>
        </div>

        <Button variant="secondary" className="w-full" onClick={onClose}>
          Close Details
        </Button>
      </div>
    </Drawer>
  );
};
