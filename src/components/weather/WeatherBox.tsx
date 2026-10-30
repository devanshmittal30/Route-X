import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { RotateCcw, Clock } from 'lucide-react';

export interface WeatherBoxProps {
  icon: LucideIcon;
  label: string;
  value?: string | number;
  unit?: string;
  subtitle?: string;
  source?: string;
  updatedTime?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isCached?: boolean;
  cachedAgeDesc?: string;
  className?: string;
  statusBadge?: {
    text: string;
    variant?: 'low' | 'moderate' | 'high' | 'severe' | 'default';
  };
}

export const WeatherBox: React.FC<WeatherBoxProps> = ({
  icon: Icon,
  label,
  value,
  unit,
  subtitle,
  source = 'Open-Meteo',
  updatedTime,
  loading = false,
  error = null,
  onRetry,
  isCached = false,
  cachedAgeDesc,
  className = '',
  statusBadge,
}) => {
  if (loading) {
    return (
      <div className={`p-3.5 bg-surface border border-border rounded-card flex flex-col justify-between min-h-[120px] ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <div className="my-2">
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-3.5 bg-surface border border-border rounded-card flex flex-col justify-between min-h-[120px] text-text ${className}`}>
        <div className="flex items-center justify-between text-text-3">
          <span className="text-xs font-medium">{label}</span>
          <Icon size={16} />
        </div>
        <div className="my-2">
          <p className="text-xs text-text-3 font-medium">Unavailable</p>
          <p className="text-[11px] text-text-3 truncate mt-0.5" title={error}>
            {error}
          </p>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
          >
            <RotateCcw size={11} /> Retry
          </button>
        ) : (
          <span className="text-[10px] text-text-3">Offline cached</span>
        )}
      </div>
    );
  }

  const badgeStyles = {
    low: 'bg-risk-low-soft text-risk-low border-risk-low/30',
    moderate: 'bg-risk-moderate-soft text-risk-moderate border-risk-moderate/30',
    high: 'bg-risk-high-soft text-risk-high border-risk-high/30',
    severe: 'bg-risk-severe-soft text-risk-severe border-risk-severe/30',
    default: 'bg-surface-2 text-text-2 border-border',
  };

  return (
    <div
      className={`p-3.5 bg-surface border border-border rounded-card flex flex-col justify-between min-h-[120px] shadow-xs transition-shadow hover:shadow-sm ${className}`}
    >
      {/* Top Header: Label + Icon */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-medium text-text-2">{label}</span>
        <Icon size={16} className="text-brand shrink-0" />
      </div>

      {/* Center: Main Value & Unit */}
      <div className="my-1.5">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight text-text font-sans">
            {value}
          </span>
          {unit && <span className="text-xs font-semibold text-text-2">{unit}</span>}
        </div>

        {subtitle && (
          <p className="text-[11px] text-text-2 truncate font-medium mt-0.5" title={subtitle}>
            {subtitle}
          </p>
        )}

        {statusBadge && (
          <span
            className={`inline-block mt-1 px-1.5 py-0.2 text-[10px] font-semibold border rounded-chip ${
              badgeStyles[statusBadge.variant || 'default']
            }`}
          >
            {statusBadge.text}
          </span>
        )}
      </div>

      {/* Bottom Footer: Source + Timestamp / Cached Indicator */}
      <div className="flex items-center justify-between text-[10px] text-text-3 pt-1 border-t border-border/40 font-mono">
        <span className="truncate">{source}</span>
        {isCached ? (
          <span className="inline-flex items-center gap-0.5 text-text-3 bg-surface-2 px-1 py-0.2 rounded font-sans">
            <Clock size={9} /> {cachedAgeDesc || 'cached'}
          </span>
        ) : (
          updatedTime && <span>{updatedTime}</span>
        )}
      </div>
    </div>
  );
};

