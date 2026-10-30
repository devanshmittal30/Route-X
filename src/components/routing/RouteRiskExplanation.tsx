import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CloudRain,
  Mountain,
  Users,
  History,
  Droplets,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Info,
  Clock,
  CheckCircle2,
  Ban,
} from 'lucide-react';
import type { RouteRiskScore, FactorBar, HazardOnRoute } from '../../features/risk/types';
import { RiskBadge, type RiskLevel as BadgeRiskLevel } from '../ui/RiskBadge';
import { TestBadge } from '../ui/StatusBadges';

export interface RouteRiskExplanationProps {
  risk: RouteRiskScore;
  className?: string;
}

const FACTOR_ICONS: Record<string, React.ReactElement> = {
  rain: <CloudRain className="w-4 h-4 text-blue-500" />,
  terrain: <Mountain className="w-4 h-4 text-amber-600" />,
  reports: <Users className="w-4 h-4 text-orange-500" />,
  history: <History className="w-4 h-4 text-indigo-500" />,
  soil: <Droplets className="w-4 h-4 text-emerald-500" />,
  seismic: <Activity className="w-4 h-4 text-red-500" />,
};

export const RouteRiskExplanation: React.FC<RouteRiskExplanationProps> = ({
  risk,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showHazardsList, setShowHazardsList] = useState<boolean>(true);

  const badgeLevel = risk.level.toLowerCase() as BadgeRiskLevel;

  return (
    <div className={`bg-white rounded-card border border-border overflow-hidden shadow-sm ${className}`}>
      {/* Header bar */}
      <div className="p-4 bg-surface border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <RiskBadge
            level={badgeLevel}
            score={risk.score}
            showScore={!risk.isBlocked}
            size="md"
          />
          <div>
            <h3 className="font-semibold text-sm text-text">Route Safety Assessment</h3>
            <p className="text-xs text-text-3 font-mono">
              Aggregated from {risk.segments.length} route segments · Updated {risk.timestamp}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-btn hover:bg-surface-2 text-text-2 transition-colors flex items-center gap-1 text-xs font-medium"
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? 'Hide breakdown' : 'Why this score?'}</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Primary Summary Callout */}
      <div className="px-4 py-3 bg-brand-soft/20 border-b border-border text-xs text-text flex items-start gap-2">
        <Info size={15} className="text-brand shrink-0 mt-0.5" />
        <span className="leading-relaxed">{risk.summary}</span>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-5 animate-fadeIn">
          {/* Factor Breakdown Bars */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-2">
                Factor Breakdown (6 Weighted Layers)
              </h4>
              <span className="text-[11px] text-text-3 font-mono">Max: {risk.maxSegmentScore} pts · Avg: {risk.meanSegmentScore} pts</span>
            </div>

            <div className="space-y-3">
              {risk.factorBars.map((bar: FactorBar) => {
                // Determine bar color by normalized value
                let barColor = 'bg-risk-low';
                if (bar.value >= 0.75) barColor = 'bg-risk-severe';
                else if (bar.value >= 0.5) barColor = 'bg-risk-high';
                else if (bar.value >= 0.25) barColor = 'bg-risk-moderate';

                return (
                  <div key={bar.id} className="p-2.5 rounded-btn bg-surface border border-border/60">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5 font-medium text-text">
                        {FACTOR_ICONS[bar.id] || <AlertTriangle className="w-4 h-4 text-text-2" />}
                        <span>{bar.name}</span>
                        <span className="text-[10px] text-text-3 font-mono font-normal">
                          ({bar.weight}% weight)
                        </span>
                      </div>
                      <div className="text-right font-mono text-xs">
                        <span className="font-semibold text-text">
                          +{bar.weightedScore.toFixed(1)}
                        </span>
                        <span className="text-text-3 text-[10px]"> pts</span>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden mb-1.5">
                      <div
                        className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                        style={{ width: `${Math.max(4, Math.round(bar.value * 100))}%` }}
                      />
                    </div>

                    {/* Metadata: source, timestamp, description */}
                    <div className="flex items-start justify-between gap-2 text-[11px] text-text-2">
                      <span className="leading-snug text-text">{bar.description}</span>
                      <div className="shrink-0 text-right text-[10px] text-text-3 font-mono">
                        <div>{bar.source}</div>
                        <div className="flex items-center justify-end gap-0.5">
                          <Clock size={9} />
                          {bar.timestamp}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hazards on Route */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-risk-high" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-2">
                  Hazards Detected Near Route ({risk.hazardsOnRoute.length})
                </h4>
              </div>

              {risk.hazardsOnRoute.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHazardsList(!showHazardsList)}
                  className="text-xs text-brand hover:underline font-medium"
                >
                  {showHazardsList ? 'Collapse list' : 'Show list'}
                </button>
              )}
            </div>

            {risk.hazardsOnRoute.length === 0 ? (
              <div className="p-3 bg-risk-low-soft text-risk-low rounded-btn text-xs flex items-center gap-2 border border-risk-low/20">
                <ShieldCheck size={15} />
                <span>No active or unverified road obstruction reports within 500 m.</span>
              </div>
            ) : showHazardsList ? (
              <div className="space-y-2">
                {risk.hazardsOnRoute.map((hazard: HazardOnRoute) => (
                  <div
                    key={hazard.id}
                    className={`p-2.5 rounded-btn border text-xs flex items-start justify-between gap-3 ${
                      hazard.type === 'road_blocked' || hazard.type === 'landslide'
                        ? 'bg-risk-severe-soft border-risk-severe/30 text-risk-severe'
                        : 'bg-risk-high-soft border-risk-high/30 text-text'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-semibold text-text">{hazard.title}</span>
                        {hazard.isTest && <TestBadge />}
                        {hazard.isVerified ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-risk-low font-semibold">
                            <CheckCircle2 size={10} />
                            Verified
                          </span>
                        ) : (
                          <span className="text-[10px] text-risk-moderate font-semibold">
                            Pending Review
                          </span>
                        )}
                      </div>
                      {hazard.description && (
                        <p className="text-text-2 text-[11px] leading-tight mb-1">
                          {hazard.description}
                        </p>
                      )}
                      <span className="text-[10px] text-text-3 font-mono">
                        Distance from route centerline: {(hazard.distanceKm * 1000).toFixed(0)} m
                      </span>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="px-1.5 py-0.5 rounded-chip text-[10px] font-mono font-medium bg-white/80 border border-border">
                        Severity {hazard.severity}/3
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Blocked warning if applicable */}
          {risk.isBlocked && (
            <div className="p-3 bg-risk-blocked-soft border border-risk-blocked/30 text-risk-blocked rounded-btn text-xs flex items-center gap-2 font-medium">
              <Ban size={16} />
              <span>
                Road Blocked override active: Verified obstruction within 150m of route line.
              </span>
            </div>
          )}

          {/* Official Disclaimer (Doc 01 section 7, Doc 03 section 14) */}
          <div className="pt-2 border-t border-border">
            <p className="text-[11px] text-text-3 italic leading-relaxed">
              <strong>Disclaimer:</strong> {risk.disclaimer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
