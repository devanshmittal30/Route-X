import React from 'react';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import type { HistoricalLandslideEvent } from '../../features/map/hazardMapService';
import { Calendar, TriangleAlert, MapPin, Skull, Database } from 'lucide-react';

export interface HistoricalLandslideDrawerProps {
  event: HistoricalLandslideEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export const HistoricalLandslideDrawer: React.FC<HistoricalLandslideDrawerProps> = ({
  event,
  isOpen,
  onClose,
}) => {
  if (!event) return null;

  const formattedDate = new Date(event.event_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Historical Landslide Record"
      position="right"
    >
      <div className="space-y-5 text-text">
        {/* Header Badge & Identifier */}
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <TriangleAlert size={16} />
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-800">
              Catalogue Record
            </span>
          </div>
          {event.source_event_id && (
            <span className="font-mono text-[11px] text-text-3">
              ID: {event.source_event_id}
            </span>
          )}
        </div>

        {/* Location & Title */}
        <div>
          <h3 className="text-h3 font-bold text-brand leading-snug">
            {event.location_text || 'Historical Landslide Event'}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-text-2 font-mono mt-1">
            <MapPin size={13} className="text-accent shrink-0" />
            <span>
              {event.coordinates[1].toFixed(4)}°N, {event.coordinates[0].toFixed(4)}°E
            </span>
          </div>
        </div>

        {/* Core Attributes Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-surface rounded-card border border-border space-y-1">
            <div className="flex items-center gap-1.5 text-text-3 font-semibold uppercase tracking-wider text-[10px]">
              <Calendar size={12} />
              <span>Event Date</span>
            </div>
            <div className="font-bold text-text">{formattedDate}</div>
          </div>

          <div className="p-3 bg-surface rounded-card border border-border space-y-1">
            <div className="flex items-center gap-1.5 text-text-3 font-semibold uppercase tracking-wider text-[10px]">
              <TriangleAlert size={12} />
              <span>Trigger Mechanism</span>
            </div>
            <div className="font-bold text-text capitalize">
              {event.trigger || 'Rainfall / Monsoonal precipitation'}
            </div>
          </div>

          {event.fatalities !== null && (
            <div className="p-3 bg-surface rounded-card border border-border space-y-1 col-span-2">
              <div className="flex items-center gap-1.5 text-text-3 font-semibold uppercase tracking-wider text-[10px]">
                <Skull size={12} />
                <span>Recorded Casualties</span>
              </div>
              <div className="font-bold text-text">
                {event.fatalities > 0
                  ? `${event.fatalities} reported fatalities`
                  : 'Zero direct casualties recorded'}
              </div>
            </div>
          )}
        </div>

        {/* Source Credit Box */}
        <div className="p-3.5 bg-brand-soft/50 border border-brand/20 rounded-card space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-brand text-[11px] uppercase tracking-wider">
            <Database size={13} />
            <span>Official Scientific Source Credit</span>
          </div>
          <p className="text-text-2 text-[11px] leading-relaxed">
            Data provided by <strong className="text-brand">{event.source}</strong>. Verified historical inventory utilized by the RouteX layered slope susceptibility algorithm.
          </p>
        </div>

        {/* Disclaimer Note */}
        <div className="p-3 bg-surface rounded-card border border-border text-[11px] text-text-3 leading-relaxed">
          Historical landslide catalogues reflect media-recorded and populated corridor events. Areas with no recorded history may still feature high terrain susceptibility.
        </div>

        <Button variant="secondary" className="w-full" onClick={onClose}>
          Close Details
        </Button>
      </div>
    </Drawer>
  );
};
