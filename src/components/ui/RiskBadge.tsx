import type React from 'react';
import { ShieldCheck, TriangleAlert, OctagonAlert, Siren, Ban } from 'lucide-react';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'severe' | 'blocked';

export interface RiskBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  level?: RiskLevel;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score >= 75) return 'severe';
  if (score >= 50) return 'high';
  if (score >= 25) return 'moderate';
  return 'low';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  score,
  showScore = true,
  size = 'md',
  className = '',
  ...props
}) => {
  const resolvedLevel: RiskLevel = level || (score !== undefined ? getRiskLevelFromScore(score) : 'low');

  const configs: Record<
    RiskLevel,
    { label: string; icon: React.ReactElement; bg: string; text: string; border: string }
  > = {
    low: {
      label: 'Low',
      icon: <ShieldCheck className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      bg: 'bg-risk-low-soft',
      text: 'text-risk-low',
      border: 'border-risk-low/20',
    },
    moderate: {
      label: 'Moderate',
      icon: <TriangleAlert className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      bg: 'bg-risk-moderate-soft',
      text: 'text-risk-moderate',
      border: 'border-risk-moderate/20',
    },
    high: {
      label: 'High',
      icon: <OctagonAlert className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      bg: 'bg-risk-high-soft',
      text: 'text-risk-high',
      border: 'border-risk-high/20',
    },
    severe: {
      label: 'Severe',
      icon: <Siren className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      bg: 'bg-risk-severe-soft',
      text: 'text-risk-severe',
      border: 'border-risk-severe/20',
    },
    blocked: {
      label: 'Blocked',
      icon: <Ban className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
      bg: 'bg-risk-blocked-soft',
      text: 'text-risk-blocked',
      border: 'border-risk-blocked/30',
    },
  };

  const config = configs[resolvedLevel];
  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-small px-2.5 py-1 gap-1.5',
    lg: 'text-body font-semibold px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-chip font-medium border ${config.bg} ${config.text} ${config.border} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      <span className="inline-flex shrink-0">{config.icon}</span>
      <span>
        {config.label}
        {showScore && score !== undefined && resolvedLevel !== 'blocked' ? ` ${score}` : ''}
      </span>
    </span>
  );
};
