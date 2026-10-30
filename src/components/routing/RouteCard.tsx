import React from 'react';
import { Car, Footprints, Clock, Check } from 'lucide-react';
import type { RouteMode, RouteOption } from '../../features/routing/types';
import { formatDistance, formatDuration } from '../../features/routing/osrmClient';

export interface RouteCardProps {
  route: RouteOption;
  mode: RouteMode;
  isSelected: boolean;
  onSelect: () => void;
  className?: string;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  mode,
  isSelected,
  onSelect,
  className = '',
}) => {
  const ModeIcon = mode === 'walk' ? Footprints : Car;

  return (
    <div
      onClick={onSelect}
      className={`p-3.5 rounded-card border transition-all cursor-pointer text-text select-none ${
        isSelected
          ? 'bg-brand-soft/40 border-brand shadow-sm ring-1 ring-brand'
          : 'bg-surface hover:bg-surface-2 border-border hover:border-border'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              isSelected ? 'bg-brand text-white' : 'bg-surface-2 text-brand border border-border'
            }`}
          >
            <ModeIcon size={14} />
          </div>
          <div>
            <h4 className="font-semibold text-xs sm:text-sm text-text leading-tight">{route.name}</h4>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-text-2 font-mono">
              <span className="font-bold text-text">{formatDistance(route.distanceMeters)}</span>
              <span>·</span>
              <span className="flex items-center gap-0.5">
                <Clock size={11} className="text-text-3" />
                {formatDuration(route.durationSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Golden Rule 2: Strictly NO fake risk numbers. Neutral Risk: pending chip until P7 */}
        <span className="px-2 py-0.5 rounded-chip text-[10px] font-mono font-medium bg-surface-2 text-text-3 border border-border">
          Risk: pending
        </span>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
        <span className="text-[11px] text-text-3 font-mono">
          {route.legs[0]?.steps.length || 0} turn steps
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`px-2.5 py-1 text-[11px] font-semibold rounded-btn transition-colors flex items-center gap-1 ${
            isSelected
              ? 'bg-brand text-white'
              : 'bg-white border border-border text-brand hover:bg-surface-2'
          }`}
        >
          {isSelected && <Check size={11} />}
          {isSelected ? 'Selected' : 'Select'}
        </button>
      </div>
    </div>
  );
};
