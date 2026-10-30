import type React from 'react';
import { RiskBadge, getRiskLevelFromScore } from './RiskBadge';

export interface RiskMeterProps extends React.HTMLAttributes<HTMLDivElement> {
  score: number;
  showBadge?: boolean;
  label?: string;
}

export const RiskMeter: React.FC<RiskMeterProps> = ({
  score,
  showBadge = true,
  label,
  className = '',
  ...props
}) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  const level = getRiskLevelFromScore(clampedScore);

  return (
    <div className={`w-full space-y-2 ${className}`} {...props}>
      <div className="flex items-center justify-between text-small">
        <span className="font-medium text-text">{label || 'Risk Score'}</span>
        {showBadge && <RiskBadge level={level} score={clampedScore} size="sm" />}
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-2 border border-border">
        {/* Background level bands */}
        <div className="absolute inset-0 grid grid-cols-4 opacity-40">
          <div className="bg-risk-low" title="Low (0-24)" />
          <div className="bg-risk-moderate" title="Moderate (25-49)" />
          <div className="bg-risk-high" title="High (50-74)" />
          <div className="bg-risk-severe" title="Severe (75-100)" />
        </div>

        {/* Needle / indicator cursor */}
        <div
          className="absolute top-0 bottom-0 w-1.5 -ml-0.5 rounded-full bg-text shadow-sm transition-all duration-300"
          style={{ left: `${clampedScore}%` }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-text-3 font-medium px-0.5">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
};
