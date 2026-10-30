import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import type { ReRouteComparison } from '../../features/routing/rerouteService';
import { RiskBadge } from '../ui/RiskBadge';
import { formatDistance, formatDuration } from '../../features/routing/osrmClient';
import { Button } from '../ui/Button';

export interface ReRouteComparisonCardProps {
  comparison: ReRouteComparison;
  onApply: () => void;
  onDismiss: () => void;
}

export const ReRouteComparisonCard: React.FC<ReRouteComparisonCardProps> = ({
  comparison,
  onApply,
  onDismiss,
}) => {
  const {
    originalRoute,
    originalRisk,
    saferRoute,
    saferRisk,
    scoreDifference,
    distanceDifferenceMeters,
    durationDifferenceSeconds,
    hazardsAvoidedCount,
    fallbackNotice,
  } = comparison;

  const isSafer = scoreDifference < 0 || (originalRisk.isBlocked && !saferRisk.isBlocked);
  const distanceDiffKm = (distanceDifferenceMeters / 1000).toFixed(1);
  const durationDiffMin = Math.round(durationDifferenceSeconds / 60);

  return (
    <div className="bg-white border-2 border-accent/40 rounded-card p-4 shadow-md space-y-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-accent-soft flex items-center justify-center text-accent">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h3 className="text-body font-bold text-brand">Auto Re-route Comparison</h3>
            <p className="text-[11px] text-text-3 font-mono">
              Avoids 400 m danger zones via OpenRouteService
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-text-3 hover:text-text p-1 rounded-btn"
          aria-label="Close comparison"
        >
          <X size={15} />
        </button>
      </div>

      {/* Fallback Notice per Doc 03 section 7 */}
      {fallbackNotice && (
        <div className="p-3 rounded-btn bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">{fallbackNotice}</span>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Left: Original Route */}
        <div className="p-3 rounded-btn bg-surface border border-border space-y-2">
          <div className="text-[11px] font-bold text-text-3 uppercase tracking-wider">
            Current Route
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-2">Risk:</span>
            <RiskBadge
              level={(originalRisk.isBlocked ? 'blocked' : originalRisk.level.toLowerCase()) as import('../ui/RiskBadge').RiskLevel}
              score={originalRisk.score}
              size="sm"
            />
          </div>

          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-text-2">Distance:</span>
            <span className="font-semibold text-text">
              {formatDistance(originalRoute.distanceMeters)}
            </span>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-text-2">Est. Time:</span>
            <span className="font-semibold text-text">
              {formatDuration(originalRoute.durationSeconds)}
            </span>
          </div>

          <div className="pt-1 border-t border-border/60 text-[11px] text-risk-high flex items-center gap-1 font-semibold">
            <AlertTriangle size={12} className="shrink-0" />
            <span>
              {hazardsAvoidedCount > 0
                ? `${hazardsAvoidedCount} active hazard zone(s)`
                : 'High slope/weather risk'}
            </span>
          </div>
        </div>

        {/* Right: Safer Re-Route */}
        <div className="p-3 rounded-btn bg-emerald-50/60 border border-emerald-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
              Safer Alternative
            </span>
            <span className="text-[10px] bg-emerald-200/80 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">
              ORS
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-2">Risk:</span>
            <RiskBadge
              level={(saferRisk.isBlocked ? 'blocked' : saferRisk.level.toLowerCase()) as import('../ui/RiskBadge').RiskLevel}
              score={saferRisk.score}
              size="sm"
            />
          </div>

          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-text-2">Distance:</span>
            <span className="font-semibold text-text">
              {formatDistance(saferRoute.distanceMeters)}
              {distanceDifferenceMeters > 0 && (
                <span className="text-text-3 font-normal ml-1">
                  (+{distanceDiffKm} km)
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-text-2">Est. Time:</span>
            <span className="font-semibold text-text">
              {formatDuration(saferRoute.durationSeconds)}
              {durationDifferenceSeconds > 0 && (
                <span className="text-text-3 font-normal ml-1">
                  (+{durationDiffMin}m)
                </span>
              )}
            </span>
          </div>

          <div className="pt-1 border-t border-emerald-200 text-[11px] text-emerald-700 flex items-center gap-1 font-semibold">
            <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
            <span>
              {hazardsAvoidedCount > 0
                ? `Avoids ${hazardsAvoidedCount} hazard(s)`
                : 'Lower slope and hazard index'}
            </span>
          </div>
        </div>
      </div>

      {/* Differential Summary banner */}
      {isSafer && !fallbackNotice && (
        <div className="p-2.5 rounded-btn bg-accent-soft/40 border border-accent/20 text-xs text-text flex items-center gap-2">
          <ShieldCheck size={16} className="text-accent shrink-0" />
          <span>
            Risk score reduced by{' '}
            <strong className="text-accent font-mono font-bold">
              {Math.abs(scoreDifference)} points
            </strong>{' '}
            by diverting around verified blockage and unstable terrain.
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="primary"
          size="sm"
          onClick={onApply}
          className="flex-1 text-xs"
          icon={<ShieldCheck size={14} />}
        >
          Switch to Safer Route
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onDismiss}
          className="text-xs"
        >
          Keep Original
        </Button>
      </div>
    </div>
  );
};
