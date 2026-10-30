import type React from 'react';
import { FlaskConical, Megaphone, BadgeCheck, Sparkles, ShieldAlert } from 'lucide-react';

export interface TestBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'sm' | 'md';
}

export const TestBadge: React.FC<TestBadgeProps> = ({ size = 'md', className = '', ...props }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-small px-2.5 py-0.5 gap-1.5';
  return (
    <span
      className={`inline-flex items-center rounded-chip font-medium bg-test-soft text-test border border-border select-none ${sizeClasses} ${className}`}
      title="Test data (not real hazard data)"
      {...props}
    >
      <FlaskConical className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>TEST</span>
    </span>
  );
};

export interface DemoBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'sm' | 'md';
  label?: string;
}

export const DemoBadge: React.FC<DemoBadgeProps> = ({
  size = 'md',
  label = 'DEMO',
  className = '',
  ...props
}) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-small px-2.5 py-0.5 gap-1.5';
  return (
    <span
      className={`inline-flex items-center rounded-chip font-medium bg-surface-2 text-text-2 border border-border select-none ${sizeClasses} ${className}`}
      title="Demonstration feature / test data"
      {...props}
    >
      <Sparkles className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{label}</span>
    </span>
  );
};

export interface SponsoredBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'sm' | 'md';
  label?: string;
}

export const SponsoredBadge: React.FC<SponsoredBadgeProps> = ({
  size = 'md',
  label = 'Sponsored (Demo)',
  className = '',
  ...props
}) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-small px-2.5 py-0.5 gap-1.5';
  return (
    <span
      className={`inline-flex items-center rounded-chip font-medium bg-sponsored-soft text-sponsored border border-sponsored/20 select-none ${sizeClasses} ${className}`}
      title="Sponsored (Demo) partner offer"
      {...props}
    >
      <Megaphone className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{label}</span>
    </span>
  );
};

export interface VerifiedBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count?: number;
  size?: 'sm' | 'md';
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  count,
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-small px-2.5 py-0.5 gap-1.5';
  return (
    <span
      className={`inline-flex items-center rounded-chip font-medium bg-verified-soft text-verified border border-verified/20 select-none ${sizeClasses} ${className}`}
      title={count ? `Verified by ${count} contributors` : 'Community verified'}
      {...props}
    >
      <BadgeCheck className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      <span>{count !== undefined && count > 0 ? `Verified by ${count}` : 'Verified'}</span>
    </span>
  );
};

export interface DisputedBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count?: number;
  size?: 'sm' | 'md';
}

export const DisputedBadge: React.FC<DisputedBadgeProps> = ({
  count,
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5 gap-1' : 'text-small px-2.5 py-0.5 gap-1.5';
  return (
    <span
      className={`inline-flex items-center rounded-chip font-medium bg-risk-moderate-soft text-risk-moderate border border-risk-moderate/30 select-none ${sizeClasses} ${className}`}
      title={count ? `Disputed by ${count} contributors` : 'Community disputed'}
      {...props}
    >
      <ShieldAlert className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      <span>{count !== undefined && count > 0 ? `Disputed (${count})` : 'Disputed'}</span>
    </span>
  );
};
