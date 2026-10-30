import React, { useState } from 'react';
import { AlertTriangle, AlertOctagon, Siren, Info, X, type LucideIcon } from 'lucide-react';
import type { WeatherAlert, AlertSeverity } from '../../features/weather/types';

export interface AlertsStripProps {
  alerts: WeatherAlert[];
  className?: string;
}

export const AlertsStrip: React.FC<AlertsStripProps> = ({ alerts, className = '' }) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeAlerts = alerts.filter((a) => !dismissedIds.has(a.id));

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  if (activeAlerts.length === 0) {
    return (
      <div
        className={`px-3.5 py-2.5 rounded-btn bg-surface border border-border flex items-center gap-2 text-xs text-text-2 ${className}`}
      >
        <Info size={15} className="text-accent shrink-0" />
        <span className="font-medium text-text">No active alerts from forecast data</span>
        <span className="text-[11px] text-text-3 font-mono ml-auto hidden sm:inline">IMD & USGS criteria</span>
      </div>
    );
  }

  const severityStyles: Record<
    AlertSeverity,
    { bg: string; border: string; text: string; icon: LucideIcon }
  > = {
    severe: {
      bg: 'bg-risk-severe-soft',
      border: 'border-risk-severe',
      text: 'text-risk-severe',
      icon: Siren,
    },
    high: {
      bg: 'bg-risk-high-soft',
      border: 'border-risk-high',
      text: 'text-risk-high',
      icon: AlertOctagon,
    },
    moderate: {
      bg: 'bg-risk-moderate-soft',
      border: 'border-risk-moderate',
      text: 'text-risk-moderate',
      icon: AlertTriangle,
    },
    info: {
      bg: 'bg-info-soft',
      border: 'border-info',
      text: 'text-info',
      icon: Info,
    },
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {activeAlerts.map((alert) => {
        const style = severityStyles[alert.severity] || severityStyles.info;
        const Icon = style.icon;

        return (
          <div
            key={alert.id}
            className={`flex items-start justify-between gap-3 p-3 rounded-btn border ${style.bg} ${style.border} transition-all animate-fadeIn`}
          >
            <div className="flex items-start gap-2.5">
              <Icon size={18} className={`${style.text} shrink-0 mt-0.5`} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={`text-xs font-bold ${style.text}`}>{alert.title}</h4>
                  <span className="text-[10px] font-mono text-text-3">
                    {alert.source} · {alert.timestamp}
                  </span>
                </div>
                <p className="text-xs text-text mt-0.5 leading-relaxed">{alert.description}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDismiss(alert.id)}
              className="text-text-3 hover:text-text p-1 shrink-0 transition-colors"
              aria-label="Dismiss alert"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
