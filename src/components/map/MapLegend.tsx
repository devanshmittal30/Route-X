import React, { useState } from 'react';
import {
  ShieldCheck,
  TriangleAlert,
  OctagonAlert,
  Siren,
  Ban,
  ChevronDown,
  ChevronUp,
  Info,
  MapPin,
  Building2,
  type LucideIcon,
} from 'lucide-react';

interface LegendItem {
  label: string;
  range?: string;
  description: string;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}

const RISK_LEGEND_ITEMS: LegendItem[] = [
  {
    label: 'Low',
    range: '0–24',
    description: 'Safe to proceed',
    color: '#15803D',
    bgColor: '#E7F5EC',
    icon: ShieldCheck,
  },
  {
    label: 'Moderate',
    range: '25–49',
    description: 'Be careful',
    color: '#B45309',
    bgColor: '#FEF3C7',
    icon: TriangleAlert,
  },
  {
    label: 'High',
    range: '50–74',
    description: 'Avoid if possible',
    color: '#C2410C',
    bgColor: '#FFEDD5',
    icon: OctagonAlert,
  },
  {
    label: 'Severe',
    range: '75–100',
    description: 'Do not travel',
    color: '#B91C1C',
    bgColor: '#FEE2E2',
    icon: Siren,
  },
  {
    label: 'Blocked',
    range: 'Override',
    description: 'Road/trail blocked',
    color: '#111827',
    bgColor: '#E5E7EB',
    icon: Ban,
  },
];

export interface MapLegendProps {
  className?: string;
  defaultExpanded?: boolean;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  className = '',
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`bg-white/95 backdrop-blur-sm border border-border rounded-card shadow-sm transition-all duration-200 text-text ${className}`}
      aria-label="Map Risk Legend"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-text hover:bg-surface-2/60 rounded-card transition-colors select-none"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-1.5 font-semibold text-brand">
          <Info size={14} className="text-accent" />
          Risk Legend & Symbols
        </span>
        {expanded ? <ChevronDown size={14} className="text-text-3" /> : <ChevronUp size={14} className="text-text-3" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border/60 space-y-3 text-xs">
          {/* Risk Levels */}
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-text-3 uppercase tracking-wider mb-1">
              Risk Level (0–100)
            </div>
            {RISK_LEGEND_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-between gap-2 py-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: item.bgColor,
                        borderColor: item.color,
                        color: item.color,
                      }}
                    >
                      <Icon size={12} />
                    </span>
                    <span className="font-medium text-text">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-text-3 mr-1.5">{item.range}</span>
                    <span className="text-[11px] text-text-2 hidden sm:inline">{item.description}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Map Layer Marker Symbols (Doc 04 P10) */}
          <div className="pt-2 border-t border-border/60 space-y-1.5">
            <div className="text-[10px] font-semibold text-text-3 uppercase tracking-wider mb-1">
              Layer Symbols
            </div>

            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-accent-soft border border-accent flex items-center justify-center text-accent shrink-0">
                <MapPin size={11} />
              </span>
              <span className="text-text-2 text-[11px]">Community Report (Pin)</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center text-amber-600 shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[2.5]">
                  <polygon points="12 2, 22 21, 2 21" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-text-2 text-[11px]">Historical Landslide (Hollow ▲)</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center text-risk-high shrink-0">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-risk-high flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-risk-high" />
                </div>
              </span>
              <span className="text-text-2 text-[11px]">Earthquake M4.5+ (Magnitude Ring)</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sponsored-soft border border-sponsored/30 flex items-center justify-center text-sponsored shrink-0">
                <Building2 size={11} />
              </span>
              <span className="text-text-2 text-[11px]">Safe Shelter / Stay Point</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
