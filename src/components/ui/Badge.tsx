import type React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'brand' | 'info' | 'verified' | 'sponsored' | 'test' | 'disputed';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  icon,
  children,
  className = '',
  ...props
}) => {
  const variantStyles = {
    neutral: 'bg-surface-2 text-text-2 border border-border',
    brand: 'bg-brand-soft text-brand font-medium',
    info: 'bg-info-soft text-info font-medium',
    verified: 'bg-verified-soft text-verified font-medium border border-verified/20',
    sponsored: 'bg-sponsored-soft text-sponsored font-medium border border-sponsored/30',
    test: 'bg-test-soft text-test border border-border font-medium',
    disputed: 'bg-risk-moderate-soft text-risk-moderate font-medium border border-risk-moderate/30',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-chip text-small font-medium select-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
