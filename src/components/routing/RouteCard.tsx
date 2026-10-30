import React from 'react';
import { Car, Footprints, Clock, Check, ShieldCheck, Loader2 } from 'lucide-react';
import type { RouteMode, RouteOption } from '../../features/routing/types';
import type { RouteRiskScore } from '../../features/risk/types';
import { formatDistance, formatDuration } from '../../features/routing/osrmClient';
import { RiskBadge, type RiskLevel as BadgeRiskLevel } from '../ui/RiskBadge';

export interface RouteCardProps {
  route: RouteOption;
  mode: RouteMode;
  isSelected: boolean;
  onSelect: () => void;
  risk?: RouteRiskScore;
  isScoring?: boolean;
  isRecommended?: boolean;
  className?: string;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  mode,
  isSelected,
  onSelect,
  risk,
  isScoring = false,
  isRecommended = false,
  className = '',
}) => {
  const ModeIcon = mode === 'walk' ? Footprints : Car;

  const badgeLevel = risk
    ? (risk.level.toLowerCase() as BadgeRiskLevel)
    : 'low';

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
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-semibold text-xs sm:text-sm text-text leading-tight">
                {route.name}
              </h4>
              {isRecommended && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider bg-risk-low-soft text-risk-low border border-risk-low/30 rounded-chip">
                  <ShieldCheck size={10} />
                  Recommended
                </span>
              )}
            </div>
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

        {/* Risk Badge display */}
        {isScoring ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-chip text-[10px] font-mono font-medium bg-surface-2 text-text-2 border border-border animate-pulse">
            <Loader2 size={10} className="animate-spin text-brand" />
            Scoring...
          </span>
        ) : risk ? (
          <RiskBadge
            level={badgeLevel}
            score={risk.score}
            showScore={!risk.isBlocked}
            size="sm"
          />
        ) : (
          <span className="px-2 py-0.5 rounded-chip text-[10px] font-mono font-medium bg-surface-2 text-text-3 border border-border">
            Risk: pending
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
        <span className="text-[11px] text-text-3 font-mono">
          {route.legs[0]?.steps.length || 0} turn steps
          {risk?.hazardsOnRoute && risk.hazardsOnRoute.length > 0 && (
            <span className="text-risk-high ml-1 font-semibold">
              · {risk.hazardsOnRoute.length} hazard{risk.hazardsOnRoute.length > 1 ? 's' : ''}
            </span>
          )}
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
